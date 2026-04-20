# S4-01 종목 상세 리포트 (AI) 계획서

## 목적 / 배경

보유 중인 특정 종목에 대해 Claude API가 심층 분석 리포트를 생성한다.
종목 기본 정보(심볼, 이름, 보유 현황, 수익률)를 컨텍스트로 제공하여
매수/보유/매도 관점의 분석을 받는다.

## 인수 기준 (Acceptance Criteria)

- AC-01: `POST /api/v1/report/stock/{symbol}` — 보유 종목 심볼 → AI 종목 분석 생성
- AC-02: 동일 심볼 요청은 Redis 캐시(30분) 반환 (가격 변동 빠름)
- AC-03: `/portfolio` 페이지의 보유 종목 행에서 리포트 아이콘 클릭 → 모달 팝업
- AC-04: 리포트 4개 섹션: 종목 개요 / 보유 현황 분석 / 리스크 요인 / 매매 관점
- AC-05: 보유하지 않은 심볼 요청 시 404

## 완료 기준 (Definition of Done)

- [ ] `backend/app/services/analysis/report.py` — generate_stock_report() 추가
- [ ] `backend/app/api/v1/endpoints/report.py` — POST /api/v1/report/stock/{symbol} 추가
- [ ] `backend/tests/test_report.py` — 종목 리포트 테스트 3개 추가
- [ ] `frontend/types/index.ts` — StockReport 타입 추가
- [ ] `frontend/lib/api.ts` — fetchStockReport 추가
- [ ] 포트폴리오 상세 페이지 보유 종목에 리포트 버튼 + 모달 추가
- [ ] `docs/PLAN.md` S4-01 ✅ 완료

## 기술 설계

### 리포트 4개 섹션
1. 종목 개요 — 회사 개요, 섹터, 주요 사업
2. 보유 현황 분석 — 현재 수익률 평가, 비중 적정성
3. 리스크 요인 — 단기/중기 리스크 요인 2~3개
4. 매매 관점 — 현재 시점 보유/추가매수/부분매도 관점 제시

### 캐시 키
`report:stock:{symbol}:{price_rounded}` — 현재가 100원 단위 반올림
(가격이 크게 변하면 캐시 무효화, 소폭 변동은 캐시 재사용)

## 향후 개선 (범위 외)

- 재무제표 데이터 연동 (PER, PBR, ROE)
- 뉴스 크롤링 연동
- 차트 패턴 분석
