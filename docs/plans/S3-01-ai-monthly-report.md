# S3-01 AI 월간 리포트 (Claude API 연동) 계획서

## 목적 / 배경

보유 포트폴리오 데이터를 기반으로 Claude API를 사용해 월간 투자 리포트를 자동 생성한다.
실시간 포지션 데이터(보유 종목, 수익률, 자산 구성)를 컨텍스트로 제공하고, Claude가
한국어로 월간 성과 분석 + 리밸런싱 제안을 생성한다.

## 인수 기준 (Acceptance Criteria)

- AC-01: `POST /api/v1/report/monthly` 호출 시 Claude API로 리포트 생성
- AC-02: 동일 연월 요청은 Redis 캐시(1h TTL)에서 즉시 반환
- AC-03: 시스템 프롬프트에 프롬프트 캐싱 적용 (비용 절감)
- AC-04: `/report` 페이지에서 리포트 생성 + 표시 (5가지 UI 상태)
- AC-05: ANTHROPIC_API_KEY 미설정 시 명확한 에러 메시지

## 완료 기준 (Definition of Done)

- [ ] `backend/app/services/analysis/report.py` — Claude API 서비스
- [ ] `backend/app/api/v1/endpoints/report.py` — POST /api/v1/report/monthly
- [ ] `backend/tests/test_report.py` — 최소 3개 테스트
- [ ] `frontend/types/index.ts` — MonthlyReport 타입 추가
- [ ] `frontend/lib/api.ts` — fetchMonthlyReport 추가
- [ ] `frontend/pages/report/index.tsx` — 리포트 UI (5가지 상태)
- [ ] `docs/PLAN.md` S3-01 ✅ 완료 업데이트

## 기술 설계

### 백엔드 플로우
```
POST /api/v1/report/monthly { year, month }
  → Redis 캐시 확인 (key: report:monthly:{year}:{month})
  → cache hit  → 즉시 반환
  → cache miss → portfolio realtime 데이터 조회
               → Claude API (claude-opus-4-7, adaptive thinking)
               → 결과 Redis 저장 (TTL 3600s)
               → 반환
```

### 프롬프트 구조
- system: 투자 리포트 작성 지침 (캐시 대상 — 고정 텍스트)
- user: 보유 종목 JSON + 연월 (요청마다 변경)

### 리포트 섹션
1. 월간 성과 요약 (수익률, 주요 기여 종목)
2. 포지션 분석 (집중도, 통화/국가 분산)
3. 리밸런싱 제안 (비중 조정, 분산 개선)
4. 주요 리스크 (집중 리스크, 환율 노출)
5. 다음 달 관심 사항

## 향후 개선 (범위 외)

- 스트리밍 SSE로 실시간 생성 표시
- 월별 리포트 DB 저장 + 이력 조회
- 시장 지수 데이터 포함 (벤치마크 대비 분석)
