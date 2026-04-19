"""키움증권 REST API 클라이언트.

키움 OpenAPI+ REST 방식을 사용한다.
- 실전: https://openapi.kiwoom.com
- 문서: https://openapi.kiwoom.com/apiService/main

주의: 키움 OpenAPI COM 방식(Windows 전용)은 지원하지 않는다.
"""

import logging
from typing import Any

import httpx

from app.core.redis import get_redis

logger = logging.getLogger(__name__)

KIWOOM_BASE_URL = "https://openapi.kiwoom.com"
TOKEN_TTL = 86100  # 23시간 55분 (1일 만료 5분 전 갱신)


class KiwoomClient:
    def __init__(self, app_key: str, app_secret: str, is_mock: bool = False) -> None:
        self.app_key = app_key
        self.app_secret = app_secret
        self.is_mock = is_mock
        self._http = httpx.AsyncClient(base_url=KIWOOM_BASE_URL, timeout=30.0)
        self._token_cache_key = f"kiwoom:token:{app_key[:8]}"

    async def _get_access_token(self) -> str:
        redis = await get_redis()
        token = await redis.get(self._token_cache_key)
        if token:
            return token if isinstance(token, str) else token.decode()

        resp = await self._http.post(
            "/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "appkey": self.app_key,
                "secretkey": self.app_secret,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        access_token: str = data["token"]

        await redis.setex(self._token_cache_key, TOKEN_TTL, access_token)
        logger.info("키움 액세스 토큰 발급 완료")
        return access_token

    async def request(
        self,
        method: str,
        path: str,
        tr_id: str,
        params: dict | None = None,
        body: dict | None = None,
    ) -> dict[str, Any]:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "tr_id": tr_id,
            "Content-Type": "application/json;charset=UTF-8",
        }
        resp = await self._http.request(method, path, headers=headers, params=params, json=body)
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        await self._http.aclose()
