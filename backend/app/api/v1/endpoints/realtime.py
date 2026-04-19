"""실시간 계좌 조회 API."""

import dataclasses

from fastapi import APIRouter, HTTPException

from app.schemas.portfolio import (
    DomesticBalanceResponse,
    DomesticPositionResponse,
    OverseasBalanceResponse,
    OverseasPositionResponse,
)
from app.services.kis.domestic import get_domestic_balance
from app.services.kis.overseas import get_overseas_balance

router = APIRouter(prefix="/realtime", tags=["realtime"])

OVERSEAS_EXCHANGES = ["NASD", "NYSE", "AMEX"]


@router.get("/balance/domestic", response_model=DomesticBalanceResponse)
async def read_domestic_balance():
    result = await get_domestic_balance()
    return DomesticBalanceResponse(
        purchase_amount_krw=result.purchase_amount_krw,
        eval_amount_krw=result.eval_amount_krw,
        profit_loss_krw=result.profit_loss_krw,
        return_pct=result.return_pct,
        cash_krw=result.cash_krw,
        total_asset_krw=result.total_asset_krw,
        positions=[
            DomesticPositionResponse(**dataclasses.asdict(p))
            for p in result.positions
        ],
    )


@router.get("/balance/overseas", response_model=OverseasBalanceResponse)
async def read_overseas_balance(exchange: str = "NASD"):
    if exchange not in OVERSEAS_EXCHANGES:
        raise HTTPException(
            status_code=400,
            detail=f"exchange must be one of {OVERSEAS_EXCHANGES}",
        )
    result = await get_overseas_balance(exchange)
    return OverseasBalanceResponse(
        exchange_code=result.exchange_code,
        currency=result.currency,
        positions=[
            OverseasPositionResponse(**dataclasses.asdict(p))
            for p in result.positions
        ],
    )
