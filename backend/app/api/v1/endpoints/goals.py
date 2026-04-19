"""투자 목표 API."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.investment_goal import InvestmentGoal
from app.schemas.goal import GoalOut, GoalUpsert

router = APIRouter(prefix="/goals", tags=["goals"])


async def _get_active(db: AsyncSession) -> InvestmentGoal | None:
    result = await db.execute(
        select(InvestmentGoal).where(InvestmentGoal.is_active == True).limit(1)
    )
    return result.scalars().first()


@router.get("/active", response_model=GoalOut | None)
async def get_active_goal(db: AsyncSession = Depends(get_db)):
    """현재 활성 목표 반환. 없으면 null."""
    return await _get_active(db)


@router.put("/active", response_model=GoalOut)
async def upsert_active_goal(body: GoalUpsert, db: AsyncSession = Depends(get_db)):
    """목표 생성 또는 교체. 기존 활성 목표를 비활성화하고 새 목표를 저장한다."""
    existing = await _get_active(db)
    if existing:
        existing.is_active = False

    goal = InvestmentGoal(
        name=body.name,
        target_amount_krw=body.target_amount_krw,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/active", status_code=204)
async def delete_active_goal(db: AsyncSession = Depends(get_db)):
    """현재 활성 목표 삭제."""
    goal = await _get_active(db)
    if not goal:
        raise HTTPException(404, "활성 목표가 없습니다")
    await db.delete(goal)
    await db.commit()
