"""알림 API."""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])

_MAX_NOTIFICATIONS = 50


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    unread_count: int


@router.get("", response_model=NotificationListResponse)
async def list_notifications(db: AsyncSession = Depends(get_db)):
    """최근 알림 최대 50개. 미읽음 우선, 최신순 정렬."""
    result = await db.execute(
        select(Notification)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(_MAX_NOTIFICATIONS)
    )
    items = result.scalars().all()

    unread = sum(1 for n in items if not n.is_read)
    return NotificationListResponse(
        items=[NotificationOut.model_validate(n) for n in items],
        unread_count=unread,
    )


@router.get("/unread-count")
async def get_unread_count(db: AsyncSession = Depends(get_db)):
    """미읽음 알림 수만 반환 (폴링 경량 엔드포인트)."""
    result = await db.execute(
        select(Notification).where(Notification.is_read == False)  # noqa: E712
    )
    count = len(result.scalars().all())
    return {"unread_count": count}


@router.post("/read-all", status_code=204)
async def mark_all_read(db: AsyncSession = Depends(get_db)):
    """미읽음 알림 전체 읽음 처리."""
    await db.execute(
        update(Notification)
        .where(Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    await db.commit()


@router.delete("", status_code=204)
async def delete_all_notifications(db: AsyncSession = Depends(get_db)):
    """알림 전체 삭제."""
    await db.execute(delete(Notification))
    await db.commit()
