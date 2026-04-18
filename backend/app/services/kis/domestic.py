"""국내 주식 잔고 조회."""

from typing import Any

from app.core.config import settings
from app.services.kis.client import get_kis_client


async def get_domestic_balance() -> dict[str, Any]:
    """국내 주식 잔고 조회 (TTTC8434R)."""
    client = get_kis_client()
    tr_id = "VTTC8434R" if settings.kis_mock else "TTTC8434R"

    account_no, product_code = settings.kis_account_no.split("-")

    return await client.request(
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
