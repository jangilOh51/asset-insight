"""국내 주식 잔고 조회 및 파싱."""

from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings
from app.services.kis.client import get_kis_client


@dataclass
class DomesticPosition:
    symbol: str
    name: str
    quantity: float
    available_qty: float
    avg_cost: float          # 매입평균가 (KRW)
    current_price: float     # 현재가 (KRW)
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float
    day_change_pct: float = 0.0   # 전일대비 등락률 (prdy_ctrt)


@dataclass
class DomesticSummary:
    purchase_amount_krw: float    # 매입금액합계
    eval_amount_krw: float        # 평가금액합계 (주식)
    profit_loss_krw: float        # 평가손익합계
    cash_krw: float               # 예수금
    total_asset_krw: float        # 총평가금액 (현금+주식)
    positions: list[DomesticPosition] = field(default_factory=list)

    @property
    def return_pct(self) -> float:
        if self.purchase_amount_krw == 0:
            return 0.0
        return round(self.profit_loss_krw / self.purchase_amount_krw * 100, 4)


def _parse_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val or default)
    except (ValueError, TypeError):
        return default


async def get_domestic_balance() -> DomesticSummary:
    """국내 주식 잔고 조회 후 파싱된 구조체 반환."""
    client = get_kis_client()
    tr_id = "VTTC8434R" if settings.kis_mock else "TTTC8434R"
    account_no, product_code = settings.kis_account_no.split("-")

    raw = await client.request(
        "GET",
        "/uapi/domestic-stock/v1/trading/inquire-balance",
        tr_id=tr_id,
        params={
            "CANO": account_no,
            "ACNT_PRDT_CD": product_code,
            "AFHR_FLPR_YN": "N",
            "OFL_YN": "",
            "INQR_DVSN": "02",
            "UNPR_DVSN": "01",
            "FUND_STTL_ICLD_YN": "N",
            "FNCG_AMT_AUTO_RDPT_YN": "N",
            "PRCS_DVSN": "01",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": "",
        },
    )

    positions: list[DomesticPosition] = []
    for item in raw.get("output1", []):
        qty = _parse_float(item.get("hldg_qty"))
        if qty == 0:
            continue
        positions.append(DomesticPosition(
            symbol=item.get("pdno", ""),
            name=item.get("prdt_name", ""),
            quantity=qty,
            available_qty=_parse_float(item.get("ord_psbl_qty")),
            avg_cost=_parse_float(item.get("pchs_avg_pric")),
            current_price=_parse_float(item.get("prpr")),
            purchase_amount_krw=_parse_float(item.get("pchs_amt")),
            eval_amount_krw=_parse_float(item.get("evlu_amt")),
            profit_loss_krw=_parse_float(item.get("evlu_pfls_amt")),
            return_pct=_parse_float(item.get("evlu_pfls_rt")),
            day_change_pct=_parse_float(item.get("prdy_ctrt")),
        ))

    # output2는 단일 객체 또는 리스트
    out2 = raw.get("output2", {})
    if isinstance(out2, list):
        out2 = out2[0] if out2 else {}

    summary = DomesticSummary(
        purchase_amount_krw=_parse_float(out2.get("pchs_amt_smtl_amt")),
        eval_amount_krw=_parse_float(out2.get("evlu_amt_smtl_amt")),
        profit_loss_krw=_parse_float(out2.get("evlu_pfls_smtl_amt")),
        cash_krw=_parse_float(out2.get("dnca_tot_amt")),
        total_asset_krw=_parse_float(out2.get("tot_evlu_amt")),
        positions=positions,
    )
    return summary
