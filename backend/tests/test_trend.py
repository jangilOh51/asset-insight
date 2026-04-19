"""트렌드 분석 API 단위 테스트.

커버 엔드포인트:
  GET /api/v1/trend/{account_id}
  GET /api/v1/trend/{account_id}/composition
"""

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest


MOCK_TREND = [
    {"date": "2026-04-17", "total_asset_krw": 800000, "return_pct": 5.0},
    {"date": "2026-04-18", "total_asset_krw": 820000, "return_pct": 5.5},
    {"date": "2026-04-19", "total_asset_krw": 850000, "return_pct": 6.0},
]

MOCK_COMPOSITION = [
    {"asset_type": "stock_kr", "value_krw": 600000, "weight_pct": 70.6},
    {"asset_type": "cash_krw", "value_krw": 250000, "weight_pct": 29.4},
]


# ── GET /trend/{account_id} ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_trend_default_period(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_trend",
        new_callable=AsyncMock,
        return_value=MOCK_TREND,
    ) as mock_fn:
        resp = await client.get("/api/v1/trend/test-account")

    assert resp.status_code == 200
    assert resp.json() == MOCK_TREND
    # 기본값 daily, limit=90
    mock_fn.assert_awaited_once()
    _, kwargs = mock_fn.call_args
    assert kwargs.get("bucket") == "1 day"
    assert kwargs.get("limit") == 90


@pytest.mark.asyncio
async def test_get_trend_weekly(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_trend",
        new_callable=AsyncMock,
        return_value=[],
    ) as mock_fn:
        resp = await client.get("/api/v1/trend/test-account?period=weekly")

    assert resp.status_code == 200
    _, kwargs = mock_fn.call_args
    assert kwargs.get("bucket") == "1 week"


@pytest.mark.asyncio
async def test_get_trend_monthly(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_trend",
        new_callable=AsyncMock,
        return_value=[],
    ) as mock_fn:
        resp = await client.get("/api/v1/trend/test-account?period=monthly")

    assert resp.status_code == 200
    _, kwargs = mock_fn.call_args
    assert kwargs.get("bucket") == "1 month"


@pytest.mark.asyncio
async def test_get_trend_invalid_period(client):
    resp = await client.get("/api/v1/trend/test-account?period=yearly")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_trend_custom_limit(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_trend",
        new_callable=AsyncMock,
        return_value=[],
    ) as mock_fn:
        resp = await client.get("/api/v1/trend/test-account?limit=30")

    assert resp.status_code == 200
    _, kwargs = mock_fn.call_args
    assert kwargs.get("limit") == 30


@pytest.mark.asyncio
async def test_get_trend_limit_validation(client):
    resp = await client.get("/api/v1/trend/test-account?limit=0")
    assert resp.status_code == 422

    resp = await client.get("/api/v1/trend/test-account?limit=400")
    assert resp.status_code == 422


# ── GET /trend/{account_id}/composition ──────────────────────────────────────

@pytest.mark.asyncio
async def test_get_composition(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_composition",
        new_callable=AsyncMock,
        return_value=MOCK_COMPOSITION,
    ):
        resp = await client.get("/api/v1/trend/test-account/composition")

    assert resp.status_code == 200
    assert resp.json() == MOCK_COMPOSITION


@pytest.mark.asyncio
async def test_get_composition_with_date(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_composition",
        new_callable=AsyncMock,
        return_value=MOCK_COMPOSITION,
    ) as mock_fn:
        resp = await client.get(
            "/api/v1/trend/test-account/composition?as_of=2026-04-19"
        )

    assert resp.status_code == 200
    _, kwargs = mock_fn.call_args
    assert kwargs.get("as_of") == date(2026, 4, 19)


@pytest.mark.asyncio
async def test_get_composition_empty(client):
    with patch(
        "app.api.v1.endpoints.trend.get_asset_composition",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.get("/api/v1/trend/test-account/composition")

    assert resp.status_code == 200
    assert resp.json() == []
