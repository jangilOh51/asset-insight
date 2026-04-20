"""AI 리포트 생성 서비스 — Claude API 사용."""

import hashlib
import json
import logging
from typing import Literal

import anthropic

from app.core.config import settings
from app.schemas.portfolio import HoldingItem, PortfolioSummary

logger = logging.getLogger(__name__)

RiskLevel = Literal["conservative", "moderate", "aggressive"]

_RISK_LABELS = {
    "conservative": "보수적",
    "moderate": "중립적",
    "aggressive": "공격적",
}

_MONTHLY_SYSTEM_PROMPT = """당신은 개인 투자자를 위한 전문 포트폴리오 분석가입니다.
보유 종목 데이터를 분석하여 명확하고 실용적인 월간 투자 리포트를 한국어로 작성합니다.

리포트는 반드시 다음 5개 섹션을 마크다운 형식으로 작성하세요:

## 1. 월간 성과 요약
전체 수익률, 손익금액, 주요 기여 종목(상위 3개)을 서술합니다.

## 2. 포지션 분석
보유 비중 분포, 국내/해외 분산, 통화 노출(KRW/USD)을 분석합니다.

## 3. 리밸런싱 제안
비중이 과도하거나 부족한 종목/섹터에 대한 구체적 조정 방향을 제안합니다.

## 4. 주요 리스크
포트폴리오의 집중 리스크, 환율 리스크, 기타 주의 사항을 서술합니다.

## 5. 다음 달 관심 사항
시장 환경이나 포트폴리오 관점에서 다음 달 주시할 사항을 제안합니다.

분석은 데이터에 근거하되 투자 결정은 항상 본인 판단임을 강조하세요.
섹션 제목은 정확히 위 형식을 따르세요. 각 섹션은 3~5문장으로 작성합니다."""

_STRATEGY_SYSTEM_PROMPT = """당신은 개인 투자자를 위한 전문 포트폴리오 전략가입니다.
현재 포트폴리오와 투자 성향을 분석하여 구체적이고 실행 가능한 투자 전략서를 한국어로 작성합니다.

전략서는 반드시 다음 7개 섹션을 마크다운 형식으로 작성하세요:

## 1. 현재 포지션 진단
현재 포트폴리오의 강점과 약점, 리스크 성향과의 적합성을 평가합니다.

## 2. 목표 달성 전략
투자 기간과 리스크 성향에 맞는 핵심 전략 방향을 제시합니다.

## 3. 단계별 실행 계획
3개월 / 6개월 / 1년 단위로 구체적인 실행 항목을 제시합니다.

## 4. 리스크 관리 방안
주요 리스크 요인과 각각의 대응 방법을 서술합니다.

## 5. 포트폴리오 조정안
목표 비중과 현재 비중의 차이를 분석하고 조정 우선순위를 제안합니다.

## 6. 주요 주의사항
시장 환경, 세금, 환율 등 실행 시 주의할 사항을 서술합니다.

## 7. 면책 고지
이 전략서는 AI가 생성한 참고 자료이며, 투자 결정과 그 결과는 전적으로 투자자 본인의 책임임을 명시합니다.

각 섹션은 3~6문장으로 작성하며, 데이터에 기반한 구체적 수치와 종목명을 포함하세요."""


def _portfolio_hash(holdings: list[HoldingItem]) -> str:
    key = "|".join(f"{h.symbol}:{h.weight_pct:.1f}" for h in sorted(holdings, key=lambda x: x.symbol))
    return hashlib.md5(key.encode()).hexdigest()[:8]


def _build_portfolio_context(summary: PortfolioSummary, holdings: list[HoldingItem]) -> str:
    holdings_data = [
        {
            "종목명": h.name,
            "심볼": h.symbol,
            "시장": h.market,
            "통화": h.currency,
            "수량": h.quantity,
            "평가금액(KRW)": h.eval_amount_krw,
            "수익률(%)": round(h.return_pct, 2),
            "비중(%)": round(h.weight_pct, 2),
        }
        for h in sorted(holdings, key=lambda x: x.eval_amount_krw, reverse=True)
    ]
    summary_data = {
        "총자산(KRW)": summary.total_asset_krw,
        "평가금액(KRW)": summary.eval_amount_krw,
        "매입금액(KRW)": summary.purchase_amount_krw,
        "총손익(KRW)": summary.profit_loss_krw,
        "수익률(%)": round(summary.return_pct, 2),
        "현금(KRW)": summary.cash_krw,
    }
    return (
        f"### 포트폴리오 요약\n```json\n{json.dumps(summary_data, ensure_ascii=False, indent=2)}\n```\n\n"
        f"### 보유 종목 ({len(holdings)}개)\n```json\n{json.dumps(holdings_data, ensure_ascii=False, indent=2)}\n```"
    )


async def _call_claude(system_prompt: str, user_content: str, log_tag: str) -> str:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-opus-4-7",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_content}],
    )

    text_blocks = [block.text for block in message.content if block.type == "text"]
    if not text_blocks:
        raise RuntimeError("Claude API에서 텍스트 응답을 받지 못했습니다.")

    logger.info(
        "%s input_tokens=%d output_tokens=%d cache_read=%d",
        log_tag,
        message.usage.input_tokens,
        message.usage.output_tokens,
        getattr(message.usage, "cache_read_input_tokens", 0),
    )
    return text_blocks[0]


async def generate_monthly_report(
    year: int,
    month: int,
    summary: PortfolioSummary,
    holdings: list[HoldingItem],
) -> str:
    portfolio_ctx = _build_portfolio_context(summary, holdings)
    user_content = f"{year}년 {month}월 포트폴리오 월간 리포트를 작성해주세요.\n\n{portfolio_ctx}"
    return await _call_claude(_MONTHLY_SYSTEM_PROMPT, user_content, f"monthly_report year={year} month={month}")


async def generate_strategy_report(
    summary: PortfolioSummary,
    holdings: list[HoldingItem],
    risk_level: RiskLevel,
    horizon_years: int,
) -> str:
    risk_label = _RISK_LABELS[risk_level]
    portfolio_ctx = _build_portfolio_context(summary, holdings)
    user_content = (
        f"투자 성향: {risk_label} / 목표 투자 기간: {horizon_years}년\n\n"
        f"{portfolio_ctx}\n\n"
        f"위 정보를 바탕으로 맞춤형 투자 전략서를 작성해주세요."
    )
    return await _call_claude(_STRATEGY_SYSTEM_PROMPT, user_content, f"strategy_report risk={risk_level} horizon={horizon_years}y")


_STOCK_SYSTEM_PROMPT = """당신은 개인 투자자를 위한 전문 주식 분석가입니다.
보유 종목 정보를 바탕으로 간결하고 실용적인 종목 분석 리포트를 한국어로 작성합니다.

리포트는 반드시 다음 4개 섹션을 마크다운 형식으로 작성하세요:

## 1. 종목 개요
회사의 주요 사업 내용, 속한 섹터, 시장 내 위치를 간략히 설명합니다.

## 2. 보유 현황 분석
현재 수익률과 매입 단가 대비 현재가의 의미, 포트폴리오 내 비중의 적정성을 평가합니다.

## 3. 리스크 요인
단기 및 중기적으로 주목해야 할 리스크 요인 2~3가지를 구체적으로 서술합니다.

## 4. 매매 관점
현재 시점에서 보유 / 추가 매수 / 부분 매도 각각의 논거를 간략히 제시하고,
어떤 조건에서 각 행동이 적합한지 설명합니다.

분석은 제공된 데이터에 근거하며, 최종 투자 결정은 본인 판단임을 명시하세요.
각 섹션은 2~4문장으로 간결하게 작성합니다."""


async def generate_stock_report(holding: HoldingItem) -> str:
    holding_data = {
        "종목명": holding.name,
        "심볼": holding.symbol,
        "시장": holding.market,
        "통화": holding.currency,
        "보유 수량": holding.quantity,
        "평균단가(KRW)": holding.avg_cost,
        "현재가(KRW)": holding.current_price,
        "평가금액(KRW)": holding.eval_amount_krw,
        "손익(KRW)": holding.profit_loss_krw,
        "수익률(%)": round(holding.return_pct, 2),
        "당일등락률(%)": round(holding.day_change_pct, 2),
        "포트폴리오 비중(%)": round(holding.weight_pct, 2),
    }
    user_content = (
        f"다음 보유 종목에 대한 심층 분석 리포트를 작성해주세요.\n\n"
        f"```json\n{json.dumps(holding_data, ensure_ascii=False, indent=2)}\n```"
    )
    return await _call_claude(_STOCK_SYSTEM_PROMPT, user_content, f"stock_report symbol={holding.symbol}")
