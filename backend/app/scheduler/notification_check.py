"""알림 체크 스케줄러 작업."""

import logging

logger = logging.getLogger(__name__)


async def run_notification_check() -> None:
    """포트폴리오를 조회해 알림 조건을 체크하고 필요한 알림을 생성한다."""
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.broker_account import BrokerAccount
    from app.services.broker_factory import fetch_account_balance
    from app.services.kis.exchange_rate import get_usd_krw
    from app.services.notification import check_and_create_notifications

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(BrokerAccount).where(BrokerAccount.is_active == True)  # noqa: E712
        )
        accounts = result.scalars().all()

    if not accounts:
        logger.debug("알림 체크: 활성 계좌 없음 — 건너뜀")
        return

    try:
        usd_krw = await get_usd_krw()
    except Exception:
        logger.warning("알림 체크: 환율 조회 실패 — 건너뜀")
        return

    total_asset = 0.0
    all_positions = []

    for account in accounts:
        try:
            summary = await fetch_account_balance(account, usd_krw)
            total_asset += summary.eval_amount_krw + summary.cash_krw
            all_positions.extend(summary.positions)
        except Exception:
            logger.warning("알림 체크: 계좌 조회 실패 account_no=%s", account.account_no)

    if not all_positions and total_asset == 0.0:
        logger.debug("알림 체크: 포지션 없음 — 건너뜀")
        return

    async with AsyncSessionLocal() as db:
        try:
            count = await check_and_create_notifications(db, total_asset, all_positions)
            if count:
                logger.info("알림 체크 완료: %d개 알림 생성", count)
        except Exception:
            logger.exception("알림 체크: 알림 생성 실패")
