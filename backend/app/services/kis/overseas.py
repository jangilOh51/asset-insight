"""해외 주식 잔고 조회 및 파싱."""

from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings
from app.services.kis.client import get_kis_client

OVERSEAS_EXCHANGES = ["NASD", "NYSE", "AMEX", "SEHK", "SHAA", "SZAA", "TKSE"]

# 거래소별 통화
EXCHANGE_CURRENCY: dict[str, str] = {
    "NASD": "USD", "NYSE": "USD", "AMEX": "USD",
    "SEHK": "HKD",
    "SHAA": "CNY", "SZAA": "CNY",
    "TKSE": "JPY",
}


@dataclass
class OverseasPosition:
    symbol: str
    name: str
    exchange_code: str
    currency: str
    quantity: float
    available_qty: float
    avg_cost: float           # 매입평균가 (외화)
    current_price: float      # 현재가 (외화)
    purchase_amount_foreign: float   # 매입금액 (외화)
    eval_amount_foreign: float       # 평가금액 (외화)
    profit_loss_foreign: float       # 평가손익 (외화)
    return_pct: float


@dataclass
class OverseasSummary:
    exchange_code: str
    currency: str
    positions: list[OverseasPosition] = field(default_factory=list)


def _parse_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val or default)
    except (ValueError, TypeError):
        return default


async def get_overseas_balance(exchange: str = "NASD") -> OverseasSummary:
    """해외 주식 잔고 조회 후 파싱된 구조체 반환."""
    client = get_kis_client()
    tr_id = "VTTS3012R" if settings.kis_mock else "TTTS3012R"
    account_no, product_code = settings.kis_account_no.split("-")

    raw = await client.request(
        "GET",
        "/uapi/overseas-stock/v1/trading/inquire-balance",
        tr_id=tr_id,
        params={
            "CANO": account_no,
            "ACNT_PRDT_CD": product_code,
            "OVRS_EXCG_CD": exchange,
            "TR_CRCY_CD": EXCHANGE_CURRENCY.get(exchange, "USD"),
            "CTX_AREA_FK200": "",
            "CTX_AREA_NK200": "",
        },
    )

    currency = EXCHANGE_CURRENCY.get(exchange, "USD")
    positions: list[OverseasPosition] = []
    for item in raw.get("output1", []):
        qty = _parse_float(item.get("ovrs_cblc_qty"))
        if qty == 0:
            continue
        positions.append(OverseasPosition(
            symbol=item.get("ovrs_pdno", ""),
            name=item.get("ovrs_item_name", ""),
            exchange_code=item.get("ovrs_excg_cd", exchange),
            currency=item.get("tr_crcy_cd", currency),
            quantity=qty,
            available_qty=_parse_float(item.get("ord_psbl_qty")),
            avg_cost=_parse_float(item.get("pchs_avg_pric")),
            current_price=_parse_float(item.get("now_pric2")),
            purchase_amount_foreign=_parse_float(item.get("frcr_pchs_amt1")),
            eval_amount_foreign=_parse_float(item.get("ovrs_stck_evlu_amt")),
            profit_loss_foreign=_parse_float(item.get("frcr_evlu_pfls_amt")),
            return_pct=_parse_float(item.get("evlu_pfls_rt")),
        ))

    return OverseasSummary(exchange_code=exchange, currency=currency, positions=positions)


async def get_all_overseas_balances(exchanges: list[str] | None = None) -> list[OverseasSummary]:
    """설정된 모든 거래소 잔고 조회."""
    targets = exchanges or settings.kis_overseas_exchanges
    results = []
    for exchange in targets:
        summary = await get_overseas_balance(exchange)
        if summary.positions:
            results.append(summary)
    return results
