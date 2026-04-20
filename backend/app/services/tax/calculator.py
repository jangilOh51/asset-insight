"""세금 계산 서비스 — 한국 주식/해외 주식/국내 ETF (2024년 기준 룰 기반).

세율 요약:
  국내 주식: 증권거래세 0.18%, 소액주주 양도소득세 비과세
  해외 주식: 양도소득세 22% (250만원 기본공제 적용, 지방소득세 포함)
  국내 ETF: 배당소득세 15.4% (매매차익 과세), 증권거래세 없음
"""

from dataclasses import dataclass, field
from typing import Literal

AssetTypeForTax = Literal["stock_kr", "stock_us", "etf_kr"]

# 세율 상수
_SECURITIES_TAX_RATE_KR = 0.0018   # 증권거래세 0.18% (코스피/코스닥 동일)
_CAPITAL_GAINS_TAX_RATE_US = 0.22  # 해외 양도소득세 22% (지방소득세 포함)
_DIVIDEND_TAX_RATE_ETF_KR = 0.154  # 국내 ETF 배당소득세 15.4%
_US_BASIC_DEDUCTION = 2_500_000    # 해외 양도소득 연간 기본공제 250만원


@dataclass
class TaxSimulationResult:
    symbol: str
    asset_type: str
    quantity: int
    sell_amount_krw: float
    purchase_amount_krw: float
    profit_loss_krw: float
    securities_tax_krw: float
    income_tax_krw: float
    total_tax_krw: float
    net_profit_krw: float
    effective_tax_rate_pct: float
    notes: list[str] = field(default_factory=list)


def simulate_tax(
    symbol: str,
    asset_type: AssetTypeForTax,
    quantity: int,
    avg_cost_krw: float,
    current_price_krw: float,
) -> TaxSimulationResult:
    """매도 시나리오의 예상 세금을 계산한다."""
    sell_amount = current_price_krw * quantity
    purchase_amount = avg_cost_krw * quantity
    profit_loss = sell_amount - purchase_amount

    securities_tax = 0.0
    income_tax = 0.0
    notes: list[str] = []

    if asset_type == "stock_kr":
        securities_tax = sell_amount * _SECURITIES_TAX_RATE_KR
        # 소액주주 양도소득세 비과세
        income_tax = 0.0
        notes.append("소액주주 기준 양도소득세 비과세 (대주주 해당 시 별도 과세)")
        notes.append(f"증권거래세: 매도금액 × {_SECURITIES_TAX_RATE_KR * 100:.2f}%")

    elif asset_type == "stock_us":
        securities_tax = 0.0
        # 연간 기본공제 250만원 적용 후 양도차익에 22% 과세
        taxable_profit = max(0.0, profit_loss - _US_BASIC_DEDUCTION)
        income_tax = taxable_profit * _CAPITAL_GAINS_TAX_RATE_US
        notes.append(f"연간 기본공제 {_US_BASIC_DEDUCTION:,.0f}원 적용 (이미 사용한 경우 별도 계산 필요)")
        notes.append(f"양도소득세 22% (지방소득세 2% 포함), 과세표준: {taxable_profit:,.0f}원")
        if profit_loss < 0:
            notes.append("손실 발생 — 당해 연도 다른 해외 양도차익과 통산 가능")

    elif asset_type == "etf_kr":
        securities_tax = 0.0
        # 이익에만 배당소득세 15.4% 과세
        income_tax = max(0.0, profit_loss) * _DIVIDEND_TAX_RATE_ETF_KR
        notes.append(f"국내 ETF 매매차익 배당소득세 {_DIVIDEND_TAX_RATE_ETF_KR * 100:.1f}% (손실 시 비과세)")
        notes.append("증권거래세 면제")

    total_tax = securities_tax + income_tax
    net_profit = profit_loss - total_tax
    effective_tax_rate = (total_tax / profit_loss * 100) if profit_loss > 0 else 0.0

    return TaxSimulationResult(
        symbol=symbol,
        asset_type=asset_type,
        quantity=quantity,
        sell_amount_krw=round(sell_amount),
        purchase_amount_krw=round(purchase_amount),
        profit_loss_krw=round(profit_loss),
        securities_tax_krw=round(securities_tax),
        income_tax_krw=round(income_tax),
        total_tax_krw=round(total_tax),
        net_profit_krw=round(net_profit),
        effective_tax_rate_pct=round(effective_tax_rate, 2),
        notes=notes,
    )
