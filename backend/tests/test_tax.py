"""세금 시뮬레이터 단위 테스트.

커버 엔드포인트:
  POST /api/v1/tax/simulate
"""

import pytest


# ── 서비스 레이어 — 국내 주식 ─────────────────────────────────────────────────

def test_stock_kr_securities_tax():
    """국내 주식: 증권거래세 0.18% 계산."""
    from app.services.tax.calculator import simulate_tax

    result = simulate_tax(
        symbol="005930", asset_type="stock_kr",
        quantity=10, avg_cost_krw=70_000, current_price_krw=80_000,
    )
    assert result.sell_amount_krw == 800_000
    assert result.securities_tax_krw == round(800_000 * 0.0018)
    assert result.income_tax_krw == 0  # 소액주주 비과세
    assert result.profit_loss_krw == 100_000


def test_stock_kr_loss_still_pays_securities_tax():
    """국내 주식 손실 매도 시에도 증권거래세는 발생한다."""
    from app.services.tax.calculator import simulate_tax

    result = simulate_tax(
        symbol="005930", asset_type="stock_kr",
        quantity=10, avg_cost_krw=80_000, current_price_krw=70_000,
    )
    assert result.profit_loss_krw == -100_000
    assert result.securities_tax_krw == round(700_000 * 0.0018)
    assert result.income_tax_krw == 0


# ── 서비스 레이어 — 해외 주식 ─────────────────────────────────────────────────

def test_stock_us_capital_gains_above_deduction():
    """해외 주식 양도차익 > 250만원 → 22% 과세."""
    from app.services.tax.calculator import simulate_tax

    # 양도차익 = 500만원
    result = simulate_tax(
        symbol="AAPL", asset_type="stock_us",
        quantity=1, avg_cost_krw=5_000_000, current_price_krw=10_000_000,
    )
    assert result.profit_loss_krw == 5_000_000
    assert result.securities_tax_krw == 0
    taxable = 5_000_000 - 2_500_000
    assert result.income_tax_krw == round(taxable * 0.22)


def test_stock_us_capital_gains_below_deduction():
    """해외 주식 양도차익 <= 250만원 → 세금 없음."""
    from app.services.tax.calculator import simulate_tax

    result = simulate_tax(
        symbol="AAPL", asset_type="stock_us",
        quantity=1, avg_cost_krw=1_000_000, current_price_krw=3_000_000,
    )
    assert result.profit_loss_krw == 2_000_000
    assert result.income_tax_krw == 0  # 250만원 공제 이하


def test_stock_us_loss():
    """해외 주식 손실 → 세금 0."""
    from app.services.tax.calculator import simulate_tax

    result = simulate_tax(
        symbol="AAPL", asset_type="stock_us",
        quantity=1, avg_cost_krw=5_000_000, current_price_krw=3_000_000,
    )
    assert result.profit_loss_krw == -2_000_000
    assert result.income_tax_krw == 0
    assert result.total_tax_krw == 0


# ── 서비스 레이어 — 국내 ETF ──────────────────────────────────────────────────

def test_etf_kr_profit_tax():
    """국내 ETF 이익: 배당소득세 15.4%."""
    from app.services.tax.calculator import simulate_tax

    result = simulate_tax(
        symbol="069500", asset_type="etf_kr",
        quantity=100, avg_cost_krw=30_000, current_price_krw=35_000,
    )
    profit = 100 * (35_000 - 30_000)
    assert result.profit_loss_krw == profit
    assert result.securities_tax_krw == 0
    assert result.income_tax_krw == round(profit * 0.154)


def test_etf_kr_loss_no_tax():
    """국내 ETF 손실: 세금 없음."""
    from app.services.tax.calculator import simulate_tax

    result = simulate_tax(
        symbol="069500", asset_type="etf_kr",
        quantity=100, avg_cost_krw=35_000, current_price_krw=30_000,
    )
    assert result.income_tax_krw == 0
    assert result.total_tax_krw == 0


# ── API 엔드포인트 ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_simulate_api_returns_200(client, mock_db):
    """정상 요청 → 200 + 결과 반환."""
    resp = await client.post("/api/v1/tax/simulate", json={
        "symbol": "005930",
        "asset_type": "stock_kr",
        "quantity": 10,
        "avg_cost_krw": 70000,
        "current_price_krw": 80000,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "005930"
    assert data["sell_amount_krw"] == 800_000
    assert data["profit_loss_krw"] == 100_000
    assert isinstance(data["notes"], list)
    assert len(data["notes"]) > 0


@pytest.mark.asyncio
async def test_simulate_api_invalid_asset_type(client, mock_db):
    """잘못된 asset_type → 422."""
    resp = await client.post("/api/v1/tax/simulate", json={
        "symbol": "005930",
        "asset_type": "invalid_type",
        "quantity": 10,
        "avg_cost_krw": 70000,
        "current_price_krw": 80000,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_simulate_api_zero_quantity(client, mock_db):
    """quantity=0 → 422."""
    resp = await client.post("/api/v1/tax/simulate", json={
        "symbol": "005930",
        "asset_type": "stock_kr",
        "quantity": 0,
        "avg_cost_krw": 70000,
        "current_price_krw": 80000,
    })
    assert resp.status_code == 422
