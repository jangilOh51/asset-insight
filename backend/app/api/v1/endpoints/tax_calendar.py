"""절세 캘린더 API."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/tax", tags=["tax"])

# 매년 반복되는 절세 이벤트 (법정 기한 기반 하드코딩)
_TAX_EVENTS = [
    {
        "id": "isa-reset",
        "title": "ISA 계좌 납입 한도 리셋",
        "description": "ISA(개인종합자산관리계좌) 연간 납입 한도(2,000만원)가 새해 1월 1일 리셋됩니다. 전년도 미납 한도는 이월되므로 연초에 납입 계획을 세우세요.",
        "month": 1,
        "day": 1,
        "category": "deadline",
        "is_annual": True,
    },
    {
        "id": "year-end-simplification",
        "title": "연말정산 간소화 서비스 오픈",
        "description": "국세청 홈택스 연말정산 간소화 서비스가 1월 15일에 오픈됩니다. 금융소득, 배당소득 내역을 미리 확인하세요.",
        "month": 1,
        "day": 15,
        "category": "check",
        "is_annual": True,
    },
    {
        "id": "global-income-report",
        "title": "종합소득세 신고 기간 시작",
        "description": "5월 1일부터 31일까지 종합소득세 신고 기간입니다. 금융소득 2,000만원 초과 시 금융소득 종합과세 대상이며, 해외 주식 양도소득도 이 기간에 신고합니다.",
        "month": 5,
        "day": 1,
        "category": "report",
        "is_annual": True,
    },
    {
        "id": "overseas-capital-gains-deadline",
        "title": "해외 주식 양도소득세 신고 마감",
        "description": "전년도 해외 주식 양도소득세 신고 마감일(5월 31일)입니다. 연간 양도차익 250만원 초과 시 22%(지방소득세 포함) 납부 의무가 있습니다. 미신고 시 가산세 부과.",
        "month": 5,
        "day": 31,
        "category": "deadline",
        "is_annual": True,
    },
    {
        "id": "financial-income-check",
        "title": "금융소득 종합과세 중간 점검",
        "description": "올해 받은 이자·배당소득을 중간 점검하는 시기입니다. 연간 금융소득이 2,000만원을 초과하면 종합과세 대상이 됩니다. 현재까지 누적 금융소득을 HTS/MTS에서 확인하세요.",
        "month": 7,
        "day": 1,
        "category": "check",
        "is_annual": True,
    },
    {
        "id": "overseas-loss-realization",
        "title": "해외 주식 손실 확정 매도 권장",
        "description": "해외 주식 양도소득세 절세를 위해 12월 중 손실 종목을 매도해 연간 차익과 통산하는 전략입니다. 250만원 공제 후 차익을 최소화할 수 있습니다. 재매수는 1월 이후 권장.",
        "month": 12,
        "day": 15,
        "category": "strategy",
        "is_annual": True,
    },
    {
        "id": "major-shareholder-check",
        "title": "대주주 요건 확인 (12월 말 기준)",
        "description": "12월 말 기준 특정 종목 보유 비중 또는 금액이 대주주 요건(코스피 1% 또는 10억원 이상)을 충족하면 양도소득세 과세 대상이 됩니다. 12월 28일 이전 비중을 조정하세요.",
        "month": 12,
        "day": 28,
        "category": "check",
        "is_annual": True,
    },
    {
        "id": "year-end-portfolio-review",
        "title": "연말 포트폴리오 절세 최종 점검",
        "description": "한 해의 양도차익과 차손을 최종 확인하고 절세 가능한 추가 조치를 취하는 마지막 시기입니다. 해외 주식 손익 통산, ISA 활용, 연금저축 납입 등을 확인하세요.",
        "month": 12,
        "day": 31,
        "category": "strategy",
        "is_annual": True,
    },
]


class TaxEvent(BaseModel):
    id: str
    title: str
    description: str
    month: int
    day: int | None
    category: str
    is_annual: bool


@router.get("/calendar", response_model=list[TaxEvent])
def get_tax_calendar(year: int = 2026) -> list[TaxEvent]:
    """연도별 절세 이벤트 목록 반환. 데이터는 법정 기한 기반 고정값이므로 year 파라미터는 향후 확장용."""
    return [TaxEvent(**e) for e in _TAX_EVENTS]
