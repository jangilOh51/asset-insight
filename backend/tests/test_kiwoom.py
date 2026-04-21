"""키움증권 연동 단위 테스트.

커버 범위:
  - KiwoomClient 토큰 발급 (캐시 히트/미스, 응답 필드 변형)
  - get_kiwoom_balance (정상, API 오류, rt_cd 비정상, 예외)
  - broker_factory._fetch_kiwoom (UnifiedSummary 변환, day_change_pct 전달)
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.kiwoom.balance import KiwoomPosition, KiwoomSummary, get_kiwoom_balance
from app.services.kiwoom.client import KiwoomClient


# ── fixtures ──────────────────────────────────────────────────────────────────

def _make_kiwoom_client(is_mock: bool = False) -> KiwoomClient:
    return KiwoomClient(app_key="test_app_key_1234", app_secret="test_secret", is_mock=is_mock)


def _make_balance_response(positions: list[dict] | None = None) -> dict:
    """정상 키움 잔고 응답 픽스처."""
    if positions is None:
        positions = [
            {
                "pdno": "005930",
                "prdt_name": "삼성전자",
                "hldg_qty": "10",
                "pchs_avg_pric": "70000",
                "prpr": "75000",
                "pchs_amt": "700000",
                "evlu_amt": "750000",
                "evlu_pfls_amt": "50000",
                "evlu_pfls_rt": "7.14",
                "prdy_ctrt": "1.35",   # 전일대비 등락률
            }
        ]
    return {
        "rt_cd": "0",
        "msg_cd": "KIOK0000",
        "msg1": "정상처리",
        "output1": positions,
        "output2": [
            {
                "pchs_amt_smtl_amt": "700000",
                "evlu_amt_smtl_amt": "750000",
                "evlu_pfls_smtl_amt": "50000",
                "dnca_tot_amt": "100000",
            }
        ],
    }


# ── KiwoomClient 토큰 발급 ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_kiwoom_client_token_cache_miss():
    """캐시 미스 시 /oauth2/token 호출하고 Redis에 저장."""
    client = _make_kiwoom_client()
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None  # 캐시 미스

    mock_http_resp = MagicMock()
    mock_http_resp.raise_for_status = MagicMock()
    mock_http_resp.json.return_value = {"token_type": "Bearer", "token": "test_token_abc", "expires_in": 86400}

    with (
        patch("app.services.kiwoom.client.get_redis", return_value=mock_redis),
        patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_http_resp),
    ):
        token = await client._get_access_token()

    assert token == "test_token_abc"
    mock_redis.setex.assert_called_once()
    call_args = mock_redis.setex.call_args
    assert call_args[0][1] == 86100   # TOKEN_TTL


@pytest.mark.asyncio
async def test_kiwoom_client_token_cache_hit():
    """캐시 히트 시 HTTP 호출 없이 cached 토큰 반환."""
    client = _make_kiwoom_client()
    mock_redis = AsyncMock()
    mock_redis.get.return_value = "cached_token_xyz"

    with (
        patch("app.services.kiwoom.client.get_redis", return_value=mock_redis),
        patch.object(client._http, "post", new_callable=AsyncMock) as mock_post,
    ):
        token = await client._get_access_token()

    assert token == "cached_token_xyz"
    mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_kiwoom_client_token_access_token_field():
    """응답 필드가 'access_token'인 경우도 정상 처리."""
    client = _make_kiwoom_client()
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"token_type": "Bearer", "access_token": "alt_token", "expires_in": 86400}

    with (
        patch("app.services.kiwoom.client.get_redis", return_value=mock_redis),
        patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp),
    ):
        token = await client._get_access_token()

    assert token == "alt_token"


@pytest.mark.asyncio
async def test_kiwoom_client_token_missing_raises():
    """응답에 token/access_token 없으면 RuntimeError."""
    client = _make_kiwoom_client()
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"error": "invalid_client"}

    with (
        patch("app.services.kiwoom.client.get_redis", return_value=mock_redis),
        patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp),
        pytest.raises(RuntimeError, match="token"),
    ):
        await client._get_access_token()


# ── get_kiwoom_balance ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_kiwoom_balance_success():
    """정상 응답 → KiwoomSummary 반환, day_change_pct 포함."""
    client = _make_kiwoom_client(is_mock=False)
    mock_response = _make_balance_response()

    with patch.object(client, "request", new_callable=AsyncMock, return_value=mock_response):
        summary = await get_kiwoom_balance(client, "5012345678-01")

    assert summary.eval_amount_krw == 750000
    assert summary.purchase_amount_krw == 700000
    assert summary.profit_loss_krw == 50000
    assert summary.cash_krw == 100000
    assert summary.total_asset_krw == 850000
    assert len(summary.positions) == 1

    pos = summary.positions[0]
    assert pos.symbol == "005930"
    assert pos.name == "삼성전자"
    assert pos.quantity == 10
    assert pos.avg_cost == 70000
    assert pos.current_price == 75000
    assert pos.day_change_pct == pytest.approx(1.35)


@pytest.mark.asyncio
async def test_get_kiwoom_balance_uses_correct_tr_id():
    """실전 계좌는 JTCE5005R, 모의 계좌는 VTCE5005R 사용."""
    for is_mock, expected_tr in [(False, "JTCE5005R"), (True, "VTCE5005R")]:
        client = _make_kiwoom_client(is_mock=is_mock)
        captured = {}

        async def fake_request(method, path, tr_id, body=None, **kw):
            captured["tr_id"] = tr_id
            return _make_balance_response()

        with patch.object(client, "request", side_effect=fake_request):
            await get_kiwoom_balance(client, "5012345678-01")

        assert captured["tr_id"] == expected_tr, f"is_mock={is_mock} → expected {expected_tr}"


@pytest.mark.asyncio
async def test_get_kiwoom_balance_rt_cd_error():
    """rt_cd != '0' → 빈 KiwoomSummary 반환 (서비스 중단 없음)."""
    client = _make_kiwoom_client()
    error_resp = {"rt_cd": "1", "msg_cd": "KIEE9999", "msg1": "인증 오류"}

    with patch.object(client, "request", new_callable=AsyncMock, return_value=error_resp):
        summary = await get_kiwoom_balance(client, "5012345678-01")

    assert summary.total_asset_krw == 0
    assert summary.positions == []


@pytest.mark.asyncio
async def test_get_kiwoom_balance_network_exception():
    """네트워크 예외 → 빈 KiwoomSummary 반환 (서비스 중단 없음)."""
    client = _make_kiwoom_client()

    with patch.object(client, "request", new_callable=AsyncMock, side_effect=Exception("connection timeout")):
        summary = await get_kiwoom_balance(client, "5012345678-01")

    assert summary.total_asset_krw == 0
    assert summary.positions == []


@pytest.mark.asyncio
async def test_get_kiwoom_balance_zero_quantity_filtered():
    """보유수량 0인 종목은 positions에서 제외."""
    client = _make_kiwoom_client()
    positions_with_zero = [
        {"pdno": "005930", "prdt_name": "삼성전자", "hldg_qty": "0",
         "pchs_avg_pric": "70000", "prpr": "75000",
         "pchs_amt": "0", "evlu_amt": "0", "evlu_pfls_amt": "0",
         "evlu_pfls_rt": "0", "prdy_ctrt": "0"},
    ]
    resp = _make_balance_response(positions=positions_with_zero)

    with patch.object(client, "request", new_callable=AsyncMock, return_value=resp):
        summary = await get_kiwoom_balance(client, "5012345678-01")

    assert summary.positions == []


@pytest.mark.asyncio
async def test_get_kiwoom_balance_account_no_without_dash():
    """계좌번호에 '-' 없어도 정상 처리 (기본 상품코드 '01')."""
    client = _make_kiwoom_client()
    captured = {}

    async def fake_request(method, path, tr_id, body=None, **kw):
        captured["body"] = body
        return _make_balance_response()

    with patch.object(client, "request", side_effect=fake_request):
        await get_kiwoom_balance(client, "5012345678")

    assert captured["body"]["CANO"] == "5012345678"
    assert captured["body"]["ACNT_PRDT_CD"] == "01"


# ── broker_factory._fetch_kiwoom ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_kiwoom_unified_summary():
    """_fetch_kiwoom → UnifiedSummary 변환, day_change_pct 포함 확인."""
    from app.models.broker_account import BrokerAccount
    from app.services.broker_factory import _fetch_kiwoom
    from app.services.kiwoom.balance import KiwoomPosition, KiwoomSummary

    acc = MagicMock(spec=BrokerAccount)
    acc.id = str(uuid.uuid4())
    acc.account_no = "5012345678-01"
    acc.account_name = "키움 테스트"
    acc.broker_type = "KIWOOM"
    acc.app_key = "my_key"
    acc.app_secret = "my_secret"
    acc.is_mock = False

    mock_summary = KiwoomSummary(
        purchase_amount_krw=700000,
        eval_amount_krw=750000,
        profit_loss_krw=50000,
        cash_krw=100000,
        total_asset_krw=850000,
        positions=[
            KiwoomPosition(
                symbol="005930", name="삼성전자",
                quantity=10, avg_cost=70000, current_price=75000,
                purchase_amount_krw=700000, eval_amount_krw=750000,
                profit_loss_krw=50000, return_pct=7.14,
                day_change_pct=1.35,
            )
        ],
    )

    mock_client_instance = MagicMock()
    mock_client_instance.close = AsyncMock()
    mock_client_cls = MagicMock(return_value=mock_client_instance)

    with (
        patch("app.services.kiwoom.client.KiwoomClient", mock_client_cls),
        patch("app.services.kiwoom.balance.get_kiwoom_balance", new_callable=AsyncMock, return_value=mock_summary),
    ):
        unified = await _fetch_kiwoom(acc)

    assert unified.eval_amount_krw == 750000
    assert unified.cash_krw == 100000
    assert len(unified.positions) == 1
    pos = unified.positions[0]
    assert pos.symbol == "005930"
    assert pos.market == "KR"
    assert pos.currency == "KRW"
    assert pos.day_change_pct == pytest.approx(1.35)
    assert pos.weight_pct == pytest.approx(100.0 * 750000 / 850000, rel=1e-2)


@pytest.mark.asyncio
async def test_fetch_kiwoom_uses_env_key_when_account_key_empty():
    """계좌별 API 키 없으면 환경변수 전역 키 사용."""
    from app.models.broker_account import BrokerAccount
    from app.services.broker_factory import _fetch_kiwoom
    from app.services.kiwoom.balance import KiwoomSummary

    acc = MagicMock(spec=BrokerAccount)
    acc.id = str(uuid.uuid4())
    acc.account_no = "5012345678-01"
    acc.account_name = "키움 env 계좌"
    acc.broker_type = "KIWOOM"
    acc.app_key = ""       # 계좌별 키 없음
    acc.app_secret = ""
    acc.is_mock = False

    empty_summary = KiwoomSummary(
        purchase_amount_krw=0, eval_amount_krw=0,
        profit_loss_krw=0, cash_krw=0, total_asset_krw=0,
    )

    captured = {}

    def fake_client(app_key, app_secret, is_mock):
        captured["app_key"] = app_key
        m = MagicMock()
        m.close = AsyncMock()
        return m

    with (
        patch("app.services.kiwoom.client.KiwoomClient", side_effect=fake_client),
        patch("app.services.kiwoom.balance.get_kiwoom_balance", new_callable=AsyncMock, return_value=empty_summary),
        patch("app.core.config.settings") as mock_settings,
    ):
        mock_settings.kiwoom_app_key = "global_env_key"
        mock_settings.kiwoom_app_secret = "global_env_secret"
        mock_settings.kiwoom_mock = False
        await _fetch_kiwoom(acc)

    assert captured["app_key"] == "global_env_key"
