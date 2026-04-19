"""키움증권 잔고 조회.

키움 REST API tr_id:
- 국내주식 잔고: OPW00004 (계좌평가잔고내역요청)
"""

import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.kiwoom.client import KiwoomClient

logger = logging.getLogger(__name__)


@dataclass
class KiwoomPosition:
    symbol: str
    name: str
    quantity: float
    avg_cost: float
    current_price: float
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float


@dataclass
class KiwoomSummary:
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    cash_krw: float
    total_asset_krw: float
    positions: list[KiwoomPosition] = field(default_factory=list)

    @property
    def return_pct(self) -> float:
        if self.purchase_amount_krw == 0:
            return 0.0
        return round(self.profit_loss_krw / self.purchase_amount_krw * 100, 4)


def _f(val: Any, default: float = 0.0) -> float:
    try:
        return float(str(val).replace(",", "") or default)
    except (ValueError, TypeError):
        return default


async def get_kiwoom_balance(client: KiwoomClient, account_no: str) -> KiwoomSummary:
    """키움 계좌 잔고 조회 (국내주식)."""
    try:
        data = await client.request(
            "POST",
            "/uapi/domestic-stock/v1/trading/inquire-balance",
            tr_id="TTTC8434R",
            body={
                "CANO": account_no.split("-")[0],
                "ACNT_PRDT_CD": account_no.split("-")[1] if "-" in account_no else "01",
                "AFHR_FLPR_YN": "N",
                "OFL_YN": "N",
                "INQR_DVSN": "02",
                "UNPR_DVSN": "01",
                "FUND_STTL_ICLD_YN": "N",
                "FNCG_AMT_AUTO_RDPT_YN": "N",
                "PRCS_DVSN": "01",
                "CTX_AREA_FK100": "",
                "CTX_AREA_NK100": "",
            },
        )
    except Exception as exc:
        logger.error("키움 잔고 조회 실패: %s", exc)
        # 연결 실패 시 빈 결과 반환 (서비스 중단 방지)
        return KiwoomSummary(
            purchase_amount_krw=0,
            eval_amount_krw=0,
            profit_loss_krw=0,
            cash_krw=0,
            total_asset_krw=0,
        )

    output1 = data.get("output1", [])
    output2 = data.get("output2", [{}])
    summary_row = output2[0] if output2 else {}

    positions = []
    for row in output1:
        qty = _f(row.get("hldg_qty"))
        if qty <= 0:
            continue
        positions.append(KiwoomPosition(
            symbol=row.get("pdno", ""),
            name=row.get("prdt_name", ""),
            quantity=qty,
            avg_cost=_f(row.get("pchs_avg_pric")),
            current_price=_f(row.get("prpr")),
            purchase_amount_krw=_f(row.get("pchs_amt")),
            eval_amount_krw=_f(row.get("evlu_amt")),
            profit_loss_krw=_f(row.get("evlu_pfls_amt")),
            return_pct=_f(row.get("evlu_pfls_rt")),
        ))

    purchase_total = _f(summary_row.get("pchs_amt_smtl_amt"))
    eval_total = _f(summary_row.get("evlu_amt_smtl_amt"))
    pnl_total = _f(summary_row.get("evlu_pfls_smtl_amt"))
    cash = _f(summary_row.get("dnca_tot_amt"))

    return KiwoomSummary(
        purchase_amount_krw=purchase_total,
        eval_amount_krw=eval_total,
        profit_loss_krw=pnl_total,
        cash_krw=cash,
        total_asset_krw=eval_total + cash,
        positions=positions,
    )
