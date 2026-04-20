# S3-02 투자 전략서 페이지 계획서

## 목적 / 배경

월간 AI 리포트(S3-01)가 과거 성과 분석이라면, 전략서는 **앞으로의 투자 전략**을 AI가 생성한다.
사용자의 투자 목표(InvestmentGoal), 현재 포트폴리오, 리스크 성향을 입력받아
Claude API가 구체적인 전략 제안 문서를 작성한다.

## 인수 기준 (Acceptance Criteria)

- AC-01: `POST /api/v1/report/strategy` — 리스크 성향 + 목표 기간 입력 → 전략서 생성
- AC-02: 동일 파라미터 요청은 Redis 캐시(2h TTL)에서 즉시 반환
- AC-03: 시스템 프롬프트 프롬프트 캐싱 적용
- AC-04: `/strategy` 페이지에서 전략서 생성 + 표시 (5가지 UI 상태)
- AC-05: 전략서 7개 섹션: 현재 포지션 진단 / 목표 달성 전략 / 단계별 실행 계획 / 리스크 관리 / 포트폴리오 조정안 / 주의사항 / 면책

## 완료 기준 (Definition of Done)

- [ ] `backend/app/api/v1/endpoints/report.py` — POST /api/v1/report/strategy 추가
- [ ] `backend/tests/test_report.py` — 전략서 엔드포인트 테스트 3개 이상 추가
- [ ] `frontend/types/index.ts` — StrategyReport 타입 추가
- [ ] `frontend/lib/api.ts` — fetchStrategyReport 추가
- [ ] `frontend/pages/strategy/index.tsx` — 전략서 페이지 (5가지 상태)
- [ ] `docs/PLAN.md` S3-02 ✅ 완료 업데이트

## 기술 설계

### 입력 파라미터
```
risk_level: "conservative" | "moderate" | "aggressive"
horizon_years: 1 | 3 | 5 | 10
```

### 캐시 키
`report:strategy:{risk_level}:{horizon_years}:{portfolio_hash}`
- portfolio_hash: 보유 종목 심볼+비중의 MD5 (포트폴리오 변경 시 캐시 무효화)

### 전략서 7개 섹션
1. 현재 포지션 진단
2. 목표 달성 전략
3. 단계별 실행 계획 (3개월/6개월/1년)
4. 리스크 관리 방안
5. 포트폴리오 조정안
6. 주요 주의사항
7. 면책 고지

## 향후 개선 (범위 외)

- PDF 내보내기
- 전략서 DB 저장 + 버전 이력
- 커스텀 섹션 추가
