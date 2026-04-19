"""시황 API."""

from fastapi import APIRouter

from app.services.market.indices import get_market_indices

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/indices")
async def read_market_indices():
    """주요 지수(KOSPI / S&P 500 / NASDAQ / USD/KRW) 현재가 + 등락률."""
    return await get_market_indices()
