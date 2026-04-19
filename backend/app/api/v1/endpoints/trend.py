"""자산 트렌드 API."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.analysis.trend import get_asset_composition, get_asset_trend
from app.services.market.benchmark import get_benchmark_returns

router = APIRouter(prefix="/trend", tags=["trend"])

BucketType = Literal["daily", "weekly", "monthly"]
BUCKET_MAP = {"daily": "1 day", "weekly": "1 week", "monthly": "1 month"}


@router.get("/benchmark/returns")
async def read_benchmark(
    from_date: Annotated[date, Query(alias="from")],
    to_date: Annotated[date | None, Query(alias="to")] = None,
):
    """KOSPI / S&P500 / NASDAQ 수익률 (from_date 기준 정규화)."""
    return await get_benchmark_returns(from_date, to_date)


@router.get("/{account_id}")
async def read_trend(
    account_id: str,
    period: Annotated[BucketType, Query()] = "daily",
    limit: Annotated[int, Query(ge=1, le=365)] = 90,
    db: AsyncSession = Depends(get_db),
):
    bucket = BUCKET_MAP[period]
    return await get_asset_trend(db, account_id, bucket=bucket, limit=limit)


@router.get("/{account_id}/composition")
async def read_composition(
    account_id: str,
    as_of: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await get_asset_composition(db, account_id, as_of=as_of)
