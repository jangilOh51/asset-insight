"""포트폴리오 실시간 조회 API 단위 테스트.

커버 엔드포인트:
  GET /api/v1/portfolio/realtime
  GET /api/v1/portfolio/realtime?account_id=xxx
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.models.broker_account import BrokerAccount
from app.services.broker_factory import UnifiedPosition, UnifiedSummary
from tests.conftest import make_db_result


def _make_account(**kwargs) -> BrokerAccount:
    acc = BrokerAccount(
        id=kwargs.get("id", str(uuid.uuid4())),
        broker="한국투자증권",
        broker_type="KIS",
        account_no=kwargs.get("account_no", "5012345678-01"),
        account_name=kwargs.get("account_name", "테스트"),
        app_key="key",
        app_secret="secret",
        is_mock=True,
        is_active=True,
        is_verified=True,
        display_order=0,
    )
    return acc


def _make_summary(account_id: str = "acc-1") -> UnifiedSummary:
    pos = UnifiedPosition(
        symbol="005930",
        name="삼성전자",
        market="KR",
        exchange="KR",
        currency="KRW",
        quantity=10,
        avg_cost=70000,
        current_price=75000,
        avg_cost_native=70000,
        current_price_native=75000,
        purchase_amount_krw=700000,
        eval_amount_krw=750000,
        profit_loss_krw=50000,
        return_pct=7.14,
        weight_pct=80.0,
    )
    return UnifiedSummary(
        purchase_amount_krw=700000,
        eval_amount_krw=750000,
        profit_loss_krw=50000,
        cash_krw=100000,
        total_asset_krw=850000,
        return_pct=7.14,
        positions=[pos],
        account_id=account_id,
        account_name="테스트",
        broker_type="KIS",
    )


# ── DB 계좌 없음 → legacy fallback ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_realtime_no_accounts_falls_back_to_legacy(client, mock_db):
    mock_db.execute.return_value = make_db_result(rows=[])

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio._legacy_realtime", new_callable=AsyncMock) as mock_legacy,
    ):
        from app.schemas.portfolio import PortfolioRealtimeResponse, PortfolioSummary
        mock_legacy.return_value = PortfolioRealtimeResponse(
            summary=PortfolioSummary(
                purchase_amount_krw=0, eval_amount_krw=0,
                profit_loss_krw=0, return_pct=0, cash_krw=0, total_asset_krw=0,
            ),
            holdings=[],
            usd_krw=1350.0,
            fetched_at="2026-01-01T00:00:00+00:00",
        )
        resp = await client.get("/api/v1/portfolio/realtime")

    assert resp.status_code == 200
    mock_legacy.assert_awaited_once_with(1350.0)


# ── DB 계좌 있음 → 정상 집계 ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_realtime_with_accounts_returns_aggregated(client, mock_db):
    acc = _make_account()
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[])]
    summary = _make_summary(acc.id)

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    assert resp.status_code == 200
    data = resp.json()
    assert data["usd_krw"] == 1350.0
    assert data["summary"]["eval_amount_krw"] == 750000
    assert data["summary"]["cash_krw"] == 100000
    assert data["summary"]["total_asset_krw"] == 850000
    assert len(data["holdings"]) == 1
    assert data["holdings"][0]["symbol"] == "005930"


@pytest.mark.asyncio
async def test_realtime_holdings_weight_calculated(client, mock_db):
    acc = _make_account()
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[])]
    summary = _make_summary(acc.id)

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    data = resp.json()
    weight = data["holdings"][0]["weight_pct"]
    # 750000 / 850000 * 100 ≈ 88.24
    assert 88 <= weight <= 89


@pytest.mark.asyncio
async def test_realtime_multiple_accounts_merged(client, mock_db):
    acc1 = _make_account(id="id-1", account_no="001-01")
    acc2 = _make_account(id="id-2", account_no="002-01")
    mock_db.execute.side_effect = [make_db_result(rows=[acc1, acc2]), make_db_result(rows=[])]

    summary1 = _make_summary("id-1")
    summary2 = UnifiedSummary(
        purchase_amount_krw=300000,
        eval_amount_krw=320000,
        profit_loss_krw=20000,
        cash_krw=50000,
        total_asset_krw=370000,
        return_pct=6.67,
        positions=[],
        account_id="id-2",
        account_name="계좌2",
        broker_type="KIS",
    )

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, side_effect=[summary1, summary2]),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    data = resp.json()
    # 두 계좌 합산
    assert data["summary"]["eval_amount_krw"] == 750000 + 320000
    assert data["summary"]["cash_krw"] == 100000 + 50000


@pytest.mark.asyncio
async def test_realtime_filter_by_account_id(client, mock_db):
    acc = _make_account(id="specific-id", account_no="5012345678-01")
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[])]
    summary = _make_summary("specific-id")

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime?account_id=specific-id")

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_realtime_return_pct_calculated(client, mock_db):
    acc = _make_account()
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[])]
    summary = _make_summary(acc.id)

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    data = resp.json()
    # 50000 / 700000 * 100 ≈ 7.1429
    assert abs(data["summary"]["return_pct"] - 7.1429) < 0.01
