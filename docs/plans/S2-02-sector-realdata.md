# S2-02 섹터 트리맵 실데이터 연결 계획서

## 목적 / 배경
기존 `SectorTreemap` 컴포넌트가 하드코딩 mockData를 사용하고 있었음.
`/market` 페이지 구현(S2-01) 과정에서 `/api/v1/portfolio/realtime` 실시간 보유 종목 데이터를
직접 연결하여 해결 완료.

## 인수 기준 (Acceptance Criteria)

- AC-01: `SectorTreemap`이 하드코딩 데이터 없이 실시간 보유 종목 데이터를 사용 ✅
- AC-02: 평가금액 비례 셀 크기, 당일 등락률 기반 셀 색상 ✅
- AC-03: 보유 종목 없을 때 빈 상태 표시 ✅

## 완료 기준 (Definition of Done)

- [x] `SectorTreemap` mockData 제거
- [x] `/market` 페이지에서 `portfolio.holdings` 실시간 데이터 주입
- [x] 기술 부채 TD-05 해결

## 작업 이력

S2-01 시황 페이지 구현 시 함께 처리됨 (2026-04-20).
- `frontend/pages/market/index.tsx` — `fetchPortfolioRealtime()` SWR 훅 + `SectorTreemap` 연결
- `frontend/components/dashboard/SectorTreemap.tsx` — `HoldingItem[]` 기반 렌더링

## 향후 개선 (범위 외)

- GICS 11개 섹터 그룹핑 (종목별 섹터 분류 데이터 필요)
- 섹터별 등락률 집계 표시
