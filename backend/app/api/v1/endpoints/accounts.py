"""증권 계좌 관리 API."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.broker_account import BrokerAccount
from app.services.kis.domestic import get_domestic_balance
from app.services.kis.overseas import get_overseas_balance

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountIn(BaseModel):
    account_no: str       # XXXXXXXXXX-XX
    account_name: str = ""
    broker: str = "KIS"


class AccountOut(BaseModel):
    id: str
    broker: str
    account_no: str
    account_name: str
    is_active: bool
    is_verified: bool


@router.get("", response_model=list[AccountOut])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BrokerAccount).order_by(BrokerAccount.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=AccountOut)
async def add_account(body: AccountIn, db: AsyncSession = Depends(get_db)):
    """계좌 등록 + KIS API로 유효성 검증."""
    # 중복 확인
    dup = await db.execute(
        select(BrokerAccount).where(BrokerAccount.account_no == body.account_no)
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 등록된 계좌번호입니다.")

    # KIS API 검증
    is_verified, account_name = await _verify_account(body.account_no)

    row = BrokerAccount(
        id=str(uuid.uuid4()),
        broker=body.broker,
        account_no=body.account_no,
        account_name=body.account_name or account_name,
        is_active=True,
        is_verified=is_verified,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/{account_id}/verify", response_model=AccountOut)
async def verify_account(account_id: str, db: AsyncSession = Depends(get_db)):
    """기존 계좌 KIS API 재검증."""
    row = await _get_or_404(account_id, db)
    is_verified, account_name = await _verify_account(row.account_no)
    row.is_verified = is_verified
    if account_name and not row.account_name:
        row.account_name = account_name
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/{account_id}/toggle", response_model=AccountOut)
async def toggle_account(account_id: str, db: AsyncSession = Depends(get_db)):
    """계좌 활성/비활성 토글."""
    row = await _get_or_404(account_id, db)
    row.is_active = not row.is_active
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{account_id}", status_code=204)
async def delete_account(account_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(BrokerAccount).where(BrokerAccount.id == account_id))
    await db.commit()


# ── helpers ───────────────────────────────────────────────

async def _get_or_404(account_id: str, db: AsyncSession) -> BrokerAccount:
    row = await db.get(BrokerAccount, account_id)
    if not row:
        raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다.")
    return row


async def _verify_account(account_no: str) -> tuple[bool, str]:
    """KIS 잔고 조회로 계좌 유효성 확인. (account_no를 설정에 임시 적용)"""
    from app.core.config import settings
    original = settings.kis_account_no
    try:
        settings.kis_account_no = account_no
        data = await get_domestic_balance()
        # 잔고 조회가 성공하면 유효한 계좌
        return True, ""
    except Exception:
        return False, ""
    finally:
        settings.kis_account_no = original
