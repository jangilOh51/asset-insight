"""KIS 실시간 잔고 API 단위 테스트 (legacy realtime 엔드포인트).

커버 엔드포인트:
  GET /api/v1/realtime/balance/domestic
  GET /api/v1/realtime/balance/overseas
"""

from dataclasses import dataclass, field
from unittest.mock import AsyncMock, patch

import pytest

from app.services.kis.domestic import DomesticPosition, DomesticSummary
from app.services.kis.overseas import OverseasPosition, OverseasSummary


def _make_domestic_summary(with_positions: bool = True) -> DomesticSummary:
    positions = []
    if with_positions:
        positions = [DomesticPosition(
            symbol="005930", name="삼성전자",
            quantity=10, available_qty=10,
            avg_cost=70000, current_price=75000,
            purchase_amount_krw=700000, eval_amount_krw=750000,
            profit_loss_krw=50000, return_pct=7.14,
        )]
    return DomesticSummary(
        purchase_amount_krw=700000,
        eval_amount_krw=750000,
        profit_loss_krw=50000,
        cash_krw=100000,
        total_asset_krw=850000,
        positions=positions,
    )


def _make_overseas_summary() -> OverseasSummary:
    positions = [OverseasPosition(
        symbol="AAPL", name="Apple Inc.",
        exchange_code="NASD", currency="USD",
        quantity=5, available_qty=5,
        avg_cost=170.0, current_price=180.0,
        purchase_amount_foreign=850.0, eval_amount_foreign=900.0,
        profit_loss_foreign=50.0, return_pct=5.88,
    )]
    return OverseasSummary(
        exchange_code="NASD",
        currency="USD",
        positions=positions,
    )


# ── GET /realtime/balance/domestic ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_domestic_balance_success(client):
    summary = _make_domestic_summary()
    with patch(
        "app.api.v1.endpoints.realtime.get_domestic_balance",
        new_callable=AsyncMock,
        return_value=summary,
    ):
        resp = await client.get("/api/v1/realtime/balance/domestic")

    assert resp.status_code == 200
    data = resp.json()
    assert data["eval_amount_krw"] == 750000.0
    assert data["cash_krw"] == 100000.0
    assert len(data["positions"]) == 1
    assert data["positions"][0]["symbol"] == "005930"


@pytest.mark.asyncio
async def test_domestic_balance_empty_positions(client):
    summary = _make_domestic_summary(with_positions=False)
    with patch(
        "app.api.v1.endpoints.realtime.get_domestic_balance",
        new_callable=AsyncMock,
        return_value=summary,
    ):
        resp = await client.get("/api/v1/realtime/balance/domestic")

    assert resp.status_code == 200
    assert resp.json()["positions"] == []


# ── GET /realtime/balance/overseas ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_overseas_balance_success(client):
    summary = _make_overseas_summary()
    with patch(
        "app.api.v1.endpoints.realtime.get_overseas_balance",
        new_callable=AsyncMock,
        return_value=summary,
    ):
        resp = await client.get("/api/v1/realtime/balance/overseas?exchange=NASD")

    assert resp.status_code == 200
    data = resp.json()
    assert data["exchange_code"] == "NASD"
    assert len(data["positions"]) == 1
    assert data["positions"][0]["symbol"] == "AAPL"


@pytest.mark.asyncio
async def test_overseas_balance_invalid_exchange(client):
    resp = await client.get("/api/v1/realtime/balance/overseas?exchange=TOKYO")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_overseas_balance_nyse(client):
    summary = OverseasSummary(exchange_code="NYSE", currency="USD", positions=[])
    with patch(
        "app.api.v1.endpoints.realtime.get_overseas_balance",
        new_callable=AsyncMock,
        return_value=summary,
    ):
        resp = await client.get("/api/v1/realtime/balance/overseas?exchange=NYSE")
    assert resp.status_code == 200
