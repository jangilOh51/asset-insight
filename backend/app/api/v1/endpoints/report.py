"""AI 리포트 API — 월간 리포트 + 투자 전략서."""

import asyncio
import hashlib
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.models.broker_account import BrokerAccount
from app.schemas.portfolio import HoldingItem, PortfolioSummary
from app.services.analysis.report import (
    RiskLevel,
    generate_monthly_report,
    generate_stock_report,
    generate_strategy_report,
)
from app.services.broker_factory import UnifiedSummary, fetch_account_balance
from app.services.kis.exchange_rate import get_usd_krw

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/report", tags=["report"])

_MONTHLY_TTL = 3600   # 1시간
_STRATEGY_TTL = 7200  # 2시간


# ── 공통 헬퍼 ────────────────────────────────────────────────────────────────

def _summaries_to_holdings(summaries: list[UnifiedSummary]) -> tuple[list[HoldingItem], PortfolioSummary]:
    total_purchase = total_eval = total_pnl = total_cash = 0.0
    all_positions = []

    for s in summaries:
        all_positions.extend(s.positions)
        total_purchase += s.purchase_amount_krw
        total_eval += s.eval_amount_krw
        total_pnl += s.profit_loss_krw
        total_cash += s.cash_krw

    total_asset = total_eval + total_cash
    return_pct = (total_pnl / total_purchase * 100) if total_purchase else 0.0

    holdings = [
        HoldingItem(
            symbol=p.symbol, name=p.name, market=p.market, exchange=p.exchange,
            currency=p.currency, quantity=p.quantity,
            avg_cost=p.avg_cost, current_price=p.current_price,
            avg_cost_native=p.avg_cost_native, current_price_native=p.current_price_native,
            purchase_amount_krw=p.purchase_amount_krw, eval_amount_krw=p.eval_amount_krw,
            profit_loss_krw=p.profit_loss_krw, return_pct=p.return_pct,
            day_change_pct=p.day_change_pct,
            weight_pct=round(p.eval_amount_krw / total_eval * 100, 2) if total_eval else 0.0,
        )
        for p in all_positions
    ]

    summary = PortfolioSummary(
        purchase_amount_krw=round(total_purchase),
        eval_amount_krw=round(total_eval),
        profit_loss_krw=round(total_pnl),
        return_pct=round(return_pct, 4),
        cash_krw=round(total_cash),
        total_asset_krw=round(total_asset),
        custom_asset_krw=0,
    )
    return holdings, summary


async def _fetch_portfolio(db: AsyncSession) -> tuple[list[HoldingItem], PortfolioSummary]:
    usd_krw = await get_usd_krw()
    stmt = select(BrokerAccount).where(BrokerAccount.is_active == True)
    result = await db.execute(stmt.order_by(BrokerAccount.display_order))
    accounts = result.scalars().all()

    if not accounts:
        raise HTTPException(status_code=422, detail="활성 계좌가 없습니다. 계좌를 먼저 등록해주세요.")

    summaries: list[UnifiedSummary] = await asyncio.gather(
        *[fetch_account_balance(acc, usd_krw) for acc in accounts]
    )
    return _summaries_to_holdings(summaries)


def _portfolio_hash(holdings: list[HoldingItem]) -> str:
    key = "|".join(f"{h.symbol}:{h.weight_pct:.1f}" for h in sorted(holdings, key=lambda x: x.symbol))
    return hashlib.md5(key.encode()).hexdigest()[:8]


# ── 월간 리포트 ───────────────────────────────────────────────────────────────

class MonthlyReportRequest(BaseModel):
    year: int = Field(default_factory=lambda: date.today().year, ge=2020, le=2100)
    month: int = Field(default_factory=lambda: date.today().month, ge=1, le=12)


class MonthlyReportResponse(BaseModel):
    year: int
    month: int
    content: str
    cached: bool


@router.post("/monthly", response_model=MonthlyReportResponse)
async def create_monthly_report(
    req: MonthlyReportRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI 월간 투자 리포트 생성. 동일 연월 요청은 Redis 캐시(1h)에서 반환."""
    redis = await get_redis()
    cache_key = f"report:monthly:{req.year}:{req.month}"

    cached_content = await redis.get(cache_key)
    if cached_content:
        return MonthlyReportResponse(year=req.year, month=req.month, content=cached_content, cached=True)

    holdings, summary = await _fetch_portfolio(db)

    try:
        content = await generate_monthly_report(req.year, req.month, summary, holdings)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("monthly report failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI 리포트 생성 실패: {e}")

    await redis.setex(cache_key, _MONTHLY_TTL, content)
    return MonthlyReportResponse(year=req.year, month=req.month, content=content, cached=False)


# ── 투자 전략서 ───────────────────────────────────────────────────────────────

class StrategyReportRequest(BaseModel):
    risk_level: RiskLevel = "moderate"
    horizon_years: Literal[1, 3, 5, 10] = 3


class StrategyReportResponse(BaseModel):
    risk_level: str
    horizon_years: int
    content: str
    cached: bool


@router.post("/strategy", response_model=StrategyReportResponse)
async def create_strategy_report(
    req: StrategyReportRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI 투자 전략서 생성. 동일 파라미터+포트폴리오 구성의 요청은 Redis 캐시(2h)에서 반환."""
    redis = await get_redis()

    holdings, summary = await _fetch_portfolio(db)
    ph = _portfolio_hash(holdings)
    cache_key = f"report:strategy:{req.risk_level}:{req.horizon_years}:{ph}"

    cached_content = await redis.get(cache_key)
    if cached_content:
        return StrategyReportResponse(
            risk_level=req.risk_level, horizon_years=req.horizon_years,
            content=cached_content, cached=True,
        )

    try:
        content = await generate_strategy_report(summary, holdings, req.risk_level, req.horizon_years)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("strategy report failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI 전략서 생성 실패: {e}")

    await redis.setex(cache_key, _STRATEGY_TTL, content)
    return StrategyReportResponse(
        risk_level=req.risk_level, horizon_years=req.horizon_years,
        content=content, cached=False,
    )


# ── 종목 상세 리포트 ──────────────────────────────────────────────────────────

_STOCK_TTL = 1800  # 30분


class StockReportResponse(BaseModel):
    symbol: str
    name: str
    content: str
    cached: bool


@router.post("/stock/{symbol}", response_model=StockReportResponse)
async def create_stock_report(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """보유 종목 심층 AI 분석 리포트. 동일 심볼+현재가(100원 단위) 요청은 Redis 캐시(30분)에서 반환."""
    redis = await get_redis()
    holdings, _ = await _fetch_portfolio(db)

    holding = next((h for h in holdings if h.symbol == symbol), None)
    if holding is None:
        raise HTTPException(status_code=404, detail=f"보유 종목에서 {symbol}을 찾을 수 없습니다.")

    price_bucket = round(holding.current_price / 100) * 100
    cache_key = f"report:stock:{symbol}:{price_bucket}"

    cached_content = await redis.get(cache_key)
    if cached_content:
        return StockReportResponse(symbol=symbol, name=holding.name, content=cached_content, cached=True)

    try:
        content = await generate_stock_report(holding)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("stock report failed symbol=%s: %s", symbol, e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI 종목 리포트 생성 실패: {e}")

    await redis.setex(cache_key, _STOCK_TTL, content)
    return StockReportResponse(symbol=symbol, name=holding.name, content=content, cached=False)
