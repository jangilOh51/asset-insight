"""통합 포트폴리오 실시간 조회 API."""

import asyncio
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.broker_account import BrokerAccount
from app.models.custom_asset import CustomAsset
from app.models.position_snapshot import PositionSnapshot
from app.schemas.portfolio import HoldingItem, PortfolioRealtimeResponse, PortfolioSummary
from app.services.broker_factory import UnifiedSummary, fetch_account_balance
from app.services.kis.exchange_rate import get_usd_krw
from app.services.snapshot_writer import write_snapshot

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/realtime", response_model=PortfolioRealtimeResponse)
async def get_portfolio_realtime(
    background_tasks: BackgroundTasks,
    account_id: str | None = Query(default=None, description="특정 계좌 ID. 없으면 전체 활성 계좌 합산"),
    db: AsyncSession = Depends(get_db),
):
    """
    실시간 포트폴리오 조회.
    - account_id 없음: 모든 활성 계좌 합산
    - account_id 있음: 해당 계좌만 조회
    - DB 계좌 없음: 환경변수 KIS 설정으로 fallback
    - 조회 성공 시 BackgroundTask로 DB 스냅샷 자동 저장 (10분 쓰로틀)
    """
    usd_krw = await get_usd_krw()

    stmt = select(BrokerAccount).where(BrokerAccount.is_active == True)
    if account_id:
        stmt = stmt.where(BrokerAccount.id == account_id)
    result = await db.execute(stmt.order_by(BrokerAccount.display_order))
    accounts = result.scalars().all()

    # env-kis: 환경변수 계좌 (DB 미등록) — legacy 경로 사용
    if not accounts or account_id == "env-kis":
        return await _legacy_realtime(usd_krw)

    summaries: list[UnifiedSummary] = await asyncio.gather(
        *[fetch_account_balance(acc, usd_krw) for acc in accounts]
    )

    # 조회 성공 후 백그라운드로 스냅샷 저장 (응답 지연 없음)
    for acc, summary in zip(accounts, summaries):
        background_tasks.add_task(write_snapshot, acc.account_no, summary, usd_krw)

    # 활성 수동 자산 합산
    custom_result = await db.execute(
        select(CustomAsset).where(CustomAsset.is_active == True)
    )
    custom_assets = custom_result.scalars().all()
    custom_total_krw = sum(float(a.current_value_krw) for a in custom_assets)

    response = _merge_summaries(summaries, usd_krw, custom_total_krw=custom_total_krw)

    # day_change_pct가 0인 종목은 스냅샷 fallback으로 계산
    account_nos = [a.account_no for a in accounts]
    await _fill_snapshot_day_change(response.holdings, account_nos, db)

    return response


def _merge_summaries(summaries: list[UnifiedSummary], usd_krw: float, custom_total_krw: float = 0.0) -> PortfolioRealtimeResponse:
    all_positions = []
    total_purchase = total_eval = total_pnl = total_cash = 0.0

    for s in summaries:
        all_positions.extend(s.positions)
        total_purchase += s.purchase_amount_krw
        total_eval += s.eval_amount_krw
        total_pnl += s.profit_loss_krw
        total_cash += s.cash_krw

    total_asset = total_eval + total_cash + custom_total_krw
    return_pct = round(total_pnl / total_purchase * 100, 4) if total_purchase > 0 else 0.0

    holdings: list[HoldingItem] = []
    for p in all_positions:
        weight = round(p.eval_amount_krw / total_asset * 100, 2) if total_asset > 0 else 0.0
        holdings.append(HoldingItem(
            symbol=p.symbol, name=p.name,
            market=p.market, exchange=p.exchange, currency=p.currency,
            quantity=p.quantity,
            avg_cost=p.avg_cost, current_price=p.current_price,
            avg_cost_native=p.avg_cost_native, current_price_native=p.current_price_native,
            purchase_amount_krw=p.purchase_amount_krw,
            eval_amount_krw=p.eval_amount_krw,
            profit_loss_krw=p.profit_loss_krw,
            return_pct=p.return_pct, day_change_pct=p.day_change_pct, weight_pct=weight,
        ))

    summary = PortfolioSummary(
        purchase_amount_krw=round(total_purchase),
        eval_amount_krw=round(total_eval),
        profit_loss_krw=round(total_pnl),
        return_pct=return_pct,
        cash_krw=round(total_cash),
        total_asset_krw=round(total_asset),
        custom_asset_krw=round(custom_total_krw),
    )
    return PortfolioRealtimeResponse(
        summary=summary, holdings=holdings,
        usd_krw=usd_krw,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


async def _legacy_realtime(usd_krw: float) -> PortfolioRealtimeResponse:
    """DB 계좌 미등록 시 환경변수 KIS 설정으로 조회 (하위 호환)."""
    from app.services.kis.domestic import get_domestic_balance
    from app.services.kis.overseas import get_all_overseas_balances

    domestic, overseas_list = await asyncio.gather(
        get_domestic_balance(), get_all_overseas_balances(),
    )

    holdings: list[HoldingItem] = []
    for p in domestic.positions:
        holdings.append(HoldingItem(
            symbol=p.symbol, name=p.name, market="KR", exchange="KR", currency="KRW",
            quantity=p.quantity, avg_cost=p.avg_cost, current_price=p.current_price,
            avg_cost_native=p.avg_cost, current_price_native=p.current_price,
            purchase_amount_krw=p.purchase_amount_krw, eval_amount_krw=p.eval_amount_krw,
            profit_loss_krw=p.profit_loss_krw, return_pct=p.return_pct,
            day_change_pct=p.day_change_pct, weight_pct=0.0,
        ))
    for os_s in overseas_list:
        for p in os_s.positions:
            holdings.append(HoldingItem(
                symbol=p.symbol, name=p.name, market="US", exchange=p.exchange_code, currency="USD",
                quantity=p.quantity,
                avg_cost=round(p.avg_cost * usd_krw), current_price=round(p.current_price * usd_krw),
                avg_cost_native=p.avg_cost, current_price_native=p.current_price,
                purchase_amount_krw=round(p.purchase_amount_foreign * usd_krw),
                eval_amount_krw=round(p.eval_amount_foreign * usd_krw),
                profit_loss_krw=round(p.profit_loss_foreign * usd_krw),
                return_pct=p.return_pct, day_change_pct=p.day_change_pct, weight_pct=0.0,
            ))

    overseas_eval = sum(round(p.eval_amount_foreign * usd_krw) for os in overseas_list for p in os.positions)
    total_asset = domestic.total_asset_krw + overseas_eval
    if total_asset > 0:
        for h in holdings:
            h.weight_pct = round(h.eval_amount_krw / total_asset * 100, 2)

    total_pur = domestic.purchase_amount_krw + sum(round(p.purchase_amount_foreign * usd_krw) for os in overseas_list for p in os.positions)
    total_pnl = domestic.profit_loss_krw + sum(round(p.profit_loss_foreign * usd_krw) for os in overseas_list for p in os.positions)
    return_pct = round(total_pnl / total_pur * 100, 4) if total_pur > 0 else 0.0

    return PortfolioRealtimeResponse(
        summary=PortfolioSummary(
            purchase_amount_krw=round(total_pur),
            eval_amount_krw=round(domestic.eval_amount_krw + overseas_eval),
            profit_loss_krw=round(total_pnl), return_pct=return_pct,
            cash_krw=round(domestic.cash_krw), total_asset_krw=round(total_asset),
        ),
        holdings=holdings, usd_krw=usd_krw,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


async def _fill_snapshot_day_change(
    holdings: list[HoldingItem],
    account_nos: list[str],
    db: AsyncSession,
) -> None:
    """day_change_pct == 0.0인 종목에 대해 최근 2개 스냅샷 가격 차로 등락률을 보정한다.

    KIS 모의투자처럼 prdy_ctrt를 반환하지 않는 환경의 fallback.
    스냅샷이 2개 이상 없으면 해당 종목은 건너뛴다.
    """
    zero_symbols = [h.symbol for h in holdings if h.day_change_pct == 0.0]
    if not zero_symbols or not account_nos:
        return

    # 각 symbol의 최근 2개 스냅샷 조회 (row_number window function)
    rn = func.row_number().over(
        partition_by=[PositionSnapshot.symbol],
        order_by=PositionSnapshot.time.desc(),
    ).label("rn")

    subq = (
        select(
            PositionSnapshot.symbol,
            PositionSnapshot.current_price,
            PositionSnapshot.time,
            rn,
        )
        .where(
            PositionSnapshot.account_no.in_(account_nos),
            PositionSnapshot.symbol.in_(zero_symbols),
        )
        .subquery()
    )

    result = await db.execute(
        select(subq.c.symbol, subq.c.current_price, subq.c.rn)
        .where(subq.c.rn <= 2)
        .order_by(subq.c.symbol, subq.c.rn)
    )
    rows = result.all()

    # symbol → [최신가, 전일가]
    prices: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        prices[row.symbol].append(float(row.current_price))

    for h in holdings:
        if h.day_change_pct != 0.0:
            continue
        pts = prices.get(h.symbol, [])
        if len(pts) < 2:
            continue
        today_p, prev_p = pts[0], pts[1]
        if prev_p > 0:
            h.day_change_pct = round((today_p - prev_p) / prev_p * 100, 2)
            h.day_change_source = "snapshot"
