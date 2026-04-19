"""일별 스냅샷 조회 및 수동 저장 API."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Date, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.account_daily_summary import AccountDailySummary
from app.models.position_snapshot import PositionSnapshot
from app.scheduler.snapshot import save_daily_snapshot

router = APIRouter(prefix="/snapshot", tags=["snapshot"])


@router.get("/summary/{account_no}")
async def get_daily_summaries(
    account_no: str,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
    limit: Annotated[int, Query(ge=1, le=365)] = 90,
    db: AsyncSession = Depends(get_db),
):
    """계좌 일별 요약 목록 조회."""
    stmt = (
        select(AccountDailySummary)
        .where(AccountDailySummary.account_no == account_no)
        .order_by(AccountDailySummary.time.desc())
    )
    if from_date:
        stmt = stmt.where(AccountDailySummary.time >= from_date)
    if to_date:
        stmt = stmt.where(AccountDailySummary.time <= to_date)
    stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "date": r.time.date().isoformat(),
            "purchase_amount_krw": float(r.purchase_amount_krw),
            "eval_amount_krw": float(r.eval_amount_krw),
            "profit_loss_krw": float(r.profit_loss_krw),
            "return_pct": float(r.return_pct),
            "cash_krw": float(r.cash_krw),
            "total_asset_krw": float(r.total_asset_krw),
            "position_count": r.position_count,
        }
        for r in rows
    ]


@router.get("/positions/{account_no}")
async def get_positions(
    account_no: str,
    target_date: Annotated[date | None, Query(alias="date")] = None,
    market: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """특정 날짜 종목별 보유 현황 조회. date 미지정 시 최신 날짜."""
    # 날짜 미지정 → 최신 스냅샷 날짜 조회
    if target_date is None:
        latest = await db.execute(
            select(PositionSnapshot.time)
            .where(PositionSnapshot.account_no == account_no)
            .order_by(PositionSnapshot.time.desc())
            .limit(1)
        )
        row = latest.scalar_one_or_none()
        if row is None:
            return []
        target_date = row.date()

    stmt = (
        select(PositionSnapshot)
        .where(
            PositionSnapshot.account_no == account_no,
            PositionSnapshot.time.cast(Date) == target_date,
        )
        .order_by(PositionSnapshot.eval_amount_krw.desc())
    )
    if market:
        stmt = stmt.where(PositionSnapshot.market == market.upper())

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "date": r.time.date().isoformat(),
            "symbol": r.symbol,
            "name": r.name,
            "market": r.market,
            "asset_type": r.asset_type.value,
            "currency": r.currency,
            "quantity": float(r.quantity),
            "available_qty": float(r.available_qty),
            "avg_cost": float(r.avg_cost),
            "current_price": float(r.current_price),
            "purchase_amount_krw": float(r.purchase_amount_krw),
            "eval_amount_krw": float(r.eval_amount_krw),
            "profit_loss_krw": float(r.profit_loss_krw),
            "return_pct": float(r.return_pct),
            "exchange_rate": float(r.exchange_rate) if r.exchange_rate else None,
            "exchange_code": r.exchange_code,
        }
        for r in rows
    ]


@router.post("/run")
async def run_snapshot_now():
    """스냅샷 즉시 실행 (수동 트리거). KIS API 설정 필요."""
    try:
        await save_daily_snapshot()
        return {"status": "ok", "message": "스냅샷 저장 완료"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
