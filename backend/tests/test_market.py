"""시황 API 단위 테스트.

커버 엔드포인트:
  GET /api/v1/market/indices
"""

import json
from unittest.mock import AsyncMock, patch

import pytest


MOCK_INDICES = {
    "KOSPI":   {"name": "KOSPI",   "value": 2750.5, "change": 12.3,  "change_pct": 0.45},
    "SP500":   {"name": "S&P 500", "value": 5200.3, "change": -8.2,  "change_pct": -0.16},
    "NASDAQ":  {"name": "NASDAQ",  "value": 16800.0,"change": 45.3,  "change_pct": 0.27},
    "USD_KRW": {"name": "USD/KRW", "value": 1380.5, "change": 2.3,   "change_pct": 0.17},
}


# ── GET /market/indices ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_market_indices_returns_all_keys(client, mock_db):
    with patch(
        "app.api.v1.endpoints.market.get_market_indices",
        new_callable=AsyncMock,
        return_value=MOCK_INDICES,
    ):
        resp = await client.get("/api/v1/market/indices")

    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"KOSPI", "SP500", "NASDAQ", "USD_KRW"}


@pytest.mark.asyncio
async def test_market_indices_fields(client, mock_db):
    with patch(
        "app.api.v1.endpoints.market.get_market_indices",
        new_callable=AsyncMock,
        return_value=MOCK_INDICES,
    ):
        resp = await client.get("/api/v1/market/indices")

    data = resp.json()
    kospi = data["KOSPI"]
    assert kospi["name"] == "KOSPI"
    assert kospi["value"] == 2750.5
    assert kospi["change"] == 12.3
    assert kospi["change_pct"] == 0.45


@pytest.mark.asyncio
async def test_market_indices_allows_null_values(client, mock_db):
    """외부 API 실패 시 value/change/change_pct가 None이어도 200을 반환한다."""
    null_indices = {k: {"name": v["name"], "value": None, "change": None, "change_pct": None}
                    for k, v in MOCK_INDICES.items()}
    with patch(
        "app.api.v1.endpoints.market.get_market_indices",
        new_callable=AsyncMock,
        return_value=null_indices,
    ):
        resp = await client.get("/api/v1/market/indices")

    assert resp.status_code == 200
    assert resp.json()["KOSPI"]["value"] is None


# ── get_market_indices 서비스 단위 테스트 ────────────────────────────────────

@pytest.mark.asyncio
async def test_get_market_indices_uses_cache():
    """Redis 캐시가 있으면 HTTP 요청을 하지 않는다."""
    cached = json.dumps(MOCK_INDICES)
    mock_redis = AsyncMock()
    mock_redis.get.return_value = cached

    with patch("app.services.market.indices.get_redis", new_callable=AsyncMock, return_value=mock_redis):
        from app.services.market.indices import get_market_indices
        result = await get_market_indices()

    assert result["KOSPI"]["value"] == 2750.5
    mock_redis.setex.assert_not_called()


@pytest.mark.asyncio
async def test_get_market_indices_fetches_and_caches():
    """캐시 미스 시 Yahoo Finance 조회 후 Redis에 저장한다."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    from app.services.market.indices import get_market_indices

    with (
        patch("app.services.market.indices.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.services.market.indices._fetch_quote", new_callable=AsyncMock,
              return_value={"value": 2750.5, "change": 12.3, "change_pct": 0.45}),
    ):
        result = await get_market_indices()

    assert "KOSPI" in result
    mock_redis.setex.assert_called_once()


@pytest.mark.asyncio
async def test_get_market_indices_handles_fetch_error():
    """외부 API 실패 시 해당 지수 value=None, 나머지는 정상 반환."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    async def _mock_fetch(symbol: str) -> dict:
        if symbol == "^KS11":
            raise Exception("network error")
        return {"value": 1.0, "change": 0.0, "change_pct": 0.0}

    from app.services.market.indices import get_market_indices

    with (
        patch("app.services.market.indices.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.services.market.indices._fetch_quote", side_effect=_mock_fetch),
    ):
        result = await get_market_indices()

    assert result["KOSPI"]["value"] is None
    assert result["SP500"]["value"] == 1.0
