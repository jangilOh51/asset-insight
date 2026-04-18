"""일별 자산 스냅샷 저장 작업."""

import logging
from datetime import date, datetime, timezone

from sqlalchemy import delete, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.account_daily_summary import AccountDailySummary
from app.models.position_snapshot import AssetType, EXCHANGE_TO_MARKET, PositionSnapshot
from app.services.kis.domestic import DomesticSummary, get_domestic_balance
from app.services.kis.exchange_rate import get_usd_krw
from app.services.kis.overseas import OverseasSummary, get_all_overseas_balances

logger = logging.getLogger(__name__)


async def save_daily_snapshot() -> None:
    """KIS API 잔고 조회 → position_snapshot + account_daily_summary 저장."""
    if not settings.kis_account_no:
        logger.warning("KIS_ACCOUNT_NO 미설정, 스냅샷 건너뜀")
        return

    now = datetime.now(tz=timezone.utc)
    account_no = settings.kis_account_no
    logger.info("일별 스냅샷 시작 account=%s time=%s", account_no, now)

    try:
        domestic = await get_domestic_balance()
        overseas_list = await get_all_overseas_balances()
        usd_krw = await get_usd_krw()

        async with AsyncSessionLocal() as session:
            await _delete_existing(session, account_no, now.date())
            positions = await _save_positions(session, account_no, now, domestic, overseas_list, usd_krw)
            await _save_summary(session, account_no, now, domestic, overseas_list, usd_krw, len(positions))
            await session.commit()

        logger.info("스냅샷 저장 완료: %d 종목", len(positions))

    except Exception:
        logger.exception("스냅샷 저장 실패")
        raise


async def _delete_existing(session, account_no: str, target_date: date) -> None:
    """동일 날짜 기존 데이터 삭제 (재실행 대비 멱등성)."""
    await session.execute(
        delete(PositionSnapshot).where(
            PositionSnapshot.account_no == account_no,
            PositionSnapshot.time.cast("date") == target_date,
        )
    )
    await session.execute(
        delete(AccountDailySummary).where(
            AccountDailySummary.account_no == account_no,
            AccountDailySummary.time.cast("date") == target_date,
        )
    )


async def _save_positions(
    session,
    account_no: str,
    now: datetime,
    domestic: DomesticSummary,
    overseas_list: list[OverseasSummary],
    usd_krw: float,
) -> list[PositionSnapshot]:
    saved: list[PositionSnapshot] = []

    # 국내 종목
    for pos in domestic.positions:
        row = PositionSnapshot(
            time=now,
            account_no=account_no,
            symbol=pos.symbol,
            market="KR",
            asset_type=AssetType.stock_kr,
            name=pos.name,
            quantity=pos.quantity,
            available_qty=pos.available_qty,
            currency="KRW",
            avg_cost=pos.avg_cost,
            current_price=pos.current_price,
            purchase_amount_krw=pos.purchase_amount_krw,
            eval_amount_krw=pos.eval_amount_krw,
            profit_loss_krw=pos.profit_loss_krw,
            return_pct=pos.return_pct,
            exchange_rate=None,
            exchange_code=None,
        )
        session.add(row)
        saved.append(row)

    # 해외 종목
    for summary in overseas_list:
        market, asset_type = EXCHANGE_TO_MARKET.get(
            summary.exchange_code, ("US", AssetType.stock_us)
        )
        # 현재는 USD 기준만 지원, 다른 통화는 usd_krw 근사
        fx_rate = usd_krw  # TODO: 통화별 환율 확장

        for pos in summary.positions:
            row = PositionSnapshot(
                time=now,
                account_no=account_no,
                symbol=pos.symbol,
                market=market,
                asset_type=asset_type,
                name=pos.name,
                quantity=pos.quantity,
                available_qty=pos.available_qty,
                currency=pos.currency,
                avg_cost=pos.avg_cost,
                current_price=pos.current_price,
                purchase_amount_krw=round(pos.purchase_amount_foreign * fx_rate, 2),
                eval_amount_krw=round(pos.eval_amount_foreign * fx_rate, 2),
                profit_loss_krw=round(pos.profit_loss_foreign * fx_rate, 2),
                return_pct=pos.return_pct,
                exchange_rate=fx_rate,
                exchange_code=pos.exchange_code,
            )
            session.add(row)
            saved.append(row)

    return saved


async def _save_summary(
    session,
    account_no: str,
    now: datetime,
    domestic: DomesticSummary,
    overseas_list: list[OverseasSummary],
    usd_krw: float,
    position_count: int,
) -> None:
    # 해외 종목 KRW 합산
    os_purchase_krw = sum(
        pos.purchase_amount_foreign * usd_krw
        for s in overseas_list
        for pos in s.positions
    )
    os_eval_krw = sum(
        pos.eval_amount_foreign * usd_krw
        for s in overseas_list
        for pos in s.positions
    )
    os_pl_krw = sum(
        pos.profit_loss_foreign * usd_krw
        for s in overseas_list
        for pos in s.positions
    )

    total_purchase = domestic.purchase_amount_krw + os_purchase_krw
    total_eval = domestic.eval_amount_krw + os_eval_krw
    total_pl = domestic.profit_loss_krw + os_pl_krw
    return_pct = round(total_pl / total_purchase * 100, 4) if total_purchase else 0.0
    total_asset = domestic.total_asset_krw + os_eval_krw

    row = AccountDailySummary(
        time=now,
        account_no=account_no,
        purchase_amount_krw=round(total_purchase, 2),
        eval_amount_krw=round(total_eval, 2),
        profit_loss_krw=round(total_pl, 2),
        return_pct=return_pct,
        cash_krw=domestic.cash_krw,
        cash_foreign_krw=0.0,   # TODO: 외화 현금 잔고 별도 조회
        total_asset_krw=round(total_asset, 2),
        position_count=position_count,
    )
    session.add(row)
