# S2-03 목표 설정 & 진행률 추적 계획서

## 목적 / 배경
투자 목표 금액을 설정하고 현재 총 자산 대비 달성률을 시각화한다.
포트폴리오 홈(/)에서 목표 진행률 카드를 노출한다.

## 인수 기준 (Acceptance Criteria)
- AC-01: 목표 금액 + 목표명 설정 (PATCH /api/v1/goals/active)
- AC-02: 현재 총 자산 기준 달성률(%) + 남은 금액 표시
- AC-03: 포트폴리오 홈에 진행률 바 카드 표시
- AC-04: 목표 없으면 "목표 설정" CTA 표시
- AC-05: 단위 테스트 작성

## API 설계
### GET /api/v1/goals/active
현재 활성 목표 반환. 없으면 null.

### PUT /api/v1/goals/active
목표 생성 또는 교체. body: { name, target_amount_krw }

### DELETE /api/v1/goals/active
목표 삭제.

## 영향 범위
- 신규: backend/app/models/investment_goal.py
- 신규: backend/app/schemas/goal.py
- 신규: backend/app/api/v1/endpoints/goals.py
- 수정: backend/app/api/v1/router.py
- 수정: frontend/pages/index.tsx (목표 진행률 카드 추가)
- 신규: frontend/components/dashboard/GoalProgress.tsx
- 신규: backend/tests/test_goals.py

## 예상 소요 시간
약 2시간
