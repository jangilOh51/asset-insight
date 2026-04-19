# Asset Insight — 개인 자산관리 플랫폼

---

## ⚙️ Claude 작업 수행 방식 (필독)

### PM 주도 워크플로우 (기본 프로세스)

**사용자가 기능 지시를 내리면 PM이 주관하여 전 과정을 진행한다.**

```
사용자 지시
  → [PM] 요구사항 분석 + 역할 배정 선언
  → [기획자] 기능 명세 + AC 정의
  → [백엔드] API/서비스 구현
  → [프론트] UI 구현
  → [코드 리뷰어] 코드 품질 검토
  → [QA] 테스트 작성 + 실행
  → [PM] 완료 검토 체크리스트 확인
  → [PM] 사용자에게 최종 보고
```

PM은 모든 역할의 결과물을 검토한 후 최종 완료를 선언한다.  
세부 규칙은 `docs/roles/pm.md` 참조.

---

### 화면 요구사항 문서 활용 프로세스

`docs/screens/` 폴더에 화면별 요구사항 문서가 있다.  
**화면 개발 또는 개선 요청이 오면 반드시 아래 순서를 따른다.**

```
1. docs/screens/screen-0N-{화면명}.md 파일을 읽어 현재 요구사항 파악
2. 사용자 요청과 기존 요구사항의 GAP 분석
3. 요구사항 문서를 먼저 업데이트 (변경/추가 사항 반영, last_updated·version 갱신)
4. 업데이트된 요구사항 기준으로 구현 진행
5. 구현 완료 후 "미구현/향후 개선" 체크박스 반영
```

> **규칙**: 나중에 말한 요구사항이 이전 것을 덮어쓴다. 이전 내용을 주석으로 남기지 말고 직접 교체한다.

| 화면 | 요구사항 파일 |
|------|--------------|
| 포트폴리오 홈 (`/`) | `docs/screens/screen-01-dashboard.md` |
| 포트폴리오 상세 (`/portfolio/[id]`) | `docs/screens/screen-02-portfolio-detail.md` |
| 트렌드 분석 (`/trend`) | `docs/screens/screen-03-trend.md` |
| 자산 히스토리 (`/history`) | `docs/screens/screen-04-history.md` |
| 계좌 관리 (`/accounts`) | `docs/screens/screen-05-accounts.md` |
| 사용 가이드 (`/guide`) | `docs/screens/screen-06-guide.md` |
| 수동 자산 관리 (`/assets`) | `docs/screens/screen-07-custom-assets.md` |
| 시황 (`/market`) | `docs/screens/screen-08-market.md` |

신규 화면 추가 시 → `screen-0N-{name}.md` 생성 + `docs/screens/README.md` 인덱스 업데이트

---

### 작업 지시 수신 시 반드시 아래 순서를 따른다

**Step 0 — PM 역할 선언 (모든 기능 작업 시)**

작업 지시를 받으면 PM으로서 요구사항을 분석하고 팀에 업무를 배분한다.

**Step 1 — 역할 배정 선언**

작업 지시를 받으면 구현에 앞서 다음 형식으로 역할 배정을 먼저 출력한다.

```
## 역할 배정

| 역할 | 담당자 | 수행 업무 |
|------|--------|-----------|
| PM | Claude/PM | 요구사항 분석, 업무 조율, 완료 검토 및 보고 |
| 기획자 | Claude/기획 | ... |
| UX 디자이너 | Claude/디자인 | ... |
| 백엔드 개발자 | Claude/백엔드 | ... |
| 프론트 개발자 | Claude/프론트 | ... |
| 코드 리뷰어 | Claude/리뷰 | ... |
| QA | Claude/QA | ... |

## 작업 순서
1. [PM] 요구사항 분석
2. [역할] 작업 내용
...
N. [PM] 완료 검토 + 최종 보고
```

해당 역할이 필요 없으면 표에서 생략한다.

**Step 1.5 — 계획서 작성 (신규 기능 / 화면 작업 시)**

신규 기능이거나 2시간 이상 작업이면 `docs/plans/` 에 계획서를 먼저 작성한다.  
계획서 ID 형식: `S{스프린트번호}-{순번}-{작업명}.md` (예: `S1-04-trend-page.md`)  
작업 완료 후 `docs/PLAN.md`의 해당 항목 상태를 ✅ 완료로 업데이트한다.

**Step 2 — 역할별 순서대로 작업 실행**

배정된 순서에 따라 각 역할의 하네스 규칙을 적용하여 작업한다.  
각 역할의 작업 시작 시 `### [역할명] 작업 시작` 헤딩을 출력하여 현재 어느 역할이 수행 중인지 명시한다.

**Step 3 — PM 완료 검토 + 보고**

모든 역할의 작업이 끝나면 PM이 아래를 검토하고 사용자에게 보고한다:

```
PM 완료 검토 체크리스트:
☐ 코드가 CLAUDE.md 컨벤션을 따르는가?
☐ TypeScript / Python 타입 에러 0개?
☐ 새 엔드포인트에 단위 테스트가 있는가?
☐ 모든 테스트가 통과하는가?
☐ PLAN.md 상태가 업데이트됐는가?
☐ 영향받은 문서가 업데이트됐는가?
```

---

### 역할별 하네스 문서 위치

상세 규칙은 `docs/roles/` 폴더를 참조한다.

| 역할 | 문서 | 핵심 규칙 요약 |
|------|------|---------------|
| PM | `docs/roles/pm.md` | 요구사항 분석 → 업무 배분 → 완료 검토 → 최종 보고 |
| 기획자 | `docs/roles/planner.md` | 기능 명세 → AC 정의 → 범위 확정 |
| UX 디자이너 | `docs/roles/ux-designer.md` | 디자인 토큰 준수, 5가지 UI 상태 설계 |
| 백엔드 개발자 | `docs/roles/backend-developer.md` | async/Pydantic/KIS API 규칙 |
| 프론트 개발자 | `docs/roles/frontend-developer.md` | TypeScript strict, 디자인 토큰, 5가지 상태 구현 |
| 코드 리뷰어 | `docs/roles/code-reviewer.md` | MUST/SHOULD/NIT 태그, 금융 도메인 검토 |
| QA | `docs/roles/quality-process.md` | 품질 게이트, 회귀 시나리오, 릴리즈 체크리스트 |

---

### 역할 판단 기준

| 작업 유형 | 필요 역할 |
|-----------|-----------|
| 새 기능 추가 | **PM** → 기획 → UX → 백엔드/프론트 → 리뷰 → QA → **PM 보고** |
| UI 개선/버그 | **PM** → UX → 프론트 → 리뷰 → QA → **PM 보고** |
| API 추가/수정 | **PM** → 백엔드 → 리뷰 → QA → **PM 보고** |
| DB 스키마 변경 | **PM** → 백엔드 → 리뷰 → **PM 보고** |
| 문서 작성 | 기획 또는 해당 역할 (PM 생략 가능) |
| 리팩터링 | **PM** → 해당 역할 → 리뷰 → **PM 보고** |
| 긴급 버그 수정 | 해당 역할 → 리뷰 (PM/QA 간소화 가능) |

---

## 프로젝트 개요

개인 투자자를 위한 통합 자산관리 플랫폼. 국내/해외 증권 계좌를 실시간 조회하고, 매일 자산 스냅샷을 DB에 저장해 일/주/월 트렌드를 분석한다. 장기적으로 시장 분석, 투자 전략서 작성, 개별 종목 리포트 분석 기능까지 확장 예정.

## 기술 스택

### Backend
| 항목 | 선택 |
|------|------|
| 언어 | Python 3.11+ |
| 프레임워크 | FastAPI |
| 패키지 관리 | uv (pyproject.toml) |
| 스케줄러 | APScheduler (경량) → Celery + Redis (확장 시) |
| 증권 API | 한국투자증권 KIS Developers API |
| ORM | SQLAlchemy 2.0 (async) + Alembic |

### Database
| 항목 | 선택 |
|------|------|
| 주 DB | PostgreSQL 16 + TimescaleDB 확장 |
| 캐시/브로커 | Redis 7 |
| 컨테이너 | Docker Compose |

### Frontend
| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 차트 | Recharts + TradingView Lightweight Charts |
| 스타일링 | Tailwind CSS |
| 실시간 | WebSocket (FastAPI ↔ Next.js) |

## 프로젝트 구조

```
asset-insight/
├── CLAUDE.md
├── docker-compose.yml           # PostgreSQL(TimescaleDB) + Redis
├── docker-compose.dev.yml       # 개발 환경 오버라이드
├── .env.example                 # 환경변수 템플릿
├── scripts/
│   ├── init_db.sh               # TimescaleDB 초기화
│   └── seed_data.py             # 개발용 샘플 데이터
├── backend/
│   ├── pyproject.toml           # uv 패키지 설정
│   ├── .python-version          # Python 버전 고정
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/            # DB 마이그레이션 파일
│   └── app/
│       ├── main.py              # FastAPI 앱 진입점
│       ├── core/
│       │   ├── config.py        # 환경변수 설정 (pydantic-settings)
│       │   ├── database.py      # DB 연결 (async SQLAlchemy)
│       │   └── redis.py         # Redis 연결
│       ├── models/              # SQLAlchemy ORM 모델
│       │   ├── asset_snapshot.py    # 일별 자산 스냅샷 (TimescaleDB hypertable)
│       │   ├── portfolio.py         # 포트폴리오 / 계좌 정보
│       │   ├── position.py          # 개별 종목 포지션
│       │   └── market_data.py       # 시장 데이터 캐시
│       ├── schemas/             # Pydantic 요청/응답 스키마
│       │   ├── asset.py
│       │   ├── portfolio.py
│       │   └── market.py
│       ├── api/
│       │   └── v1/
│       │       ├── router.py
│       │       └── endpoints/
│       │           ├── portfolio.py     # 포트폴리오 CRUD
│       │           ├── snapshot.py      # 자산 스냅샷 조회
│       │           ├── trend.py         # 일/주/월 트렌드 분석
│       │           ├── realtime.py      # 실시간 계좌 조회
│       │           └── websocket.py     # WebSocket 엔드포인트
│       ├── services/
│       │   ├── kis/                 # 한국투자증권 KIS API
│       │   │   ├── client.py        # KIS REST 클라이언트
│       │   │   ├── websocket.py     # KIS WebSocket 클라이언트
│       │   │   ├── domestic.py      # 국내 주식 조회
│       │   │   └── overseas.py      # 해외 주식 조회
│       │   ├── market/
│       │   │   ├── analyzer.py      # 시장 분석 로직
│       │   │   └── indicators.py    # 기술적 지표 계산
│       │   └── analysis/
│       │       ├── trend.py         # 트렌드 분석 (일/주/월)
│       │       ├── report.py        # 종목 리포트 생성
│       │       └── strategy.py      # 투자 전략 분석
│       ├── scheduler/
│       │   ├── jobs.py              # APScheduler 작업 정의
│       │   └── snapshot.py          # 일별 스냅샷 저장 작업
│       └── utils/
│           ├── currency.py          # 환율 처리
│           └── helpers.py
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── types/
    │   └── index.ts             # TypeScript 타입 정의
    ├── lib/
    │   ├── api.ts               # API 클라이언트
    │   └── websocket.ts         # WebSocket 훅
    ├── hooks/
    │   ├── usePortfolio.ts
    │   ├── useRealtime.ts
    │   └── useTrend.ts
    ├── components/
    │   ├── layout/
    │   │   └── DashboardLayout.tsx
    │   ├── dashboard/
    │   │   ├── AssetSummary.tsx      # 총 자산 요약 카드
    │   │   ├── PortfolioBreakdown.tsx # 자산 구성 파이차트
    │   │   └── RealtimePositions.tsx  # 실시간 포지션 테이블
    │   └── charts/
    │       ├── AssetTrendChart.tsx    # 자산 트렌드 라인차트
    │       ├── ReturnChart.tsx        # 수익률 차트
    │       └── SectorChart.tsx        # 섹터 비중 차트
    └── pages/ (또는 app/)
        ├── index.tsx                  # 대시보드 메인
        ├── portfolio/
        ├── trend/
        └── analysis/
```

## 핵심 도메인 모델

### AssetSnapshot (TimescaleDB hypertable)
```
time         TIMESTAMPTZ  -- 파티션 기준
account_id   VARCHAR
asset_type   ENUM(stock_kr, stock_us, etf_kr, etf_us, cash_krw, cash_usd, ...)
symbol       VARCHAR
quantity     NUMERIC
price_krw    NUMERIC      -- KRW 환산 가격
value_krw    NUMERIC      -- KRW 환산 평가금액
return_pct   NUMERIC      -- 수익률
```

### 핵심 쿼리 패턴
```sql
-- 일별 총 자산 트렌드
SELECT time_bucket('1 day', time), SUM(value_krw)
FROM asset_snapshot GROUP BY 1 ORDER BY 1;

-- 주별/월별은 time_bucket 인자만 변경
```

## KIS API 설정

KIS Developers API (https://apiportal.koreainvestment.com)
- 모의투자/실전투자 환경 분리 (`KIS_MOCK=true/false`)
- APP_KEY, APP_SECRET → Access Token 발급 (1일 유효)
- WebSocket 접속키 별도 발급 필요
- 국내주식: `/uapi/domestic-stock/v1/trading/inquire-balance`
- 해외주식: `/uapi/overseas-stock/v1/trading/inquire-balance`

## 환경변수 (.env)

```
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/asset_insight
REDIS_URL=redis://localhost:6379/0

# KIS API
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ACCOUNT_NO=        # 계좌번호 (XXXXXXXXXX-XX)
KIS_MOCK=true          # 모의투자 여부

# Scheduler
SNAPSHOT_CRON=0 18 * * 1-5   # 평일 18시 (장 마감 후)

# App
SECRET_KEY=
CORS_ORIGINS=http://localhost:3000
```

## 개발 워크플로우

### 백엔드 실행
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### DB 마이그레이션
```bash
cd backend
uv run alembic upgrade head
```

### 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

### Docker (DB만)
```bash
docker compose up -d postgres redis
```

## 코딩 컨벤션

### 공통
- 커밋 메시지: `feat/fix/refactor/docs/chore: 한글 설명`
- 브랜치: `feature/기능명`, `fix/버그명`
- PR: 변경 이유 + 스크린샷(UI 변경 시) + 테스트 방법 기술 필수

### 백엔드 (→ `docs/roles/backend-developer.md` 상세)
- Python: ruff (lint + format), mypy (타입 체크)
- 비동기: async/await 일관 사용, 독립 호출은 `asyncio.gather` 병렬화
- API 버전: `/api/v1/` 접두사 유지
- 스키마: 요청/응답 Pydantic 모델 분리 (`Request`/`Response` suffix)
- 에러: `HTTPException` + 커스텀 에러 코드
- 환경변수: `.env` 파일만 사용, 코드 하드코딩 금지
- DB: Alembic 마이그레이션 필수, raw SQL f-string 금지
- **단위 테스트 (필수 규칙)**:
  - 모든 API 엔드포인트에 최소 1개 이상의 단위 테스트 작성 (`backend/tests/`)
  - 외부 의존성(DB, Redis, KIS/키움 API)은 반드시 Mock으로 대체
  - 새 엔드포인트 추가 시 → `test_{파일명}.py` 동시 커밋 필수
  - 기존 엔드포인트 변경 시 → 해당 테스트 파일도 함께 수정
  - 실행: `docker compose exec backend python -m pytest tests/ -v`
  - 테스트 없는 PR은 리뷰 거부

### 프론트엔드 (→ `docs/roles/frontend-developer.md` 상세)
- TypeScript strict mode, `any` 타입 금지
- 색상: 디자인 토큰 값만 사용 (`#0B111B`, `#06B6D4`, `#EF4444`, `#60A5FA` 등)
- **수익 = 빨강(#EF4444), 손실 = 파랑(#60A5FA)** — 한국 관례, 절대 변경 금지
- 금액 표기: `fmt()` 함수 일관 사용 (1만 이상 "만", 1억 이상 "억")
- 모든 데이터 컴포넌트: 5가지 상태 구현 (기본/로딩/에러/빈화면/오프라인)
- 차트 컴포넌트: `dynamic import` + `ssr: false` 필수

### 디자인 시스템 (→ `docs/roles/ux-designer.md` 상세)
```
배경:    #0B111B   서피스: #111827   카드: #1A2332
포인트:  #06B6D4   수익:   #EF4444   손실: #60A5FA
폰트:    Pretendard Variable (UI) + JetBrains Mono (숫자)
```

## 확장 로드맵

1. **Phase 1** (현재): 자산 스냅샷 + 트렌드 대시보드
2. **Phase 2**: 시장 분석 자동화 (뉴스 크롤링, 지수 분석)
3. **Phase 3**: AI 기반 투자 전략서 자동 생성 (Claude API 연동)
4. **Phase 4**: 개별 종목 리포트 분석 + 매수/매도 시그널
