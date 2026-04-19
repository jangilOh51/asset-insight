"""포트폴리오 API 응답 스키마."""

from typing import Literal

from pydantic import BaseModel


class HoldingItem(BaseModel):
    symbol: str
    name: str
    market: Literal["KR", "US"]
    exchange: str                    # "KR" | "NASD" | "NYSE" | "AMEX"
    currency: Literal["KRW", "USD"]
    quantity: float
    avg_cost: float                  # 매입평균가 (원화)
    current_price: float             # 현재가 (원화)
    avg_cost_native: float           # 매입평균가 (원화=KRW, 외화=USD)
    current_price_native: float      # 현재가 (원화=KRW, 외화=USD)
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float
    weight_pct: float


class PortfolioSummary(BaseModel):
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float
    cash_krw: float
    total_asset_krw: float


class PortfolioRealtimeResponse(BaseModel):
    summary: PortfolioSummary
    holdings: list[HoldingItem]
    usd_krw: float
    fetched_at: str


# ── 기존 realtime 엔드포인트용 ──────────────────────────────

class DomesticPositionResponse(BaseModel):
    symbol: str
    name: str
    quantity: float
    available_qty: float
    avg_cost: float
    current_price: float
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float


class DomesticBalanceResponse(BaseModel):
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float
    cash_krw: float
    total_asset_krw: float
    positions: list[DomesticPositionResponse]


class OverseasPositionResponse(BaseModel):
    symbol: str
    name: str
    exchange_code: str
    currency: str
    quantity: float
    available_qty: float
    avg_cost: float
    current_price: float
    purchase_amount_foreign: float
    eval_amount_foreign: float
    profit_loss_foreign: float
    return_pct: float


class OverseasBalanceResponse(BaseModel):
    exchange_code: str
    currency: str
    positions: list[OverseasPositionResponse]
