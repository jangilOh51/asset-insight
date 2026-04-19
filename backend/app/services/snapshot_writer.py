"""실시간 조회 결과를 DB에 저장하는 공통 서비스.

realtime endpoint의 BackgroundTask와 APScheduler 양쪽에서 호출된다.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import Date as SADate
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.account_daily_summary import AccountDailySummary
from app.models.position_snapshot import AssetType, EXCHANGE_TO_MARKET, PositionSnapshot
from app.services.broker_factory import UnifiedSummary

logger = logging.getLogger(__name__)

THROTTLE_TTL = 600  # 10분 — 실시간 엔드포인트 저장 최소 간격

_MARKET_TO_ASSET: dict[str, AssetType] = {
    "KR": AssetType.stock_kr,
    "US": AssetType.stock_us,
    "HK": AssetType.stock_hk,
    "CN": AssetType.stock_cn,
    "JP": AssetType.stock_jp,
}


async def should_throttle(account_no: str) -> bool:
    """10분 이내 저장이 있으면 True 반환. Redis 연결 실패 시 False(항상 저장)."""
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        return bool(await redis.exists(f"snapshot:throttle:{account_no}"))
    except Exception:
        return False


async def _set_throttle(account_no: str) -> None:
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        await redis.setex(f"snapshot:throttle:{account_no}", THROTTLE_TTL, "1")
    except Exception:
        pass


async def write_snapshot(
    account_no: str,
    summary: UnifiedSummary,
    usd_krw: float,
    now: datetime | None = None,
    force: bool = False,
) -> bool:
    """
    UnifiedSummary를 AccountDailySummary + PositionSnapshot으로 DB에 저장.

    Args:
        account_no: 계좌번호
        summary:    fetch_account_balance()가 반환한 통합 잔고
        usd_krw:    USD/KRW 환율
        now:        저장 기준 시각 (None이면 UTC now)
        force:      True면 쓰로틀 무시 (스케줄러 전용)

    Returns:
        저장 완료 시 True, 스킵(쓰로틀) 시 False
    """
    if not force and await should_throttle(account_no):
        logger.debug("스냅샷 저장 스킵 (쓰로틀): %s", account_no)
        return False

    if now is None:
        now = datetime.now(tz=timezone.utc)

    try:
        async with AsyncSessionLocal() as session:
            await _delete_today(session, account_no, now)
            await _write_positions(session, account_no, now, summary, usd_krw)
            await _write_summary(session, account_no, now, summary)
            await session.commit()

        if not force:
            await _set_throttle(account_no)

        logger.info("스냅샷 저장 완료: %s (%d종목)", account_no, len(summary.positions))
        return True

    except Exception:
        logger.exception("스냅샷 저장 실패: %s", account_no)
        return False


async def _delete_today(session: AsyncSession, account_no: str, now: datetime) -> None:
    """동일 날짜 기존 레코드 삭제 (멱등성)."""
    today = now.date()
    await session.execute(
        delete(PositionSnapshot).where(
            PositionSnapshot.account_no == account_no,
            PositionSnapshot.time.cast(SADate) == today,
        )
    )
    await session.execute(
        delete(AccountDailySummary).where(
            AccountDailySummary.account_no == account_no,
            AccountDailySummary.time.cast(SADate) == today,
        )
    )


async def _write_positions(
    session: AsyncSession,
    account_no: str,
    now: datetime,
    summary: UnifiedSummary,
    usd_krw: float,
) -> None:
    exchange_map = {v[0]: k for k, v in EXCHANGE_TO_MARKET.items()}  # market → exchange_code 샘플

    for pos in summary.positions:
        market_key = pos.market  # "KR", "US", "HK", ...
        asset_type = _MARKET_TO_ASSET.get(market_key, AssetType.other)
        exchange_rate = None if pos.currency == "KRW" else usd_krw

        row = PositionSnapshot(
            time=now,
            account_no=account_no,
            symbol=pos.symbol,
            market=pos.market,
            asset_type=asset_type,
            name=pos.name,
            quantity=pos.quantity,
            available_qty=pos.quantity,        # UnifiedPosition에 별도 필드 없어 동일 값 사용
            currency=pos.currency,
            avg_cost=pos.avg_cost_native,
            current_price=pos.current_price_native,
            purchase_amount_krw=pos.purchase_amount_krw,
            eval_amount_krw=pos.eval_amount_krw,
            profit_loss_krw=pos.profit_loss_krw,
            return_pct=pos.return_pct,
            exchange_rate=exchange_rate,
            exchange_code=pos.exchange if pos.currency != "KRW" else None,
        )
        session.add(row)


async def _write_summary(
    session: AsyncSession,
    account_no: str,
    now: datetime,
    summary: UnifiedSummary,
) -> None:
    row = AccountDailySummary(
        time=now,
        account_no=account_no,
        purchase_amount_krw=round(summary.purchase_amount_krw, 2),
        eval_amount_krw=round(summary.eval_amount_krw, 2),
        profit_loss_krw=round(summary.profit_loss_krw, 2),
        return_pct=summary.return_pct,
        cash_krw=round(summary.cash_krw, 2),
        cash_foreign_krw=0.0,
        total_asset_krw=round(summary.total_asset_krw, 2),
        position_count=len(summary.positions),
    )
    session.add(row)
