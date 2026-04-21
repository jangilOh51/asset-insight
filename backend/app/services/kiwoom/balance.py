"""키움증권 잔고 조회.

키움 REST API TR:
- 실전: JTCE5005R (주식잔고조회)
- 모의: VTCE5005R (주식잔고조회 모의)

Endpoint: POST /uapi/domestic-stock/v1/trading/inquire-balance
"""

import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.kiwoom.client import KiwoomClient

logger = logging.getLogger(__name__)

# 실전 / 모의 TR ID
_TR_REAL = "JTCE5005R"
_TR_MOCK = "VTCE5005R"

_ENDPOINT = "/uapi/domestic-stock/v1/trading/inquire-balance"


@dataclass
class KiwoomPosition:
    symbol: str
    name: str
    quantity: float
    avg_cost: float           # 평균단가 (원)
    current_price: float      # 현재가 (원)
    purchase_amount_krw: float
    eval_amount_krw: float
    profit_loss_krw: float
    return_pct: float
    day_change_pct: float = 0.0   # 전일대비 등락률


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
    """문자열 숫자 → float 변환 (콤마 제거, 빈 값 기본값 처리)."""
    try:
        return float(str(val).replace(",", "").strip() or default)
    except (ValueError, TypeError):
        return default


async def get_kiwoom_balance(client: KiwoomClient, account_no: str) -> KiwoomSummary:
    """키움 계좌 잔고 조회 (국내주식).

    account_no: "XXXXXXXXXX-XX" 또는 "XXXXXXXXXX" 형식 모두 허용.
    """
    parts = account_no.split("-")
    cano = parts[0]
    acnt_prdt_cd = parts[1] if len(parts) > 1 else "01"

    tr_id = _TR_MOCK if client.is_mock else _TR_REAL

    try:
        data = await client.request(
            "POST",
            _ENDPOINT,
            tr_id=tr_id,
            body={
                "CANO": cano,
                "ACNT_PRDT_CD": acnt_prdt_cd,
                "AFHR_FLPR_YN": "N",   # 시간외 단일가 여부
                "OFL_YN": "",
                "INQR_DVSN": "02",     # 종목별
                "UNPR_DVSN": "01",     # 단가 구분
                "FUND_STTL_ICLD_YN": "N",
                "FNCG_AMT_AUTO_RDPT_YN": "N",
                "PRCS_DVSN": "01",
                "CTX_AREA_FK100": "",
                "CTX_AREA_NK100": "",
            },
        )
    except Exception as exc:
        logger.error("키움 잔고 조회 실패 (account=%s tr_id=%s): %s", account_no, tr_id, exc)
        return KiwoomSummary(
            purchase_amount_krw=0, eval_amount_krw=0,
            profit_loss_krw=0, cash_krw=0, total_asset_krw=0,
        )

    rt_cd = data.get("rt_cd", "0")
    if rt_cd != "0":
        msg = data.get("msg1", "")
        logger.error("키움 API 오류 (rt_cd=%s): %s", rt_cd, msg)
        return KiwoomSummary(
            purchase_amount_krw=0, eval_amount_krw=0,
            profit_loss_krw=0, cash_krw=0, total_asset_krw=0,
        )

    output1: list[dict] = data.get("output1", [])
    output2_list: list[dict] = data.get("output2", [{}])
    summary_row: dict = output2_list[0] if output2_list else {}

    positions: list[KiwoomPosition] = []
    for row in output1:
        qty = _f(row.get("hldg_qty"))
        if qty <= 0:
            continue
        positions.append(KiwoomPosition(
            symbol=str(row.get("pdno", "")).strip(),
            name=str(row.get("prdt_name", "")).strip(),
            quantity=qty,
            avg_cost=_f(row.get("pchs_avg_pric")),
            current_price=_f(row.get("prpr")),
            purchase_amount_krw=_f(row.get("pchs_amt")),
            eval_amount_krw=_f(row.get("evlu_amt")),
            profit_loss_krw=_f(row.get("evlu_pfls_amt")),
            return_pct=_f(row.get("evlu_pfls_rt")),
            day_change_pct=_f(row.get("prdy_ctrt")),   # 전일대비율
        ))

    purchase_total = _f(summary_row.get("pchs_amt_smtl_amt"))
    eval_total     = _f(summary_row.get("evlu_amt_smtl_amt"))
    pnl_total      = _f(summary_row.get("evlu_pfls_smtl_amt"))
    cash           = _f(summary_row.get("dnca_tot_amt"))

    return KiwoomSummary(
        purchase_amount_krw=purchase_total,
        eval_amount_krw=eval_total,
        profit_loss_krw=pnl_total,
        cash_krw=cash,
        total_asset_krw=eval_total + cash,
        positions=positions,
    )
