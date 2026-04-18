"""한국투자증권 KIS Developers API 클라이언트."""

import time
from typing import Any

import httpx

from app.core.config import settings
from app.core.redis import get_redis

BASE_URL_MOCK = "https://openapivts.koreainvestment.com:29443"
BASE_URL_REAL = "https://openapi.koreainvestment.com:9443"


class KISClient:
    def __init__(self) -> None:
        self.base_url = BASE_URL_MOCK if settings.kis_mock else BASE_URL_REAL
        self._http = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def _get_access_token(self) -> str:
        redis = await get_redis()
        token = await redis.get("kis:access_token")
        if token:
            return token

        resp = await self._http.post(
            "/oauth2/tokenP",
            json={
                "grant_type": "client_credentials",
                "appkey": settings.kis_app_key,
                "appsecret": settings.kis_app_secret,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        access_token = data["access_token"]
        expires_in = int(data.get("expires_in", 86400)) - 60  # 만료 1분 전 갱신

        await redis.setex("kis:access_token", expires_in, access_token)
        return access_token

    async def request(
        self, method: str, path: str, tr_id: str, params: dict | None = None, body: dict | None = None
    ) -> dict[str, Any]:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "appkey": settings.kis_app_key,
            "appsecret": settings.kis_app_secret,
            "tr_id": tr_id,
            "Content-Type": "application/json; charset=utf-8",
        }
        resp = await self._http.request(method, path, headers=headers, params=params, json=body)
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        await self._http.aclose()


# 싱글턴
_kis_client: KISClient | None = None


def get_kis_client() -> KISClient:
    global _kis_client
    if _kis_client is None:
        _kis_client = KISClient()
    return _kis_client
