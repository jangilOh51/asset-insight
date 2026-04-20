# S3-03 세금 시뮬레이터 계획서

## 목적 / 배경

보유 종목을 매도할 때 발생하는 세금을 사전에 시뮬레이션한다.
국내 주식(증권거래세 + 양도소득세), 해외 주식(양도소득세), ETF별 세율을 계산한다.
외부 AI를 쓰지 않고 **룰 기반 계산** 으로 구현한다 (빠른 응답, 비용 없음).

## 한국 주식 세금 규칙 (2024년 기준)

### 국내 주식 (코스피/코스닥)
- 증권거래세: 매도금액 × 0.18% (코스피), 0.18% (코스닥)
- 양도소득세: 소액주주는 비과세 (대주주 제외)
- 배당소득세: 15.4% (원천징수)

### 해외 주식
- 양도소득세: 연간 양도차익 - 250만원 기본공제 → 22% (지방소득세 포함)
- 양도차손 통산 가능

### 국내 ETF (상장)
- 매매차익: 배당소득세 15.4% (이익 과세)
- 증권거래세: 면제

## 인수 기준 (Acceptance Criteria)

- AC-01: `POST /api/v1/tax/simulate` — 매도 시나리오 입력 → 세금 계산 결과 반환
- AC-02: 국내 주식 / 해외 주식 / 국내 ETF 3가지 자산 유형 지원
- AC-03: `/tax` 페이지에서 매도 종목 선택 + 매도 수량 입력 → 세금 시뮬레이션
- AC-04: 순이익(세후) = 매도 총액 - 세금 합계 계산 및 표시
- AC-05: 보유 종목 중 선택해서 시뮬레이션 가능

## 완료 기준 (Definition of Done)

- [ ] `backend/app/services/tax/calculator.py` — 세금 계산 서비스
- [ ] `backend/app/api/v1/endpoints/tax.py` — POST /api/v1/tax/simulate
- [ ] `backend/app/api/v1/router.py` — tax_router 등록
- [ ] `backend/tests/test_tax.py` — 최소 5개 테스트
- [ ] `frontend/types/index.ts` — TaxSimulation 타입
- [ ] `frontend/lib/api.ts` — fetchTaxSimulation
- [ ] `frontend/pages/tax/index.tsx` — 세금 시뮬레이터 UI
- [ ] `docs/PLAN.md` S3-03 ✅ 완료

## 기술 설계

### 요청 스키마
```
{
  symbol: str,
  asset_type: "stock_kr" | "stock_us" | "etf_kr",
  quantity: int,           # 매도 수량
  avg_cost_krw: float,     # 평균매입단가 (KRW)
  current_price_krw: float # 현재가 (KRW)
}
```

### 응답 스키마
```
{
  symbol: str,
  asset_type: str,
  quantity: int,
  sell_amount_krw: float,      # 매도 총액
  purchase_amount_krw: float,  # 매입 총액
  profit_loss_krw: float,      # 양도차익
  securities_tax_krw: float,   # 증권거래세
  income_tax_krw: float,       # 양도소득세
  total_tax_krw: float,        # 총 세금
  net_profit_krw: float,       # 세후 순이익
  effective_tax_rate_pct: float,  # 실효세율
  notes: list[str]             # 주의사항 (대주주 해당 여부 등)
}
```

## 향후 개선 (범위 외)

- 연간 누적 손익 통산 (해외 주식 250만원 공제 자동 적용)
- ISA 계좌 비과세 혜택 시뮬레이션
- 손실 확정 매도 절세 시나리오
