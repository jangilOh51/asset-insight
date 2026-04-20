# S3-04 절세 캘린더 계획서

## 목적 / 배경

투자자가 놓치기 쉬운 절세 관련 주요 일정(신고 기한, 납부 기한, 계좌 혜택 마감 등)을
월별 캘린더 형태로 표시한다. 고정 일정(법정 기한)이 대부분이므로 DB 없이
하드코딩 데이터로 구현한다.

## 인수 기준 (Acceptance Criteria)

- AC-01: `/tax-calendar` 페이지에서 월별 절세 일정 표시
- AC-02: 당월 기준 남은 D-day 계산 및 표시
- AC-03: 7가지 이상 절세 이벤트 유형 포함
  - 해외 주식 양도소득세 신고 (5월)
  - ISA 계좌 납입 한도 리셋 (1월)
  - 금융소득 종합과세 기준 확인 (연간 2,000만원)
  - 연말정산 간소화 서비스 오픈 (1월 중순)
  - 해외 주식 손실 확정 매도 권장 기간 (12월)
  - 배당소득 지급 기준일 확인 (종목별)
  - 국내 주식 대주주 요건 확인 (12월 말)
- AC-04: 지나간 일정은 회색으로 흐리게 표시
- AC-05: 이벤트 클릭 시 상세 설명 표시

## 완료 기준 (Definition of Done)

- [ ] `backend/app/api/v1/endpoints/tax_calendar.py` — GET /api/v1/tax/calendar
- [ ] `backend/tests/test_tax_calendar.py` — 3개 이상 테스트
- [ ] `frontend/types/index.ts` — TaxEvent 타입 추가
- [ ] `frontend/lib/api.ts` — fetchTaxCalendar 추가
- [ ] `frontend/pages/tax-calendar/index.tsx` — 절세 캘린더 UI (5가지 상태)
- [ ] `docs/PLAN.md` P3-04 ✅ 완료

## 기술 설계

### 데이터 구조
```
TaxEvent {
  id: str
  title: str
  description: str
  month: int       # 1~12
  day: int | null  # null이면 월말 또는 "해당 월 전체"
  category: "report" | "payment" | "deadline" | "strategy" | "check"
  is_annual: bool  # 매년 반복 여부
}
```

### API 설계
`GET /api/v1/tax/calendar?year={year}`
- 해당 연도의 모든 절세 이벤트 반환
- D-day 계산은 프론트에서 처리 (서버 시간 의존 줄이기)

## 향후 개선 (범위 외)

- 개인 일정 추가 (커스텀 이벤트)
- 푸시 알림 연동 (D-7, D-1)
- 주요 세법 변경 알림
