"""포트폴리오 실시간 조회 API 단위 테스트.

커버 엔드포인트:
  GET /api/v1/portfolio/realtime
  GET /api/v1/portfolio/realtime?account_id=xxx
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

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
    # 1: accounts, 2: custom_assets, 3: snapshot fallback(day_change)
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[]), make_db_result(rows=[])]
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
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[]), make_db_result(rows=[])]
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
    mock_db.execute.side_effect = [make_db_result(rows=[acc1, acc2]), make_db_result(rows=[]), make_db_result(rows=[])]

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
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[]), make_db_result(rows=[])]
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
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[]), make_db_result(rows=[])]
    summary = _make_summary(acc.id)

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    data = resp.json()
    # 50000 / 700000 * 100 ≈ 7.1429
    assert abs(data["summary"]["return_pct"] - 7.1429) < 0.01


@pytest.mark.asyncio
async def test_realtime_custom_assets_included(client, mock_db):
    """수동 자산 금액이 total_asset_krw에 합산된다."""
    from app.models.custom_asset import CustomAsset
    from decimal import Decimal

    acc = _make_account()
    custom = MagicMock(spec=CustomAsset)
    custom.is_active = True
    custom.current_value_krw = Decimal("500000")

    mock_db.execute.side_effect = [
        make_db_result(rows=[acc]),
        make_db_result(rows=[custom]),
        make_db_result(rows=[]),  # snapshot fallback
    ]
    summary = _make_summary(acc.id)

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    data = resp.json()
    # total = eval(750000) + cash(100000) + custom(500000) = 1350000
    assert data["summary"]["total_asset_krw"] == 1350000
    assert data["summary"]["custom_asset_krw"] == 500000


@pytest.mark.asyncio
async def test_realtime_env_kis_id_uses_legacy(client, mock_db):
    """account_id='env-kis' 요청은 legacy 경로를 타야 한다."""
    from app.schemas.portfolio import PortfolioRealtimeResponse, PortfolioSummary

    mock_db.execute.return_value = make_db_result(rows=[])

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio._legacy_realtime", new_callable=AsyncMock) as mock_legacy,
    ):
        mock_legacy.return_value = PortfolioRealtimeResponse(
            summary=PortfolioSummary(
                purchase_amount_krw=0, eval_amount_krw=0,
                profit_loss_krw=0, return_pct=0, cash_krw=0, total_asset_krw=0,
            ),
            holdings=[],
            usd_krw=1350.0,
            fetched_at="2026-01-01T00:00:00+00:00",
        )
        resp = await client.get("/api/v1/portfolio/realtime?account_id=env-kis")

    assert resp.status_code == 200
    mock_legacy.assert_awaited_once_with(1350.0)


@pytest.mark.asyncio
async def test_realtime_zero_purchase_no_division_error(client, mock_db):
    """매수금액이 0일 때 return_pct가 0.0으로 안전하게 반환된다."""
    acc = _make_account()
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[]), make_db_result(rows=[])]

    zero_summary = UnifiedSummary(
        purchase_amount_krw=0,
        eval_amount_krw=0,
        profit_loss_krw=0,
        cash_krw=100000,
        total_asset_krw=100000,
        return_pct=0.0,
        positions=[],
        account_id=acc.id,
        account_name="테스트",
        broker_type="KIS",
    )

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=zero_summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    assert resp.status_code == 200
    assert resp.json()["summary"]["return_pct"] == 0.0


@pytest.mark.asyncio
async def test_realtime_snapshot_fallback_fills_day_change(client, mock_db):
    """day_change_pct==0인 종목은 스냅샷 2개로 등락률을 계산한다."""
    from unittest.mock import MagicMock
    from decimal import Decimal

    acc = _make_account()
    # 스냅샷: symbol=005930, 오늘가=75000, 어제가=72000 → (75000-72000)/72000*100 ≈ 4.17%
    snap_today = MagicMock()
    snap_today.symbol = "005930"
    snap_today.current_price = Decimal("75000")
    snap_today.rn = 1
    snap_yesterday = MagicMock()
    snap_yesterday.symbol = "005930"
    snap_yesterday.current_price = Decimal("72000")
    snap_yesterday.rn = 2

    mock_db.execute.side_effect = [
        make_db_result(rows=[acc]),         # accounts
        make_db_result(rows=[]),            # custom_assets
        make_db_result(rows=[snap_today, snap_yesterday]),  # snapshot fallback
    ]

    # summary의 holdings에는 day_change_pct=0.0으로 세팅
    summary = _make_summary(acc.id)
    summary.positions[0].day_change_pct = 0.0

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    assert resp.status_code == 200
    data = resp.json()
    holding = data["holdings"][0]
    assert holding["day_change_source"] == "snapshot"
    assert abs(holding["day_change_pct"] - 4.17) < 0.01


@pytest.mark.asyncio
async def test_realtime_snapshot_fallback_skipped_when_live_has_change(client, mock_db):
    """day_change_pct가 이미 0이 아니면 스냅샷 fallback을 사용하지 않는다."""
    acc = _make_account()
    mock_db.execute.side_effect = [
        make_db_result(rows=[acc]),
        make_db_result(rows=[]),
        make_db_result(rows=[]),
    ]

    summary = _make_summary(acc.id)
    summary.positions[0].day_change_pct = 2.5  # 이미 live 데이터 있음

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    data = resp.json()
    holding = data["holdings"][0]
    assert holding["day_change_pct"] == 2.5
    assert holding["day_change_source"] == "live"
