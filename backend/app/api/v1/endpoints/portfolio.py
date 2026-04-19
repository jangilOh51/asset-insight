"""통합 포트폴리오 실시간 조회 API."""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter

from app.schemas.portfolio import (
    HoldingItem,
    PortfolioRealtimeResponse,
    PortfolioSummary,
)
from app.services.kis.domestic import get_domestic_balance
from app.services.kis.exchange_rate import get_usd_krw
from app.services.kis.overseas import get_all_overseas_balances

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/realtime", response_model=PortfolioRealtimeResponse)
async def get_portfolio_realtime():
    """국내 + 해외 잔고를 동시 조회해 KRW 통합 포트폴리오를 반환합니다."""
    domestic, overseas_list, usd_krw = await asyncio.gather(
        get_domestic_balance(),
        get_all_overseas_balances(),
        get_usd_krw(),
    )

    holdings: list[HoldingItem] = []

    # 국내 종목
    for p in domestic.positions:
        holdings.append(HoldingItem(
            symbol=p.symbol,
            name=p.name,
            market="KR",
            exchange="KR",
            currency="KRW",
            quantity=p.quantity,
            avg_cost=p.avg_cost,
            current_price=p.current_price,
            avg_cost_native=p.avg_cost,
            current_price_native=p.current_price,
            purchase_amount_krw=p.purchase_amount_krw,
            eval_amount_krw=p.eval_amount_krw,
            profit_loss_krw=p.profit_loss_krw,
            return_pct=p.return_pct,
            weight_pct=0.0,
        ))

    # 해외 종목 (외화 → KRW 환산)
    for os_summary in overseas_list:
        for p in os_summary.positions:
            purchase_krw = round(p.purchase_amount_foreign * usd_krw)
            eval_krw = round(p.eval_amount_foreign * usd_krw)
            pnl_krw = round(p.profit_loss_foreign * usd_krw)
            holdings.append(HoldingItem(
                symbol=p.symbol,
                name=p.name,
                market="US",
                exchange=p.exchange_code,
                currency="USD",
                quantity=p.quantity,
                avg_cost=round(p.avg_cost * usd_krw),
                current_price=round(p.current_price * usd_krw),
                avg_cost_native=p.avg_cost,
                current_price_native=p.current_price,
                purchase_amount_krw=purchase_krw,
                eval_amount_krw=eval_krw,
                profit_loss_krw=pnl_krw,
                return_pct=p.return_pct,
                weight_pct=0.0,
            ))

    # 비중 계산 (현금 포함 총 자산 기준)
    overseas_eval_krw = sum(
        round(p.eval_amount_foreign * usd_krw)
        for os in overseas_list
        for p in os.positions
    )
    total_asset_krw = domestic.total_asset_krw + overseas_eval_krw
    if total_asset_krw > 0:
        for h in holdings:
            h.weight_pct = round(h.eval_amount_krw / total_asset_krw * 100, 2)

    # 합산 요약
    overseas_purchase_krw = sum(
        round(p.purchase_amount_foreign * usd_krw)
        for os in overseas_list
        for p in os.positions
    )
    overseas_pnl_krw = sum(
        round(p.profit_loss_foreign * usd_krw)
        for os in overseas_list
        for p in os.positions
    )

    total_purchase = domestic.purchase_amount_krw + overseas_purchase_krw
    total_eval = domestic.eval_amount_krw + overseas_eval_krw
    total_pnl = domestic.profit_loss_krw + overseas_pnl_krw
    return_pct = round(total_pnl / total_purchase * 100, 4) if total_purchase > 0 else 0.0

    summary = PortfolioSummary(
        purchase_amount_krw=round(total_purchase),
        eval_amount_krw=round(total_eval),
        profit_loss_krw=round(total_pnl),
        return_pct=return_pct,
        cash_krw=round(domestic.cash_krw),
        total_asset_krw=round(total_asset_krw),
    )

    return PortfolioRealtimeResponse(
        summary=summary,
        holdings=holdings,
        usd_krw=usd_krw,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )
