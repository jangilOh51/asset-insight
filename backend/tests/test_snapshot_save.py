"""실시간 조회 → DB 저장 동작 검증 테스트.

커버 범위:
  - write_snapshot(): PositionSnapshot + AccountDailySummary 저장 확인
  - 쓰로틀: 10분 이내 재호출 시 저장 스킵
  - force=True: 쓰로틀 무시 (스케줄러 경로)
  - GET /portfolio/realtime: BackgroundTask로 write_snapshot 등록 확인
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from app.models.account_daily_summary import AccountDailySummary
from app.models.broker_account import BrokerAccount
from app.models.position_snapshot import AssetType, PositionSnapshot
from app.services.broker_factory import UnifiedPosition, UnifiedSummary
from app.services.snapshot_writer import write_snapshot
from tests.conftest import make_db_result


# ── 공통 픽스처 ───────────────────────────────────────────────────────────────

def _summary(account_no: str = "5012345678-01") -> UnifiedSummary:
    pos = UnifiedPosition(
        symbol="005930", name="삼성전자",
        market="KR", exchange="KR", currency="KRW",
        quantity=10, avg_cost=70000, current_price=75000,
        avg_cost_native=70000, current_price_native=75000,
        purchase_amount_krw=700_000, eval_amount_krw=750_000,
        profit_loss_krw=50_000, return_pct=7.14, weight_pct=88.2,
    )
    return UnifiedSummary(
        purchase_amount_krw=700_000, eval_amount_krw=750_000,
        profit_loss_krw=50_000, cash_krw=100_000,
        total_asset_krw=850_000, return_pct=7.14,
        positions=[pos],
        account_id="acc-1", account_name="테스트", broker_type="KIS",
    )


def _make_mock_session():
    """AsyncSessionLocal().__aenter__ 가 반환하는 session mock."""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.execute = AsyncMock()
    return session


def _make_session_ctx(session):
    """async with AsyncSessionLocal() as session: 패턴 지원 context manager mock."""
    ctx = AsyncMock()
    ctx.__aenter__ = AsyncMock(return_value=session)
    ctx.__aexit__ = AsyncMock(return_value=False)
    return ctx


# ── write_snapshot — 저장 성공 ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_write_snapshot_saves_position_and_summary():
    """write_snapshot()이 PositionSnapshot + AccountDailySummary를 session.add()로 저장한다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)
    now = datetime(2026, 4, 19, 9, 0, 0, tzinfo=timezone.utc)
    summary = _summary()

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock),
    ):
        result = await write_snapshot("5012345678-01", summary, 1350.0, now=now)

    assert result is True

    added_types = [type(c.args[0]) for c in session.add.call_args_list]
    assert PositionSnapshot in added_types, "PositionSnapshot이 저장되어야 합니다"
    assert AccountDailySummary in added_types, "AccountDailySummary가 저장되어야 합니다"
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_write_snapshot_position_fields():
    """저장된 PositionSnapshot의 필드값이 UnifiedSummary와 일치한다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)
    now = datetime(2026, 4, 19, 9, 0, 0, tzinfo=timezone.utc)
    summary = _summary()

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock),
    ):
        await write_snapshot("5012345678-01", summary, 1350.0, now=now)

    pos_calls = [c for c in session.add.call_args_list if isinstance(c.args[0], PositionSnapshot)]
    assert len(pos_calls) == 1
    snap: PositionSnapshot = pos_calls[0].args[0]

    assert snap.symbol == "005930"
    assert snap.name == "삼성전자"
    assert snap.account_no == "5012345678-01"
    assert snap.market == "KR"
    assert snap.asset_type == AssetType.stock_kr
    assert float(snap.eval_amount_krw) == 750_000
    assert float(snap.profit_loss_krw) == 50_000
    assert float(snap.return_pct) == 7.14
    assert snap.exchange_rate is None          # KRW 종목 → 환율 없음
    assert snap.time == now


@pytest.mark.asyncio
async def test_write_snapshot_summary_fields():
    """저장된 AccountDailySummary의 필드값이 올바르다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)
    now = datetime(2026, 4, 19, 9, 0, 0, tzinfo=timezone.utc)
    summary = _summary()

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock),
    ):
        await write_snapshot("5012345678-01", summary, 1350.0, now=now)

    sum_calls = [c for c in session.add.call_args_list if isinstance(c.args[0], AccountDailySummary)]
    assert len(sum_calls) == 1
    ds: AccountDailySummary = sum_calls[0].args[0]

    assert ds.account_no == "5012345678-01"
    assert float(ds.total_asset_krw) == 850_000
    assert float(ds.cash_krw) == 100_000
    assert ds.position_count == 1
    assert ds.time == now


@pytest.mark.asyncio
async def test_write_snapshot_overseas_position_has_exchange_rate():
    """해외 종목 저장 시 exchange_rate(usd_krw)가 저장된다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)
    now = datetime(2026, 4, 19, 9, 0, 0, tzinfo=timezone.utc)

    us_pos = UnifiedPosition(
        symbol="AAPL", name="Apple Inc.",
        market="US", exchange="NASD", currency="USD",
        quantity=5, avg_cost=150 * 1350, current_price=170 * 1350,
        avg_cost_native=150.0, current_price_native=170.0,
        purchase_amount_krw=150 * 1350 * 5,
        eval_amount_krw=170 * 1350 * 5,
        profit_loss_krw=20 * 1350 * 5,
        return_pct=13.33, weight_pct=100.0,
    )
    us_summary = UnifiedSummary(
        purchase_amount_krw=150 * 1350 * 5,
        eval_amount_krw=170 * 1350 * 5,
        profit_loss_krw=20 * 1350 * 5,
        cash_krw=0, total_asset_krw=170 * 1350 * 5,
        return_pct=13.33, positions=[us_pos],
        account_id="acc-us", account_name="해외계좌", broker_type="KIS",
    )

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock),
    ):
        await write_snapshot("US-ACCOUNT-01", us_summary, 1350.0, now=now)

    pos_calls = [c for c in session.add.call_args_list if isinstance(c.args[0], PositionSnapshot)]
    snap: PositionSnapshot = pos_calls[0].args[0]

    assert snap.currency == "USD"
    assert snap.exchange_rate == 1350.0
    assert snap.exchange_code == "NASD"


# ── 쓰로틀 ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_write_snapshot_throttled_skips_save():
    """10분 이내 재호출 시 저장을 건너뛰고 False를 반환한다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=True),
    ):
        result = await write_snapshot("5012345678-01", _summary(), 1350.0)

    assert result is False
    session.add.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_write_snapshot_force_ignores_throttle():
    """force=True면 쓰로틀이 True여도 강제 저장한다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=True),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock),
    ):
        result = await write_snapshot("5012345678-01", _summary(), 1350.0, force=True)

    assert result is True
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_write_snapshot_sets_throttle_after_save():
    """저장 성공 후 쓰로틀 키가 설정된다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock) as mock_throttle,
    ):
        await write_snapshot("5012345678-01", _summary(), 1350.0)

    mock_throttle.assert_awaited_once_with("5012345678-01")


@pytest.mark.asyncio
async def test_write_snapshot_force_does_not_set_throttle():
    """force=True(스케줄러)는 쓰로틀 키를 설정하지 않는다."""
    session = _make_mock_session()
    ctx = _make_session_ctx(session)

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
        patch("app.services.snapshot_writer._set_throttle", new_callable=AsyncMock) as mock_throttle,
    ):
        await write_snapshot("5012345678-01", _summary(), 1350.0, force=True)

    mock_throttle.assert_not_awaited()


# ── DB 오류 시 graceful ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_write_snapshot_db_error_returns_false():
    """DB 저장 실패 시 예외 대신 False를 반환한다 (API 응답에 영향 없음)."""
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(side_effect=Exception("DB 연결 실패"))
    ctx.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.snapshot_writer.AsyncSessionLocal", return_value=ctx),
        patch("app.services.snapshot_writer.should_throttle", new_callable=AsyncMock, return_value=False),
    ):
        result = await write_snapshot("5012345678-01", _summary(), 1350.0)

    assert result is False


# ── /portfolio/realtime → BackgroundTask 등록 확인 ───────────────────────────

@pytest.mark.asyncio
async def test_realtime_registers_background_save(client, mock_db):
    """GET /portfolio/realtime 성공 시 BackgroundTask에 write_snapshot이 등록된다."""
    acc = BrokerAccount(
        id=str(uuid.uuid4()), broker="한국투자증권", broker_type="KIS",
        account_no="5012345678-01", account_name="테스트",
        app_key="key", app_secret="secret",
        is_mock=True, is_active=True, is_verified=True, display_order=0,
    )
    mock_db.execute.side_effect = [make_db_result(rows=[acc]), make_db_result(rows=[])]
    summary = _summary(acc.id)

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio.fetch_account_balance", new_callable=AsyncMock, return_value=summary),
        patch("app.api.v1.endpoints.portfolio.write_snapshot", new_callable=AsyncMock) as mock_write,
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    assert resp.status_code == 200
    # BackgroundTask가 실행되었음 확인 (httpx AsyncClient는 응답 후 background task 실행)
    mock_write.assert_awaited_once()
    call_kwargs = mock_write.call_args
    assert call_kwargs.args[0] == acc.account_no
    assert call_kwargs.args[1] == summary
    assert call_kwargs.args[2] == 1350.0


@pytest.mark.asyncio
async def test_realtime_no_accounts_no_background_save(client, mock_db):
    """계좌 없음(legacy fallback) 시에는 write_snapshot이 호출되지 않는다."""
    mock_db.execute.return_value = make_db_result(rows=[])

    from app.schemas.portfolio import PortfolioRealtimeResponse, PortfolioSummary
    legacy_resp = PortfolioRealtimeResponse(
        summary=PortfolioSummary(
            purchase_amount_krw=0, eval_amount_krw=0,
            profit_loss_krw=0, return_pct=0, cash_krw=0, total_asset_krw=0,
        ),
        holdings=[], usd_krw=1350.0,
        fetched_at="2026-01-01T00:00:00+00:00",
    )

    with (
        patch("app.api.v1.endpoints.portfolio.get_usd_krw", new_callable=AsyncMock, return_value=1350.0),
        patch("app.api.v1.endpoints.portfolio._legacy_realtime", new_callable=AsyncMock, return_value=legacy_resp),
        patch("app.api.v1.endpoints.portfolio.write_snapshot", new_callable=AsyncMock) as mock_write,
    ):
        resp = await client.get("/api/v1/portfolio/realtime")

    assert resp.status_code == 200
    mock_write.assert_not_awaited()
