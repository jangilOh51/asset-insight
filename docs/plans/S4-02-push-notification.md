# S4-02 푸시 알림 (목표 달성, 이상 수익률) 계획서

## 목적 / 배경

포트폴리오 상태를 사용자가 매번 직접 확인하지 않아도, 중요한 이벤트(목표 달성, 이상 수익/손실)가 발생하면 알림으로 즉시 인지할 수 있도록 한다.

## 역할 배정

| 역할 | 수행 업무 |
|------|-----------|
| 기획자 | 알림 트리거 조건 명세, AC 정의 |
| 백엔드 | Notification 모델, 서비스, API, 스케줄러 |
| 프론트 | NotificationBell 컴포넌트 + 드롭다운 패널 |
| QA | 단위 테스트 |

## 인수 기준 (Acceptance Criteria)

- AC-01: 알림 트리거 — 활성 목표 달성 시 (total_asset >= target)
- AC-02: 알림 트리거 — 목표 진행률 50% / 75% / 90% 도달 시
- AC-03: 알림 트리거 — 보유 종목 수익률 +20% 이상 (이상 수익)
- AC-04: 알림 트리거 — 보유 종목 수익률 -15% 이하 (이상 손실)
- AC-05: 중복 알림 방지 — 동일 트리거는 24시간 내 재발송 없음 (Redis TTL)
- AC-06: `GET /api/v1/notifications` — 최근 50개, 미읽음 우선 정렬
- AC-07: `POST /api/v1/notifications/read-all` — 전체 읽음 처리
- AC-08: `DELETE /api/v1/notifications` — 전체 삭제
- AC-09: 사이드바에 벨 아이콘 + 미읽음 수 배지 표시
- AC-10: 벨 클릭 시 드롭다운 패널로 알림 목록 표시

## 기술 설계

### 알림 타입
```
goal_achieved  — 투자 목표 금액 달성
goal_milestone — 목표 50% / 75% / 90% 도달
high_return    — 종목 수익률 >= +20%
high_loss      — 종목 수익률 <= -15%
```

### 스케줄러
- `check_and_create_notifications` job: 30분 간격 (장 중 09:00-18:00 한정 가능)
- Redis TTL 키: `notif_sent:{type}:{target}:{date}` → 24시간 만료

### API 엔드포인트
```
GET    /api/v1/notifications          — 알림 목록 (최대 50개)
POST   /api/v1/notifications/read-all — 전체 읽음
DELETE /api/v1/notifications          — 전체 삭제
```

### DB 스키마
```
notification
  id          INTEGER PK
  type        VARCHAR  (goal_achieved | goal_milestone | high_return | high_loss)
  title       VARCHAR
  message     TEXT
  is_read     BOOLEAN  DEFAULT false
  created_at  TIMESTAMPTZ
```

## 완료 기준 (Definition of Done)

- [ ] `backend/app/models/notification.py`
- [ ] `backend/alembic/versions/0006_notification.py`
- [ ] `backend/alembic/env.py` — Notification 모델 임포트 추가
- [ ] `backend/app/services/notification.py` — check_and_create_notifications()
- [ ] `backend/app/api/v1/endpoints/notifications.py`
- [ ] `backend/app/api/v1/router.py` — notifications 라우터 등록
- [ ] `backend/app/scheduler/jobs.py` — notification 체크 job 추가
- [ ] `frontend/types/index.ts` — NotificationItem 타입 추가
- [ ] `frontend/lib/api.ts` — fetchNotifications, markAllRead, deleteAllNotifications
- [ ] `frontend/components/layout/NotificationBell.tsx`
- [ ] `frontend/components/layout/AppLayout.tsx` — NotificationBell 통합
- [ ] `backend/tests/test_notifications.py` — 최소 6개 케이스
- [ ] `docs/PLAN.md` S4-02 ✅ 완료

## 예상 소요 시간

2~3시간
