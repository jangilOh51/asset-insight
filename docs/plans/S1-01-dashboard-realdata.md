# S1-01 대시보드 홈 실데이터 연결 계획서

> 상태: ⬜ 대기  
> 스프린트: Sprint 1  
> 작성일: 2026-04-19

---

## 목적 / 배경

현재 `frontend/pages/index.tsx`는 `lib/mockData.ts`의 하드코딩 데이터를 사용한다.  
실제 KIS API 데이터(`/api/v1/portfolio/realtime`)로 연결해 대시보드가 실잔고를 반영하게 한다.

**현재 상태**
```
index.tsx
  ← mockData: portfolios, totalAsset, totalProfit, totalReturnPct, monthlyDividend
  ← SectorTreemap: 하드코딩 섹터 데이터
  ← PortfolioCard: 하드코딩 포트폴리오 목록
```

**목표 상태**
```
index.tsx
  ← /api/v1/portfolio/realtime → 총 자산, 수익률, 보유 종목
  ← /api/v1/accounts           → 포트폴리오(계좌) 목록
  ← 섹터 트리맵은 보유 종목 기반 계산 (실데이터)
```

---

## 역할 배정

| 역할 | 담당 | 작업 |
|------|------|------|
| 백엔드 개발자 | Claude/백엔드 | 계좌 목록 API 응답 스키마 확인 및 보완 |
| 프론트 개발자 | Claude/프론트 | index.tsx mockData 제거, API 훅 연결 |
| 코드 리뷰어 | Claude/리뷰 | 타입 안전성, 상태 처리 검토 |

---

## 인수 기준 (Acceptance Criteria)

- [ ] 대시보드 총 자산이 KIS 실잔고와 일치한다
- [ ] 수익/손실 색상이 한국 관례(수익=빨강, 손실=파랑)를 따른다
- [ ] 포트폴리오 카드가 `/api/v1/accounts` 데이터로 렌더링된다
- [ ] 로딩 중 스켈레톤 UI가 표시된다
- [ ] API 오류 시 에러 상태가 표시된다
- [ ] `lib/mockData.ts`의 `totalAsset`, `totalProfit`, `portfolios` 참조가 제거된다

---

## 작업 상세

### [백엔드] 계좌 목록 API 응답 확인
- `GET /api/v1/accounts` 응답에 `total_asset_krw`, `return_pct` 포함 여부 확인
- 없으면 `GET /api/v1/portfolio/realtime` summary로 대체

### [프론트] index.tsx 실데이터 전환
1. `useSWR` 또는 `useEffect`로 `/api/v1/portfolio/realtime` 호출
2. `totalAsset` ← `data.summary.total_asset_krw`
3. `totalProfit` ← `data.summary.profit_loss_krw`
4. `totalReturnPct` ← `data.summary.return_pct`
5. `PortfolioCard` 데이터 ← `/api/v1/accounts` API
6. 로딩/에러 상태 추가

### [프론트] SectorTreemap 실데이터 전환
- `holdings` 데이터로 섹터별 그룹핑
- 오늘 수익률은 KIS 당일 등락률 필드 활용

---

## 완료 기준 (Definition of Done)

- [ ] `mockData` import가 `index.tsx`에서 완전히 제거됨
- [ ] TypeScript 컴파일 에러 0개
- [ ] 5가지 UI 상태 구현 (기본/로딩/에러/빈화면/새로고침)
- [ ] Chrome 콘솔 에러 0개
- [ ] 포트폴리오 상세 화면과 총 자산 수치 일치

---

## 영향 범위

| 파일 | 변경 유형 |
|------|-----------|
| `frontend/pages/index.tsx` | 수정 (주요) |
| `frontend/lib/api.ts` | 수정 (fetchAccounts 추가) |
| `frontend/types/index.ts` | 수정 (Account 타입 추가) |
| `frontend/lib/mockData.ts` | 참조 제거 (파일은 유지) |

---

## 예상 소요 시간

- 백엔드 확인: 30분
- 프론트 구현: 2시간
- 리뷰 + QA: 30분
- **합계: 약 3시간**
