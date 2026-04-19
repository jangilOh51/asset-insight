# S1-02 AssetBarHistory 스냅샷 API 연결 계획서

> 상태: ⬜ 대기  
> 스프린트: Sprint 1  
> 작성일: 2026-04-19

---

## 목적 / 배경

포트폴리오 상세 화면의 `AssetBarHistory` 컴포넌트가 `lib/mockData.ts`의 `barHistoryData`를 사용 중이다.  
`/api/v1/snapshot/summary/{account_no}` API 실데이터로 전환한다.

---

## 역할 배정

| 역할 | 담당 | 작업 |
|------|------|------|
| 백엔드 개발자 | Claude/백엔드 | 스냅샷 요약 API 응답 형식 확인 |
| 프론트 개발자 | Claude/프론트 | AssetBarHistory props 변경, API 연결 |

---

## 인수 기준 (Acceptance Criteria)

- [ ] 포트폴리오 상세 화면의 바차트가 실제 일별 자산 데이터를 표시한다
- [ ] 스냅샷 데이터 없을 때 "데이터 수집 중" 상태를 표시한다
- [ ] `barHistoryData` mockData 참조가 제거된다

---

## 작업 상세

### [백엔드] API 응답 확인
```
GET /api/v1/snapshot/summary/{account_no}?limit=12
응답: [{ time: "2026-04-19", total_value_krw: 86361872 }, ...]
```

### [프론트] AssetBarHistory 변경
- Props 추가: `data?: { date: string; value: number }[]`
- 데이터 없을 때 스켈레톤 표시
- 날짜 포맷: `MM/DD`

---

## 영향 범위

| 파일 | 변경 유형 |
|------|-----------|
| `frontend/components/portfolio/AssetBarHistory.tsx` | 수정 |
| `frontend/pages/portfolio/[id].tsx` | 수정 (props 전달) |
| `frontend/lib/api.ts` | 수정 (fetchSnapshotSummary 추가) |

## 예상 소요 시간: 1.5시간
