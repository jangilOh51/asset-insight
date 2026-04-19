"""스냅샷 조회 API 단위 테스트.

커버 엔드포인트:
  GET  /api/v1/snapshot/summary/{account_no}
  GET  /api/v1/snapshot/positions/{account_no}
  POST /api/v1/snapshot/run
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.account_daily_summary import AccountDailySummary
from app.models.position_snapshot import AssetType, PositionSnapshot
from tests.conftest import make_db_result


def _make_summary_row(account_no: str = "5012345678-01") -> AccountDailySummary:
    row = MagicMock(spec=AccountDailySummary)
    row.time = datetime(2026, 4, 19, 9, 0, tzinfo=timezone.utc)
    row.account_no = account_no
    row.purchase_amount_krw = Decimal("1000000")
    row.eval_amount_krw = Decimal("1050000")
    row.profit_loss_krw = Decimal("50000")
    row.return_pct = Decimal("5.0")
    row.cash_krw = Decimal("200000")
    row.total_asset_krw = Decimal("1250000")
    row.position_count = 3
    return row


def _make_position_row(account_no: str = "5012345678-01") -> PositionSnapshot:
    row = MagicMock(spec=PositionSnapshot)
    row.time = datetime(2026, 4, 19, 9, 0, tzinfo=timezone.utc)
    row.account_no = account_no
    row.symbol = "005930"
    row.name = "삼성전자"
    row.market = "KR"
    row.asset_type = AssetType.stock_kr
    row.currency = "KRW"
    row.quantity = Decimal("10")
    row.available_qty = Decimal("10")
    row.avg_cost = Decimal("70000")
    row.current_price = Decimal("75000")
    row.purchase_amount_krw = Decimal("700000")
    row.eval_amount_krw = Decimal("750000")
    row.profit_loss_krw = Decimal("50000")
    row.return_pct = Decimal("7.14")
    row.exchange_rate = None
    row.exchange_code = "KR"
    return row


# ── GET /snapshot/summary ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_summary_empty(client):
    resp = await client.get("/api/v1/snapshot/summary/5012345678-01")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_summary_returns_rows(client, mock_db):
    row = _make_summary_row()
    mock_db.execute.return_value = make_db_result(rows=[row])

    resp = await client.get("/api/v1/snapshot/summary/5012345678-01")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["date"] == "2026-04-19"
    assert data[0]["eval_amount_krw"] == 1050000.0
    assert data[0]["position_count"] == 3


@pytest.mark.asyncio
async def test_get_summary_date_filter(client):
    resp = await client.get(
        "/api/v1/snapshot/summary/5012345678-01?from=2026-01-01&to=2026-04-19"
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_summary_limit_validation(client):
    # limit 최대 365
    resp = await client.get("/api/v1/snapshot/summary/5012345678-01?limit=1000")
    assert resp.status_code == 422

    # limit 최소 1
    resp = await client.get("/api/v1/snapshot/summary/5012345678-01?limit=0")
    assert resp.status_code == 422


# ── GET /snapshot/positions ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_positions_empty_no_latest(client):
    # 최신 날짜도 없으면 빈 배열 반환
    resp = await client.get("/api/v1/snapshot/positions/5012345678-01")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_positions_with_date(client, mock_db):
    row = _make_position_row()
    mock_db.execute.return_value = make_db_result(rows=[row])

    resp = await client.get(
        "/api/v1/snapshot/positions/5012345678-01?date=2026-04-19"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["symbol"] == "005930"
    assert data[0]["market"] == "KR"
    assert data[0]["quantity"] == 10.0


@pytest.mark.asyncio
async def test_get_positions_market_filter(client):
    resp = await client.get(
        "/api/v1/snapshot/positions/5012345678-01?date=2026-04-19&market=KR"
    )
    assert resp.status_code == 200


# ── POST /snapshot/run ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_snapshot_success(client):
    with patch(
        "app.api.v1.endpoints.snapshot.save_daily_snapshot",
        new_callable=AsyncMock,
    ):
        resp = await client.post("/api/v1/snapshot/run")

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_run_snapshot_failure_returns_500(client):
    with patch(
        "app.api.v1.endpoints.snapshot.save_daily_snapshot",
        new_callable=AsyncMock,
        side_effect=Exception("KIS 연결 오류"),
    ):
        resp = await client.post("/api/v1/snapshot/run")

    assert resp.status_code == 500
    assert "KIS 연결 오류" in resp.json()["detail"]
