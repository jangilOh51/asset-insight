"""AI 월간 리포트 API 단위 테스트.

커버 엔드포인트:
  POST /api/v1/report/monthly
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.portfolio import HoldingItem, PortfolioSummary


# ── fixtures ─────────────────────────────────────────────────────────────────

MOCK_HOLDINGS = [
    HoldingItem(
        symbol="005930",
        name="삼성전자",
        market="KR",
        exchange="KRX",
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
        day_change_pct=1.2,
        weight_pct=75.0,
    ),
    HoldingItem(
        symbol="AAPL",
        name="Apple Inc.",
        market="US",
        exchange="NASD",
        currency="USD",
        quantity=1,
        avg_cost=250000,
        current_price=270000,
        avg_cost_native=180.0,
        current_price_native=195.0,
        purchase_amount_krw=250000,
        eval_amount_krw=270000,
        profit_loss_krw=20000,
        return_pct=8.0,
        day_change_pct=-0.5,
        weight_pct=25.0,
    ),
]

MOCK_SUMMARY = PortfolioSummary(
    purchase_amount_krw=950000,
    eval_amount_krw=1020000,
    profit_loss_krw=70000,
    return_pct=7.37,
    cash_krw=100000,
    total_asset_krw=1120000,
    custom_asset_krw=0,
)

MOCK_REPORT_CONTENT = """## 1. 월간 성과 요약
전체 수익률 7.37%, 손익 +70,000원입니다.

## 2. 포지션 분석
삼성전자 75%, Apple 25%로 집중도가 높습니다.

## 3. 리밸런싱 제안
해외 주식 비중을 40%로 늘려 분산을 개선하세요.

## 4. 주요 리스크
삼성전자 단일 종목 집중 리스크가 있습니다.

## 5. 다음 달 관심 사항
환율 변동에 주의하세요."""


def _make_mock_account():
    acc = MagicMock()
    acc.id = "acc-1"
    acc.is_active = True
    acc.display_order = 1
    return acc


def _make_mock_summary():
    from app.services.broker_factory import UnifiedPosition, UnifiedSummary

    positions = [
        UnifiedPosition(
            symbol=h.symbol,
            name=h.name,
            market=h.market,
            exchange=h.exchange,
            currency=h.currency,
            quantity=h.quantity,
            avg_cost=h.avg_cost,
            current_price=h.current_price,
            avg_cost_native=h.avg_cost_native,
            current_price_native=h.current_price_native,
            purchase_amount_krw=h.purchase_amount_krw,
            eval_amount_krw=h.eval_amount_krw,
            profit_loss_krw=h.profit_loss_krw,
            return_pct=h.return_pct,
            day_change_pct=h.day_change_pct,
            weight_pct=h.weight_pct,
        )
        for h in MOCK_HOLDINGS
    ]
    return UnifiedSummary(
        purchase_amount_krw=950000,
        eval_amount_krw=1020000,
        profit_loss_krw=70000,
        cash_krw=100000,
        total_asset_krw=1120000,
        return_pct=7.37,
        positions=positions,
    )


# ── POST /report/monthly — 캐시 미스 ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_monthly_report_success(client, mock_db):
    """캐시 미스 + Claude 응답 정상 → 200 + 리포트 반환."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None  # 캐시 미스

    mock_acc = _make_mock_account()
    from tests.conftest import make_db_result
    mock_db.execute.return_value = make_db_result(rows=[mock_acc])

    mock_unified = _make_mock_summary()

    with (
        patch("app.api.v1.endpoints.report.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.api.v1.endpoints.report.get_usd_krw", new_callable=AsyncMock, return_value=1380.0),
        patch("app.api.v1.endpoints.report.fetch_account_balance", new_callable=AsyncMock, return_value=mock_unified),
        patch("app.api.v1.endpoints.report.generate_monthly_report", new_callable=AsyncMock, return_value=MOCK_REPORT_CONTENT),
    ):
        resp = await client.post("/api/v1/report/monthly", json={"year": 2026, "month": 4})

    assert resp.status_code == 200
    data = resp.json()
    assert data["year"] == 2026
    assert data["month"] == 4
    assert "월간 성과 요약" in data["content"]
    assert data["cached"] is False
    mock_redis.setex.assert_called_once()


@pytest.mark.asyncio
async def test_create_monthly_report_cache_hit(client, mock_db):
    """캐시 히트 → Claude API 호출 없이 즉시 반환."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = MOCK_REPORT_CONTENT  # 캐시 히트

    with (
        patch("app.api.v1.endpoints.report.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.api.v1.endpoints.report.generate_monthly_report") as mock_gen,
    ):
        resp = await client.post("/api/v1/report/monthly", json={"year": 2026, "month": 4})

    assert resp.status_code == 200
    data = resp.json()
    assert data["cached"] is True
    assert data["content"] == MOCK_REPORT_CONTENT
    mock_gen.assert_not_called()


@pytest.mark.asyncio
async def test_create_monthly_report_no_active_accounts(client, mock_db):
    """활성 계좌 없음 → 422 반환."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    from tests.conftest import make_db_result
    mock_db.execute.return_value = make_db_result(rows=[])  # 계좌 없음

    with (
        patch("app.api.v1.endpoints.report.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.api.v1.endpoints.report.get_usd_krw", new_callable=AsyncMock, return_value=1380.0),
    ):
        resp = await client.post("/api/v1/report/monthly", json={"year": 2026, "month": 4})

    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_monthly_report_missing_api_key(client, mock_db):
    """ANTHROPIC_API_KEY 미설정 → 503 반환."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    mock_acc = _make_mock_account()
    from tests.conftest import make_db_result
    mock_db.execute.return_value = make_db_result(rows=[mock_acc])

    mock_unified = _make_mock_summary()

    with (
        patch("app.api.v1.endpoints.report.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.api.v1.endpoints.report.get_usd_krw", new_callable=AsyncMock, return_value=1380.0),
        patch("app.api.v1.endpoints.report.fetch_account_balance", new_callable=AsyncMock, return_value=mock_unified),
        patch(
            "app.api.v1.endpoints.report.generate_monthly_report",
            new_callable=AsyncMock,
            side_effect=ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다."),
        ),
    ):
        resp = await client.post("/api/v1/report/monthly", json={"year": 2026, "month": 4})

    assert resp.status_code == 503
    assert "ANTHROPIC_API_KEY" in resp.json()["detail"]


# ── generate_monthly_report 서비스 단위 테스트 ────────────────────────────────

@pytest.mark.asyncio
async def test_generate_monthly_report_raises_without_api_key():
    """anthropic_api_key 빈 문자열 → ValueError."""
    with patch("app.services.analysis.report.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        from app.services.analysis.report import generate_monthly_report
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            await generate_monthly_report(2026, 4, MOCK_SUMMARY, MOCK_HOLDINGS)


@pytest.mark.asyncio
async def test_generate_monthly_report_calls_claude():
    """정상 호출 시 Claude API message.create를 호출하고 텍스트 반환."""
    mock_message = MagicMock()
    mock_text_block = MagicMock()
    mock_text_block.type = "text"
    mock_text_block.text = MOCK_REPORT_CONTENT
    mock_message.content = [mock_text_block]
    mock_message.usage = MagicMock(
        input_tokens=500,
        output_tokens=300,
        cache_read_input_tokens=0,
    )

    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_message)

    with (
        patch("app.services.analysis.report.settings") as mock_settings,
        patch("app.services.analysis.report.anthropic.AsyncAnthropic", return_value=mock_client),
    ):
        mock_settings.anthropic_api_key = "sk-test-key"
        from app.services.analysis.report import generate_monthly_report
        result = await generate_monthly_report(2026, 4, MOCK_SUMMARY, MOCK_HOLDINGS)

    assert result == MOCK_REPORT_CONTENT
    mock_client.messages.create.assert_called_once()
    call_kwargs = mock_client.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-opus-4-7"
    assert call_kwargs["thinking"] == {"type": "adaptive"}


# ── POST /report/strategy ─────────────────────────────────────────────────────

MOCK_STRATEGY_CONTENT = """## 1. 현재 포지션 진단
삼성전자 75% 집중도는 중립 성향과 비교해 다소 높습니다.

## 2. 목표 달성 전략
3년 목표를 위해 분산 투자를 강화하세요.

## 3. 단계별 실행 계획
3개월: 해외 ETF 추가. 6개월: 비중 재조정.

## 4. 리스크 관리 방안
반도체 사이클 리스크를 헤지하세요.

## 5. 포트폴리오 조정안
삼성전자 비중을 60%로 줄이세요.

## 6. 주요 주의사항
환율 변동에 주의하세요.

## 7. 면책 고지
이 전략서는 참고 자료입니다."""


@pytest.mark.asyncio
async def test_create_strategy_report_success(client, mock_db):
    """전략서 캐시 미스 + Claude 응답 정상 → 200 반환."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    mock_acc = _make_mock_account()
    from tests.conftest import make_db_result
    mock_db.execute.return_value = make_db_result(rows=[mock_acc])

    mock_unified = _make_mock_summary()

    with (
        patch("app.api.v1.endpoints.report.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.api.v1.endpoints.report.get_usd_krw", new_callable=AsyncMock, return_value=1380.0),
        patch("app.api.v1.endpoints.report.fetch_account_balance", new_callable=AsyncMock, return_value=mock_unified),
        patch("app.api.v1.endpoints.report.generate_strategy_report", new_callable=AsyncMock, return_value=MOCK_STRATEGY_CONTENT),
    ):
        resp = await client.post(
            "/api/v1/report/strategy",
            json={"risk_level": "moderate", "horizon_years": 3},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] == "moderate"
    assert data["horizon_years"] == 3
    assert "현재 포지션 진단" in data["content"]
    assert data["cached"] is False
    mock_redis.setex.assert_called_once()


@pytest.mark.asyncio
async def test_create_strategy_report_cache_hit(client, mock_db):
    """전략서 캐시 히트 → Claude API 미호출."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = MOCK_STRATEGY_CONTENT

    mock_acc = _make_mock_account()
    from tests.conftest import make_db_result
    mock_db.execute.return_value = make_db_result(rows=[mock_acc])

    mock_unified = _make_mock_summary()

    with (
        patch("app.api.v1.endpoints.report.get_redis", new_callable=AsyncMock, return_value=mock_redis),
        patch("app.api.v1.endpoints.report.get_usd_krw", new_callable=AsyncMock, return_value=1380.0),
        patch("app.api.v1.endpoints.report.fetch_account_balance", new_callable=AsyncMock, return_value=mock_unified),
        patch("app.api.v1.endpoints.report.generate_strategy_report") as mock_gen,
    ):
        resp = await client.post(
            "/api/v1/report/strategy",
            json={"risk_level": "moderate", "horizon_years": 3},
        )

    assert resp.status_code == 200
    assert resp.json()["cached"] is True
    mock_gen.assert_not_called()


@pytest.mark.asyncio
async def test_create_strategy_report_invalid_risk_level(client, mock_db):
    """잘못된 risk_level → 422 반환."""
    resp = await client.post(
        "/api/v1/report/strategy",
        json={"risk_level": "unknown", "horizon_years": 3},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_generate_strategy_report_calls_claude():
    """전략서 서비스 — Claude API 파라미터 검증."""
    mock_message = MagicMock()
    mock_text_block = MagicMock()
    mock_text_block.type = "text"
    mock_text_block.text = MOCK_STRATEGY_CONTENT
    mock_message.content = [mock_text_block]
    mock_message.usage = MagicMock(input_tokens=600, output_tokens=400, cache_read_input_tokens=0)

    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_message)

    with (
        patch("app.services.analysis.report.settings") as mock_settings,
        patch("app.services.analysis.report.anthropic.AsyncAnthropic", return_value=mock_client),
    ):
        mock_settings.anthropic_api_key = "sk-test-key"
        from app.services.analysis.report import generate_strategy_report
        result = await generate_strategy_report(MOCK_SUMMARY, MOCK_HOLDINGS, "moderate", 3)

    assert result == MOCK_STRATEGY_CONTENT
    mock_client.messages.create.assert_called_once()
    call_kwargs = mock_client.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-opus-4-7"
    assert "중립적" in call_kwargs["messages"][0]["content"]
    assert "3년" in call_kwargs["messages"][0]["content"]
