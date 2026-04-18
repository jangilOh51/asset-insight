"""실시간 계좌 조회 API."""

from fastapi import APIRouter

from app.services.kis.domestic import get_domestic_balance
from app.services.kis.overseas import get_overseas_balance

router = APIRouter(prefix="/realtime", tags=["realtime"])

OVERSEAS_EXCHANGES = ["NASD", "NYSE", "AMEX"]


@router.get("/balance/domestic")
async def read_domestic_balance():
    return await get_domestic_balance()


@router.get("/balance/overseas")
async def read_overseas_balance(exchange: str = "NASD"):
    if exchange not in OVERSEAS_EXCHANGES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"exchange must be one of {OVERSEAS_EXCHANGES}")
    return await get_overseas_balance(exchange)
