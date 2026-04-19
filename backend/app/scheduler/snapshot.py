"""일별 자산 스냅샷 저장 작업."""

import logging
from datetime import datetime, timezone

from app.services.snapshot_writer import write_snapshot

logger = logging.getLogger(__name__)


async def save_daily_snapshot() -> None:
    """DB에 등록된 모든 활성 계좌를 순회하며 스냅샷 저장 (스케줄러 전용)."""
    from app.core.database import AsyncSessionLocal
    from app.models.broker_account import BrokerAccount
    from app.services.broker_factory import fetch_account_balance
    from app.services.kis.exchange_rate import get_usd_krw
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BrokerAccount).where(BrokerAccount.is_active == True)  # noqa: E712
        )
        accounts = result.scalars().all()

    if not accounts:
        logger.warning("등록된 활성 계좌 없음 — 스냅샷 건너뜀")
        return

    now = datetime.now(tz=timezone.utc)
    usd_krw = await get_usd_krw()
    logger.info("일별 스냅샷 시작: %d개 계좌", len(accounts))

    for account in accounts:
        try:
            summary = await fetch_account_balance(account, usd_krw)
            saved = await write_snapshot(
                account_no=account.account_no,
                summary=summary,
                usd_krw=usd_krw,
                now=now,
                force=True,  # 스케줄러는 쓰로틀 무시
            )
            if saved:
                logger.info("스케줄러 스냅샷 완료: %s", account.account_no)
        except Exception:
            logger.exception("스케줄러 스냅샷 실패: %s", account.account_no)
