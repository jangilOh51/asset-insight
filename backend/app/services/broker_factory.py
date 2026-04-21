"""증권사별 잔고 조회 라우터.

BrokerAccount의 broker_type에 따라 올바른 API 클라이언트와 잔고 함수를 선택한다.
"""

import logging
from dataclasses import dataclass, field

from app.models.broker_account import BrokerAccount

logger = logging.getLogger(__name__)


@dataclass
class UnifiedPosition:
    symbol: str
    name: str
    market: str          # "KR" | "US"
    exchange: str        # "KR" | "NASD" | "NYSE" 등
    currency: str        # "KRW" | "USD"
    quantity: float
    avg_cost: float
    current_price: float
    avg_cost_native: float
    current_price_native: float
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float
    day_change_pct: float = 0.0   # 전일대비 등락률
    weight_pct: float = 0.0


@dataclass
class UnifiedSummary:
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    cash_krw: float
    total_asset_krw: float
    return_pct: float
    positions: list[UnifiedPosition] = field(default_factory=list)
    account_id: str = ""
    account_name: str = ""
    broker_type: str = ""


async def fetch_account_balance(account: BrokerAccount, usd_krw: float = 1300.0) -> UnifiedSummary:
    """계좌 타입에 따라 적절한 서비스를 호출해 통합 잔고를 반환한다."""
    if account.broker_type == "KIS":
        return await _fetch_kis(account, usd_krw)
    elif account.broker_type == "KIWOOM":
        return await _fetch_kiwoom(account)
    else:
        logger.warning("지원하지 않는 증권사: %s", account.broker_type)
        return _empty_summary(account)


async def _fetch_kis(account: BrokerAccount, usd_krw: float) -> UnifiedSummary:
    import asyncio
    from app.core.config import settings
    from app.services.kis.client import KISClient
    from app.services.kis.domestic import get_domestic_balance
    from app.services.kis.overseas import get_all_overseas_balances

    # 계좌에 자체 키가 있으면 사용, 없으면 환경변수 전역 키 사용
    app_key = account.app_key or settings.kis_app_key
    app_secret = account.app_secret or settings.kis_app_secret
    is_mock = account.is_mock if account.app_key else settings.kis_mock

    # 계좌별 KIS 클라이언트 (전역 settings 임시 패치 방식 → 클라이언트 DI 방식으로 개선)
    original_key = settings.kis_app_key
    original_secret = settings.kis_app_secret
    original_no = settings.kis_account_no
    original_mock = settings.kis_mock

    try:
        settings.kis_app_key = app_key
        settings.kis_app_secret = app_secret
        settings.kis_account_no = account.account_no
        settings.kis_mock = is_mock

        domestic, overseas_list = await asyncio.gather(
            get_domestic_balance(),
            get_all_overseas_balances(),
        )
    finally:
        settings.kis_app_key = original_key
        settings.kis_app_secret = original_secret
        settings.kis_account_no = original_no
        settings.kis_mock = original_mock

    positions: list[UnifiedPosition] = []

    for p in domestic.positions:
        positions.append(UnifiedPosition(
            symbol=p.symbol, name=p.name,
            market="KR", exchange="KR", currency="KRW",
            quantity=p.quantity,
            avg_cost=p.avg_cost, current_price=p.current_price,
            avg_cost_native=p.avg_cost, current_price_native=p.current_price,
            purchase_amount_krw=p.purchase_amount_krw,
            eval_amount_krw=p.eval_amount_krw,
            profit_loss_krw=p.profit_loss_krw,
            return_pct=p.return_pct,
            day_change_pct=p.day_change_pct,
        ))

    for os_summary in overseas_list:
        for p in os_summary.positions:
            purchase_krw = round(p.purchase_amount_foreign * usd_krw)
            eval_krw = round(p.eval_amount_foreign * usd_krw)
            pnl_krw = round(p.profit_loss_foreign * usd_krw)
            positions.append(UnifiedPosition(
                symbol=p.symbol, name=p.name,
                market="US", exchange=p.exchange_code, currency="USD",
                quantity=p.quantity,
                avg_cost=round(p.avg_cost * usd_krw),
                current_price=round(p.current_price * usd_krw),
                avg_cost_native=p.avg_cost,
                current_price_native=p.current_price,
                purchase_amount_krw=purchase_krw,
                eval_amount_krw=eval_krw,
                profit_loss_krw=pnl_krw,
                return_pct=p.return_pct,
                day_change_pct=p.day_change_pct,
            ))

    overseas_eval_krw = sum(
        round(p.eval_amount_foreign * usd_krw)
        for os in overseas_list for p in os.positions
    )
    overseas_purchase_krw = sum(
        round(p.purchase_amount_foreign * usd_krw)
        for os in overseas_list for p in os.positions
    )
    overseas_pnl_krw = sum(
        round(p.profit_loss_foreign * usd_krw)
        for os in overseas_list for p in os.positions
    )

    total_asset = domestic.total_asset_krw + overseas_eval_krw
    total_purchase = domestic.purchase_amount_krw + overseas_purchase_krw
    total_pnl = domestic.profit_loss_krw + overseas_pnl_krw
    return_pct = round(total_pnl / total_purchase * 100, 4) if total_purchase > 0 else 0.0

    # 비중 계산
    if total_asset > 0:
        for pos in positions:
            pos.weight_pct = round(pos.eval_amount_krw / total_asset * 100, 2)

    return UnifiedSummary(
        purchase_amount_krw=round(domestic.purchase_amount_krw + overseas_purchase_krw),
        eval_amount_krw=round(domestic.eval_amount_krw + overseas_eval_krw),
        profit_loss_krw=round(total_pnl),
        cash_krw=round(domestic.cash_krw),
        total_asset_krw=round(total_asset),
        return_pct=return_pct,
        positions=positions,
        account_id=account.id,
        account_name=account.account_name or account.account_no,
        broker_type=account.broker_type,
    )


async def _fetch_kiwoom(account: BrokerAccount) -> UnifiedSummary:
    from app.core.config import settings
    from app.services.kiwoom.client import KiwoomClient
    from app.services.kiwoom.balance import get_kiwoom_balance

    # 계좌별 API 키 우선, 없으면 전역 환경변수 사용
    app_key    = account.app_key    or settings.kiwoom_app_key
    app_secret = account.app_secret or settings.kiwoom_app_secret
    is_mock    = account.is_mock if account.app_key else settings.kiwoom_mock

    client = KiwoomClient(
        app_key=app_key,
        app_secret=app_secret,
        is_mock=is_mock,
    )
    try:
        summary = await get_kiwoom_balance(client, account.account_no)
    finally:
        await client.close()

    positions = [
        UnifiedPosition(
            symbol=p.symbol, name=p.name,
            market="KR", exchange="KR", currency="KRW",
            quantity=p.quantity,
            avg_cost=p.avg_cost, current_price=p.current_price,
            avg_cost_native=p.avg_cost, current_price_native=p.current_price,
            purchase_amount_krw=p.purchase_amount_krw,
            eval_amount_krw=p.eval_amount_krw,
            profit_loss_krw=p.profit_loss_krw,
            return_pct=p.return_pct,
            day_change_pct=p.day_change_pct,
        )
        for p in summary.positions
    ]

    total_asset = summary.total_asset_krw
    if total_asset > 0:
        for pos in positions:
            pos.weight_pct = round(pos.eval_amount_krw / total_asset * 100, 2)

    return UnifiedSummary(
        purchase_amount_krw=summary.purchase_amount_krw,
        eval_amount_krw=summary.eval_amount_krw,
        profit_loss_krw=summary.profit_loss_krw,
        cash_krw=summary.cash_krw,
        total_asset_krw=total_asset,
        return_pct=summary.return_pct,
        positions=positions,
        account_id=account.id,
        account_name=account.account_name or account.account_no,
        broker_type=account.broker_type,
    )


def _empty_summary(account: BrokerAccount) -> UnifiedSummary:
    return UnifiedSummary(
        purchase_amount_krw=0, eval_amount_krw=0,
        profit_loss_krw=0, cash_krw=0, total_asset_krw=0, return_pct=0,
        account_id=account.id,
        account_name=account.account_name,
        broker_type=account.broker_type,
    )
