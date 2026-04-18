"""매일 자산 스냅샷 저장 작업."""

import logging
from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.models.asset_snapshot import AssetSnapshot, AssetType
from app.services.kis.domestic import get_domestic_balance
from app.services.kis.overseas import get_overseas_balance

logger = logging.getLogger(__name__)


async def save_daily_snapshot() -> None:
    """KIS API에서 잔고 조회 후 DB에 스냅샷 저장."""
    now = datetime.now(tz=timezone.utc)
    logger.info("일별 자산 스냅샷 저장 시작: %s", now)

    try:
        domestic = await get_domestic_balance()
        overseas_us = await get_overseas_balance("NASD")
        # TODO: 환율 조회 후 KRW 환산
        await _persist_domestic(domestic, now)
        await _persist_overseas(overseas_us, now, exchange="NASD")
        logger.info("스냅샷 저장 완료")
    except Exception:
        logger.exception("스냅샷 저장 실패")


async def _persist_domestic(data: dict, snapshot_time: datetime) -> None:
    output1 = data.get("output1", [])
    async with AsyncSessionLocal() as session:
        for item in output1:
            snapshot = AssetSnapshot(
                time=snapshot_time,
                account_id=item.get("acnt_no", ""),
                symbol=item.get("pdno", ""),
                asset_type=AssetType.stock_kr,
                name=item.get("prdt_name", ""),
                quantity=float(item.get("hldg_qty", 0)),
                avg_price_krw=float(item.get("pchs_avg_pric", 0)),
                current_price_krw=float(item.get("prpr", 0)),
                value_krw=float(item.get("evlu_amt", 0)),
                profit_loss_krw=float(item.get("evlu_pfls_amt", 0)),
                return_pct=float(item.get("evlu_pfls_rt", 0)),
            )
            session.add(snapshot)
        await session.commit()


async def _persist_overseas(data: dict, snapshot_time: datetime, exchange: str) -> None:
    output1 = data.get("output1", [])
    async with AsyncSessionLocal() as session:
        for item in output1:
            snapshot = AssetSnapshot(
                time=snapshot_time,
                account_id=item.get("acnt_no", ""),
                symbol=item.get("ovrs_pdno", ""),
                asset_type=AssetType.stock_us,
                name=item.get("ovrs_item_name", ""),
                quantity=float(item.get("ovrs_cblc_qty", 0)),
                avg_price_krw=float(item.get("pchs_avg_pric", 0)),
                current_price_krw=float(item.get("now_pric2", 0)),
                value_krw=float(item.get("evlu_amt", 0)),
                profit_loss_krw=float(item.get("evlu_pfls_amt", 0)),
                return_pct=float(item.get("evlu_pfls_rt", 0)),
            )
            session.add(snapshot)
        await session.commit()
