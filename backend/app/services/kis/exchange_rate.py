"""환율 조회 서비스. USD/KRW 기준."""

import logging

import httpx

from app.core.redis import get_redis

logger = logging.getLogger(__name__)

REDIS_KEY = "exchange_rate:usd_krw"
CACHE_TTL = 3600  # 1시간


async def get_usd_krw() -> float:
    """USD/KRW 환율 조회. Redis 캐시 우선, 만료 시 open.er-api.com에서 갱신."""
    redis = await get_redis()
    cached = await redis.get(REDIS_KEY)
    if cached:
        return float(cached)

    rate = await _fetch_from_api()
    await redis.setex(REDIS_KEY, CACHE_TTL, str(rate))
    logger.info("환율 갱신: USD/KRW = %.2f", rate)
    return rate


async def _fetch_from_api() -> float:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://open.er-api.com/v6/latest/USD")
            resp.raise_for_status()
            data = resp.json()
            return float(data["rates"]["KRW"])
    except Exception:
        logger.warning("환율 API 조회 실패, 기본값 1380.0 사용")
        return 1380.0
