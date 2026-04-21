"""증권 계좌 관리 API."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.broker_account import BrokerAccount

router = APIRouter(prefix="/accounts", tags=["accounts"])

SUPPORTED_BROKERS = {
    "KIS": "한국투자증권",
    "KIWOOM": "키움증권",
}


# ── 스키마 ────────────────────────────────────────────────

class AccountIn(BaseModel):
    account_no: str = Field(..., description="계좌번호 (XXXXXXXXXX-XX)")
    account_name: str = Field(default="", description="계좌 별칭")
    broker_type: str = Field(default="KIS", description="증권사: KIS | KIWOOM")
    app_key: str = Field(default="", description="증권사 API App Key")
    app_secret: str = Field(default="", description="증권사 API App Secret")
    is_mock: bool = Field(default=False, description="모의투자 여부")


class AccountUpdateIn(BaseModel):
    account_name: str | None = None
    app_key: str | None = None
    app_secret: str | None = None
    is_mock: bool | None = None
    display_order: int | None = None


class AccountOut(BaseModel):
    id: str
    broker: str
    broker_type: str
    account_no: str
    account_name: str
    is_mock: bool
    is_active: bool
    is_verified: bool
    display_order: int
    has_credentials: bool

    model_config = {"from_attributes": True}


class BrokerInfo(BaseModel):
    code: str
    name: str
    supported: bool
    guide_url: str


# ── 엔드포인트 ─────────────────────────────────────────────

@router.get("/brokers", response_model=list[BrokerInfo])
async def list_supported_brokers():
    """지원하는 증권사 목록."""
    return [
        BrokerInfo(code="KIS", name="한국투자증권", supported=True,
                   guide_url="https://apiportal.koreainvestment.com"),
        BrokerInfo(code="KIWOOM", name="키움증권", supported=True,
                   guide_url="https://openapi.kiwoom.com"),
    ]


@router.get("", response_model=list[AccountOut])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    from app.core.config import settings

    result = await db.execute(
        select(BrokerAccount).order_by(BrokerAccount.display_order, BrokerAccount.created_at)
    )
    rows = result.scalars().all()
    accounts = [_to_out(r) for r in rows]

    db_nos = {r.account_no for r in rows}

    # 환경변수 KIS 계좌 synthetic 추가
    if settings.kis_account_no and settings.kis_app_key and settings.kis_account_no not in db_nos:
        accounts.append(AccountOut(
            id="env-kis",
            broker="한국투자증권",
            broker_type="KIS",
            account_no=settings.kis_account_no,
            account_name="KIS 환경변수 계좌",
            is_mock=settings.kis_mock,
            is_active=True,
            is_verified=True,
            display_order=998,
            has_credentials=True,
        ))

    # 환경변수 키움 계좌 synthetic 추가
    if settings.kiwoom_account_no and settings.kiwoom_app_key and settings.kiwoom_account_no not in db_nos:
        accounts.append(AccountOut(
            id="env-kiwoom",
            broker="키움증권",
            broker_type="KIWOOM",
            account_no=settings.kiwoom_account_no,
            account_name="키움 환경변수 계좌",
            is_mock=settings.kiwoom_mock,
            is_active=True,
            is_verified=True,
            display_order=999,
            has_credentials=True,
        ))

    return accounts


@router.post("", response_model=AccountOut, status_code=201)
async def add_account(body: AccountIn, db: AsyncSession = Depends(get_db)):
    if body.broker_type not in SUPPORTED_BROKERS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 증권사: {body.broker_type}")

    dup = await db.execute(
        select(BrokerAccount).where(BrokerAccount.account_no == body.account_no)
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 등록된 계좌번호입니다.")

    is_verified = False
    if body.app_key and body.app_secret:
        is_verified = await _verify_account(body)

    max_result = await db.execute(select(BrokerAccount.display_order))
    orders = max_result.scalars().all()
    next_order = (max(orders) + 1) if orders else 0

    row = BrokerAccount(
        id=str(uuid.uuid4()),
        broker=SUPPORTED_BROKERS[body.broker_type],
        broker_type=body.broker_type,
        account_no=body.account_no,
        account_name=body.account_name,
        app_key=body.app_key,
        app_secret=body.app_secret,
        is_mock=body.is_mock,
        is_active=True,
        is_verified=is_verified,
        display_order=next_order,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.patch("/{account_id}", response_model=AccountOut)
async def update_account(account_id: str, body: AccountUpdateIn, db: AsyncSession = Depends(get_db)):
    row = await _get_or_404(account_id, db)
    if body.account_name is not None:
        row.account_name = body.account_name
    if body.app_key is not None:
        row.app_key = body.app_key
        row.is_verified = False
    if body.app_secret is not None:
        row.app_secret = body.app_secret
        row.is_verified = False
    if body.is_mock is not None:
        row.is_mock = body.is_mock
    if body.display_order is not None:
        row.display_order = body.display_order
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.post("/{account_id}/verify", response_model=AccountOut)
async def verify_account(account_id: str, db: AsyncSession = Depends(get_db)):
    row = await _get_or_404(account_id, db)
    if not row.app_key or not row.app_secret:
        raise HTTPException(status_code=400, detail="API 키가 설정되지 않았습니다.")
    account_in = AccountIn(
        account_no=row.account_no, broker_type=row.broker_type,
        app_key=row.app_key, app_secret=row.app_secret, is_mock=row.is_mock,
    )
    row.is_verified = await _verify_account(account_in)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.patch("/{account_id}/toggle", response_model=AccountOut)
async def toggle_account(account_id: str, db: AsyncSession = Depends(get_db)):
    row = await _get_or_404(account_id, db)
    row.is_active = not row.is_active
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.post("/{account_id}/reorder", response_model=list[AccountOut])
async def reorder_account(account_id: str, direction: str, db: AsyncSession = Depends(get_db)):
    """계좌 표시 순서를 위(up) 또는 아래(down)로 이동."""
    result = await db.execute(
        select(BrokerAccount).order_by(BrokerAccount.display_order, BrokerAccount.created_at)
    )
    rows = result.scalars().all()
    ids = [r.id for r in rows]
    if account_id not in ids:
        raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다.")
    idx = ids.index(account_id)
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if 0 <= swap_idx < len(rows):
        rows[idx].display_order, rows[swap_idx].display_order = (
            rows[swap_idx].display_order, rows[idx].display_order
        )
        await db.commit()
    result2 = await db.execute(
        select(BrokerAccount).order_by(BrokerAccount.display_order, BrokerAccount.created_at)
    )
    return [_to_out(r) for r in result2.scalars().all()]


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


def _to_out(row: BrokerAccount) -> AccountOut:
    return AccountOut(
        id=row.id, broker=row.broker, broker_type=row.broker_type,
        account_no=row.account_no, account_name=row.account_name,
        is_mock=row.is_mock, is_active=row.is_active, is_verified=row.is_verified,
        display_order=row.display_order,
        has_credentials=bool(row.app_key and row.app_secret),
    )


async def _verify_account(body: AccountIn) -> bool:
    try:
        if body.broker_type == "KIS":
            return await _verify_kis(body)
        elif body.broker_type == "KIWOOM":
            return await _verify_kiwoom(body)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("계좌 검증 실패: %s", exc)
    return False


async def _verify_kis(body: AccountIn) -> bool:
    from app.core.config import settings
    from app.services.kis.domestic import get_domestic_balance
    orig = (settings.kis_app_key, settings.kis_app_secret, settings.kis_account_no, settings.kis_mock)
    try:
        settings.kis_app_key = body.app_key
        settings.kis_app_secret = body.app_secret
        settings.kis_account_no = body.account_no
        settings.kis_mock = body.is_mock
        await get_domestic_balance()
        return True
    except Exception:
        return False
    finally:
        settings.kis_app_key, settings.kis_app_secret, settings.kis_account_no, settings.kis_mock = orig


async def _verify_kiwoom(body: AccountIn) -> bool:
    from app.services.kiwoom.client import KiwoomClient
    from app.services.kiwoom.balance import get_kiwoom_balance
    client = KiwoomClient(app_key=body.app_key, app_secret=body.app_secret, is_mock=body.is_mock)
    try:
        summary = await get_kiwoom_balance(client, body.account_no)
        return summary.total_asset_krw >= 0
    except Exception:
        return False
    finally:
        await client.close()
