"""세금 시뮬레이터 API."""

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.tax.calculator import AssetTypeForTax, TaxSimulationResult, simulate_tax

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tax", tags=["tax"])


class TaxSimulationRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    asset_type: AssetTypeForTax
    quantity: int = Field(..., gt=0)
    avg_cost_krw: float = Field(..., gt=0)
    current_price_krw: float = Field(..., gt=0)


class TaxSimulationResponse(BaseModel):
    symbol: str
    asset_type: str
    quantity: int
    sell_amount_krw: float
    purchase_amount_krw: float
    profit_loss_krw: float
    securities_tax_krw: float
    income_tax_krw: float
    total_tax_krw: float
    net_profit_krw: float
    effective_tax_rate_pct: float
    notes: list[str]


@router.post("/simulate", response_model=TaxSimulationResponse)
def simulate_tax_endpoint(req: TaxSimulationRequest) -> TaxSimulationResponse:
    """매도 시나리오의 예상 세금 계산.

    외부 의존성 없음 — 룰 기반 동기 계산.
    """
    result: TaxSimulationResult = simulate_tax(
        symbol=req.symbol,
        asset_type=req.asset_type,
        quantity=req.quantity,
        avg_cost_krw=req.avg_cost_krw,
        current_price_krw=req.current_price_krw,
    )

    logger.info(
        "tax_simulate symbol=%s asset_type=%s qty=%d profit=%d tax=%d",
        result.symbol, result.asset_type, result.quantity,
        result.profit_loss_krw, result.total_tax_krw,
    )

    return TaxSimulationResponse(**result.__dict__)
