"""해외 주식 잔고 조회."""

from typing import Any

from app.core.config import settings
from app.services.kis.client import get_kis_client


async def get_overseas_balance(exchange: str = "NYSE") -> dict[str, Any]:
    """해외 주식 잔고 조회 (TTTS3012R).

    exchange: NASD(나스닥), NYSE(뉴욕), AMEX, SEHK(홍콩), SHAA(상해), SZAA(심천), TKSE(도쿄)
    """
    client = get_kis_client()
    tr_id = "VTTS3012R" if settings.kis_mock else "TTTS3012R"

    account_no, product_code = settings.kis_account_no.split("-")

    return await client.request(
        "GET",
        "/uapi/overseas-stock/v1/trading/inquire-balance",
        tr_id=tr_id,
        params={
            "CANO": account_no,
            "ACNT_PRDT_CD": product_code,
            "OVRS_EXCG_CD": exchange,
            "TR_CRCY_CD": "USD",
            "CTX_AREA_FK200": "",
            "CTX_AREA_NK200": "",
        },
    )
