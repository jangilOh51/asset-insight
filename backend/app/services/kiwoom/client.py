"""키움증권 OpenAPI+ REST 클라이언트.

REST 방식 사용 (COM/OCX 방식 미지원).
- 실전/모의 공통 Base URL: https://openapi.kiwoom.com:9443
- 문서: https://openapi.kiwoom.com/apiService/main
"""

import logging
from typing import Any

import httpx

from app.core.redis import get_redis

logger = logging.getLogger(__name__)

KIWOOM_BASE_URL = "https://openapi.kiwoom.com:9443"
TOKEN_TTL = 86100  # 23시간 55분 (24시간 만료 5분 전 갱신)


class KiwoomClient:
    def __init__(self, app_key: str, app_secret: str, is_mock: bool = False) -> None:
        self.app_key = app_key
        self.app_secret = app_secret
        self.is_mock = is_mock
        self._http = httpx.AsyncClient(base_url=KIWOOM_BASE_URL, timeout=30.0)
        # 모의/실전을 키 앞 8자리로 구분하여 캐시 분리
        mock_tag = "mock" if is_mock else "real"
        self._token_cache_key = f"kiwoom:token:{mock_tag}:{app_key[:8]}"

    async def _get_access_token(self) -> str:
        redis = await get_redis()
        cached = await redis.get(self._token_cache_key)
        if cached:
            return cached if isinstance(cached, str) else cached.decode()

        resp = await self._http.post(
            "/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "appkey": self.app_key,
                "secretkey": self.app_secret,
            },
        )
        resp.raise_for_status()
        body = resp.json()

        # 키움 응답 필드: "token" (일부 버전은 "access_token")
        token: str = body.get("token") or body.get("access_token") or ""
        if not token:
            raise RuntimeError(f"키움 토큰 발급 실패: 응답에 token 없음 → {body}")

        await redis.setex(self._token_cache_key, TOKEN_TTL, token)
        logger.info("키움 액세스 토큰 발급 완료 (mock=%s)", self.is_mock)
        return token

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
