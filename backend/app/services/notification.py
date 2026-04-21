"""알림 생성 서비스 — 목표 달성, 이상 수익/손실 조건 체크."""

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.models.investment_goal import InvestmentGoal
from app.models.notification import Notification

logger = logging.getLogger(__name__)

_MILESTONE_THRESHOLDS = [50, 75, 90]


def _redis_key(type_: str, target: str) -> str:
    return f"notif_sent:{type_}:{target}:{date.today().isoformat()}"


async def _already_sent(redis, type_: str, target: str) -> bool:
    return await redis.exists(_redis_key(type_, target)) > 0


async def _mark_sent(redis, type_: str, target: str) -> None:
    await redis.setex(_redis_key(type_, target), 86400, "1")


async def _save(db: AsyncSession, type_: str, title: str, message: str) -> None:
    db.add(Notification(type=type_, title=title, message=message))
    await db.commit()


async def check_and_create_notifications(
    db: AsyncSession,
    total_asset_krw: float,
    positions: list,
) -> int:
    """포트폴리오 상태를 분석해 필요한 알림을 생성한다. 생성된 알림 수를 반환한다."""
    redis = await get_redis()
    created = 0

    # ── 투자 목표 체크 ────────────────────────────────────────────────────────
    result = await db.execute(
        select(InvestmentGoal).where(InvestmentGoal.is_active == True).limit(1)  # noqa: E712
    )
    goal = result.scalars().first()

    if goal and goal.target_amount_krw > 0:
        progress = total_asset_krw / float(goal.target_amount_krw) * 100

        # 목표 달성
        if progress >= 100:
            key = f"goal_achieved:{goal.id}"
            if not await _already_sent(redis, "goal_achieved", key):
                await _save(
                    db,
                    "goal_achieved",
                    f"목표 달성! {goal.name}",
                    f"총 자산 {total_asset_krw:,.0f}원이 목표({float(goal.target_amount_krw):,.0f}원)에 도달했습니다.",
                )
                await _mark_sent(redis, "goal_achieved", key)
                created += 1
                logger.info("알림 생성: goal_achieved (goal_id=%d)", goal.id)
        else:
            # 마일스톤 체크
            for milestone in _MILESTONE_THRESHOLDS:
                if progress >= milestone:
                    key = f"goal_milestone:{goal.id}:{milestone}"
                    if not await _already_sent(redis, "goal_milestone", key):
                        await _save(
                            db,
                            "goal_milestone",
                            f"목표 {milestone}% 달성 — {goal.name}",
                            f"현재 자산 {total_asset_krw:,.0f}원 (목표 대비 {progress:.1f}%)",
                        )
                        await _mark_sent(redis, "goal_milestone", key)
                        created += 1
                        logger.info("알림 생성: goal_milestone %d%% (goal_id=%d)", milestone, goal.id)

    # ── 종목별 이상 수익/손실 체크 ────────────────────────────────────────────
    for pos in positions:
        symbol = getattr(pos, "symbol", None)
        name = getattr(pos, "name", symbol)
        return_pct = getattr(pos, "return_pct", 0.0)

        if return_pct is None:
            continue

        if return_pct >= settings.notif_high_return_pct:
            key = f"high_return:{symbol}"
            if not await _already_sent(redis, "high_return", key):
                await _save(
                    db,
                    "high_return",
                    f"이상 수익률 — {name}",
                    f"{name}({symbol}) 수익률 +{return_pct:.1f}%로 기준({settings.notif_high_return_pct:.0f}%)을 초과했습니다.",
                )
                await _mark_sent(redis, "high_return", key)
                created += 1
                logger.info("알림 생성: high_return symbol=%s (%.1f%%)", symbol, return_pct)

        elif return_pct <= settings.notif_high_loss_pct:
            key = f"high_loss:{symbol}"
            if not await _already_sent(redis, "high_loss", key):
                await _save(
                    db,
                    "high_loss",
                    f"이상 손실률 — {name}",
                    f"{name}({symbol}) 수익률 {return_pct:.1f}%로 기준({settings.notif_high_loss_pct:.0f}%) 이하입니다.",
                )
                await _mark_sent(redis, "high_loss", key)
                created += 1
                logger.info("알림 생성: high_loss symbol=%s (%.1f%%)", symbol, return_pct)

    return created
