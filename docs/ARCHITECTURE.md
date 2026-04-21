# Asset Insight — 시스템 아키텍처

> 최종 수정: 2026-04-21  
> 현재 환경: 로컬 Docker Compose (단일 사용자)

---

## 1. 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Local Machine                            │
│                                                                 │
│  Browser (localhost:3000)                                       │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐    HTTP/REST    ┌──────────────────────────┐  │
│  │   Next.js 14  │ ─────────────► │    FastAPI (port 8000)   │  │
│  │  (Pages Router│ ◄─────────────  │    + APScheduler         │  │
│  │   port 3000)  │                │    + Uvicorn ASGI         │  │
│  └──────────────┘                └────────┬─────────┬────────┘  │
│                                           │         │           │
│                              ┌────────────┘         └──────┐    │
│                              ▼                             ▼    │
│                   ┌──────────────────┐       ┌─────────────────┐│
│                   │   PostgreSQL 16   │       │    Redis 7      ││
│                   │  + TimescaleDB   │       │  (cache + TTL)  ││
│                   │   (port 5432)    │       │  (port 6379)    ││
│                   └──────────────────┘       └─────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ KIS Developers│ │키움 OpenAPI+ │ │ Anthropic    │
      │ API (REST)    │ │ API (REST)   │ │ Claude API   │
      └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 2. 컴포넌트 상세

### 2.1 Frontend — Next.js 14

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 14 (Pages Router) |
| 언어 | TypeScript (strict mode) |
| 스타일 | Tailwind CSS + 인라인 스타일 (디자인 토큰) |
| 데이터 패칭 | SWR (`refreshInterval` 30~60초) + axios |
| 차트 | Recharts (도넛·바·라인), Lightweight Charts (캔들) |
| 상태관리 | React 로컬 state + SWR 캐시 (별도 전역 스토어 없음) |

**페이지 구조**
```
pages/
├── index.tsx              ← 대시보드 홈 (총자산·목표 진행률)
├── portfolio/[id].tsx     ← 포트폴리오 상세 (종목 테이블·차트)
├── trend.tsx              ← 트렌드 분석 + 벤치마크 비교
├── market.tsx             ← 시황 (지수·환율·트리맵)
├── report.tsx             ← AI 월간 리포트
├── strategy.tsx           ← AI 투자 전략서
├── tax.tsx                ← 세금 시뮬레이터
├── tax-calendar.tsx       ← 절세 캘린더
├── assets.tsx             ← 수동 자산 관리
├── accounts/index.tsx     ← 계좌 관리
├── history.tsx            ← 자산 히스토리
└── guide.tsx              ← 사용 가이드
```

---

### 2.2 Backend — FastAPI

**레이어 구조**
```
API Layer       app/api/v1/endpoints/
                  ├── portfolio.py     ← 실시간 포트폴리오 집계
                  ├── accounts.py      ← 계좌 CRUD
                  ├── snapshot.py      ← 스냅샷 조회
                  ├── trend.py         ← 트렌드·벤치마크
                  ├── market.py        ← 시황 지수
                  ├── report.py        ← AI 리포트 3종
                  ├── goals.py         ← 투자 목표
                  ├── notifications.py ← 인앱 알림
                  ├── assets.py        ← 수동 자산
                  ├── tax.py           ← 세금 계산
                  ├── tax_calendar.py  ← 절세 캘린더
                  └── realtime.py      ← KIS 직접 조회

Service Layer   app/services/
                  ├── broker_factory.py    ← 멀티 증권사 추상화
                  ├── kis/                 ← KIS API 클라이언트
                  │   ├── client.py
                  │   ├── domestic.py
                  │   ├── overseas.py
                  │   └── exchange_rate.py
                  ├── kiwoom/              ← 키움 API 클라이언트
                  │   ├── client.py
                  │   └── balance.py
                  ├── snapshot_writer.py   ← 스냅샷 DB 저장
                  ├── notification.py      ← 알림 생성 서비스
                  ├── market/              ← 시황·벤치마크
                  └── analysis/            ← AI 리포트 생성

Model Layer     app/models/
                  ├── portfolio.py
                  ├── broker_account.py
                  ├── position_snapshot.py
                  ├── account_daily_summary.py
                  ├── custom_asset.py
                  ├── investment_goal.py
                  └── notification.py

Scheduler       app/scheduler/
                  ├── jobs.py              ← APScheduler 등록
                  ├── snapshot.py          ← 일별 스냅샷 저장 (평일 18:00)
                  └── notification_check.py← 알림 체크 (30분 간격)
```

---

### 2.3 데이터 흐름

#### 실시간 포트폴리오 조회
```
Browser
  → GET /api/v1/portfolio/realtime
  → BrokerFactory.fetch_all(accounts)
      ├── KISClient.get_domestic_balance()   ┐
      ├── KISClient.get_overseas_balance()   ├─ asyncio.gather (병렬)
      └── KiwoomClient.get_balance()         ┘
  → UnifiedSummary 합산
  → BackgroundTask: write_snapshot() (Redis 쓰로틀 10분)
  → PortfolioRealtimeResponse 반환
```

#### 일별 스냅샷 저장 (APScheduler)
```
APScheduler CronTrigger (평일 18:00 KST)
  → save_daily_snapshot()
  → 모든 활성 계좌 순회
  → fetch_account_balance() per account
  → write_snapshot(force=True)  ← 쓰로틀 무시
  → PostgreSQL: position_snapshot + account_daily_summary
```

#### AI 리포트 생성
```
Browser → POST /api/v1/report/{monthly|strategy|stock}
  → Redis 캐시 확인
      캐시 히트 → 즉시 반환 (cached: true)
      캐시 미스 → _fetch_portfolio() → BrokerFactory
                → generate_*_report(holdings, summary)
                → Anthropic Claude API
                → Redis setex (TTL: 30분~2시간)
                → 응답 반환
```

#### 알림 체크 (APScheduler)
```
APScheduler IntervalTrigger (30분)
  → run_notification_check()
  → BrokerFactory로 전체 포지션 조회
  → check_and_create_notifications(total_asset, positions)
      ├── 목표 달성/마일스톤 체크 (Redis 24h dedup)
      └── 종목별 이상 수익/손실 체크 (Redis 24h dedup)
  → Notification DB 저장
```

---

### 2.4 데이터베이스 스키마

```
portfolio              ← 포트폴리오 (legacy)
broker_account         ← 증권사 계좌 정보 (BrokerFactory 대상)
  └── account_no, broker_type, app_key, app_secret, display_order

position_snapshot      ← TimescaleDB hypertable — 종목별 일 스냅샷
  └── time, account_no, symbol, quantity, avg_cost, eval_amount_krw, ...

account_daily_summary  ← 계좌별 일 요약 (총자산·손익)
  └── time, account_no, total_asset_krw, return_pct, ...

custom_asset           ← 수동 입력 자산 (부동산·예금 등)
investment_goal        ← 투자 목표 (is_active=True 최대 1개)
notification           ← 인앱 알림 (type, is_read, created_at)
```

**TimescaleDB 쿼리 패턴**
```sql
-- 일별 총자산 트렌드
SELECT time_bucket('1 day', time), SUM(eval_amount_krw)
FROM account_daily_summary GROUP BY 1 ORDER BY 1;

-- 주별/월별: time_bucket 인자만 변경
```

---

### 2.5 Redis 키 설계

| 키 패턴 | TTL | 용도 |
|---------|-----|------|
| `token:kis:{env}` | 86400s | KIS Access Token |
| `token:kiwoom:{env}` | 86400s | 키움 Access Token |
| `snapshot:throttle:{account_no}` | `REALTIME_THROTTLE_SECONDS` (기본 600s) | 실시간 조회 저장 쓰로틀 |
| `report:monthly:{year}:{month}` | 3600s | AI 월간 리포트 |
| `report:strategy:{risk}:{horizon}:{hash}` | 7200s | AI 전략서 |
| `report:stock:{symbol}:{price_bucket}` | 1800s | AI 종목 리포트 |
| `notif_sent:{type}:{target}:{date}` | 86400s | 알림 중복 방지 |
| `market:indices` | 300s | 시황 지수 |
| `usd_krw` | 3600s | USD/KRW 환율 |

---

## 3. 증권사 연동 추상화

```python
# 신규 증권사 추가 패턴
class NewBrokerClient:
    async def get_balance(self, account: BrokerAccount, usd_krw: float) -> UnifiedSummary:
        ...

# BrokerFactory가 broker_type으로 라우팅
# UnifiedSummary: positions(list[UnifiedPosition]) + 집계 금액 필드
```

`UnifiedPosition` 공통 필드:
```
symbol, name, market(KR/US/...), exchange, currency
quantity, avg_cost, current_price, avg_cost_native, current_price_native
purchase_amount_krw, eval_amount_krw, profit_loss_krw, return_pct, day_change_pct
```

---

## 4. 테스트 전략

| 유형 | 도구 | 범위 |
|------|------|------|
| 단위 테스트 | pytest + pytest-asyncio | 모든 API 엔드포인트 |
| Mock 전략 | `unittest.mock.AsyncMock` | DB, Redis, 증권사 API, Claude API 전부 Mock |
| 실행 | `python -m pytest tests/ -v` | 156개 테스트, 0 failed |

외부 의존성(DB, Redis, 증권사 API, Anthropic)은 전부 Mock → 네트워크 없이 실행 가능.

---

## 5. 향후 아키텍처 고려사항

| 항목 | 현재 | 확장 시 |
|------|------|--------|
| 스케줄러 | APScheduler (in-process) | Celery + Redis Worker |
| 실시간 | SWR 폴링 (30~60초) | WebSocket (KIS WS API) |
| 배포 | Docker Compose (로컬) | Docker Compose on VPS / k8s |
| 인증 | 없음 (단독 사용) | JWT + 사용자 DB |
| 다중 사용자 | 미지원 | 사용자별 계좌 격리 필요 |
