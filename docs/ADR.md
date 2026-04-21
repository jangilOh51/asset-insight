# Architecture Decision Records — Asset Insight

> 형식: 제목 / 상태 / 컨텍스트 / 결정 / 결과  
> 상태: `Accepted` | `Deprecated` | `Superseded`

---

## ADR-001 · 백엔드 프레임워크: FastAPI

**상태:** Accepted (2026-04-19)

**컨텍스트**  
개인 투자 데이터를 실시간으로 조회하고 WebSocket을 통해 프론트에 전달해야 한다. 스케줄러와 비동기 DB 연산이 동일 프로세스 안에서 동작해야 한다.

**결정**  
FastAPI + Uvicorn (ASGI) 채택. Django REST는 동기 기반으로 asyncio 통합이 복잡하고, Flask는 비동기 생태계가 미성숙하다.

**결과**
- `async/await` 일관 적용, `asyncio.gather`로 병렬 API 호출 가능
- Pydantic v2 기반 자동 직렬화·검증
- `/docs` OpenAPI 문서 자동 생성
- Django Admin 등 편의 기능 없음 → 별도 관리 UI 필요 시 추가 구현 필요

---

## ADR-002 · 시계열 데이터베이스: PostgreSQL + TimescaleDB

**상태:** Accepted (2026-04-19)

**컨텍스트**  
일별 자산 스냅샷을 장기 저장하고 time_bucket으로 주·월별 집계가 필요하다. InfluxDB(순수 TSDB), plain PostgreSQL 중 선택했다.

**결정**  
TimescaleDB 확장을 올린 PostgreSQL 16 채택.

**결과**
- 관계형 스키마(계좌·목표·포지션)와 시계열 스냅샷을 단일 DB로 관리
- `time_bucket('1 day', time)` 집계 쿼리로 트렌드 산출
- SQLAlchemy + Alembic 마이그레이션 그대로 사용 가능
- InfluxDB 대비 쿼리 표현력 우수, 운영 복잡도 낮음

---

## ADR-003 · 캐시·쓰로틀링: Redis

**상태:** Accepted (2026-04-19)

**컨텍스트**  
KIS/키움 API는 초당 호출 제한이 있다. 실시간 잔고 조회는 10분 내 중복 DB 저장을 방지해야 하고, AI 리포트는 동일 요청을 수 분 내 재생성하면 비용 낭비다.

**결정**  
Redis 7 (AOF persistence) 단일 인스턴스로 다음을 모두 처리:  
- 증권사 토큰 캐시 (`token:{broker}:{env}`)  
- 스냅샷 저장 쓰로틀 (`snapshot:throttle:{account_no}`, TTL = `REALTIME_THROTTLE_SECONDS`)  
- AI 리포트 캐시 (`report:monthly:*`, `report:stock:*`, `report:strategy:*`)  
- 알림 중복 방지 (`notif_sent:{type}:{target}:{date}`, TTL 24h)  
- 시황 지수 캐시 (`market:indices`, TTL 5m)

**결과**
- 브로커 API 불필요한 호출 대폭 감소
- TTL만으로 만료 처리 → 별도 Celery/Worker 없이도 충분
- Redis 장애 시 fallback: 캐시 미스 → 직접 호출로 자동 복구

---

## ADR-004 · 프론트엔드 프레임워크: Next.js 14 (Pages Router)

**상태:** Accepted (2026-04-19)

**컨텍스트**  
금융 데이터 대시보드는 SSR 필요성이 낮고 클라이언트 상태가 복잡하다. App Router(Next.js 13+)는 생태계가 아직 안정화 중이었다.

**결정**  
Next.js 14 Pages Router 채택. Recharts + Lightweight Charts로 차트 구현, SWR로 데이터 패칭.

**결과**
- `dynamic import + ssr: false`로 차트 컴포넌트 클라이언트 전용 렌더링
- SWR의 `refreshInterval`로 30~60초 자동 갱신 패턴 통일
- App Router 대비 마이그레이션 부담 없음
- 향후 App Router 전환 시 pages → app 디렉터리 이전 필요

---

## ADR-005 · Python 패키지 매니저: uv

**상태:** Accepted (2026-04-19)

**컨텍스트**  
pip + venv는 설치 속도가 느리고 lock 파일 관리가 번거롭다. Poetry는 무겁다.

**결정**  
Astral의 uv 채택. `uv.lock` 기반 재현 가능한 빌드, `uv run` 단일 명령 실행.

**결과**
- 패키지 설치 속도 pip 대비 10~100× 빠름
- `pyproject.toml` 단일 파일로 의존성·lint·test 설정 통합
- Docker 이미지 빌드 시간 단축

---

## ADR-006 · ORM: SQLAlchemy 2.0 Async

**상태:** Accepted (2026-04-19)

**컨텍스트**  
FastAPI의 비동기 환경에서 동기 ORM을 사용하면 이벤트 루프 블로킹이 발생한다.

**결정**  
SQLAlchemy 2.0의 `AsyncSession` + `asyncpg` 드라이버 채택. 마이그레이션은 Alembic.

**결과**
- `await session.execute(select(...))` 패턴 일관화
- Alembic 버전 파일로 스키마 변경 이력 관리 (`0001_initial` → `0006_notification`)
- raw SQL f-string 금지 → SQL 인젝션 방지

---

## ADR-007 · 증권사 API: KIS Developers + 키움 OpenAPI+

**상태:** Accepted (2026-04-19)

**컨텍스트**  
국내/해외 주식 실시간 잔고 조회가 핵심 기능이다. 여러 증권사 계좌를 보유 중이다.

**결정**  
- 한국투자증권 KIS Developers API: 국내주식 `TTTC8434R`, 해외주식 거래소별 조회
- 키움증권 OpenAPI+ REST: 실전 `JTCE5005R` / 모의 `VTCE5005R`
- `BrokerFactory` 패턴으로 증권사별 구현을 `UnifiedSummary`로 추상화

**결과**
- 신규 증권사 추가 시 `BrokerFactory.register()` + 서비스 구현만 추가하면 됨
- 계좌별 `app_key/app_secret` → DB(`broker_account`) 저장, 환경변수 fallback 지원
- 실전/모의 환경 분리 (`KIS_MOCK`, `KIWOOM_MOCK`)

---

## ADR-008 · AI 기능: Anthropic Claude API

**상태:** Accepted (2026-04-20)

**컨텍스트**  
월간 리포트, 투자 전략서, 종목 심층 분석을 자동 생성해야 한다.

**결정**  
Anthropic Python SDK (`anthropic>=0.40.0`), 모델 `claude-sonnet-4-6`. Redis로 응답 캐싱(30분~2시간).

**결과**
- 포트폴리오 컨텍스트를 프롬프트에 주입 → 개인화된 한국어 리포트 생성
- 캐시 히트 시 API 비용 없음
- API 키 미설정 시 503 반환 (graceful degradation)

---

## ADR-009 · 스케줄러: APScheduler

**상태:** Accepted (2026-04-19)

**컨텍스트**  
평일 장 마감 후 스냅샷 저장, 30분 간격 알림 체크를 자동 실행해야 한다.

**결정**  
APScheduler 3.x (in-process, AsyncIOScheduler) 채택. Celery + Redis Worker는 현재 규모에서 과도하다.

**결과**
- FastAPI lifespan에서 scheduler 시작·종료 관리
- `CronTrigger`(스냅샷), `IntervalTrigger`(알림 체크) 두 가지 패턴 사용
- 트래픽 급증 시 Celery로 마이그레이션 필요 (TD-10 후보)

---

## ADR-010 · 로컬 개발 환경: Docker Compose

**상태:** Accepted (2026-04-19)

**컨텍스트**  
PostgreSQL(TimescaleDB) + Redis를 로컬에서 일관된 환경으로 실행해야 한다.

**결정**  
`docker-compose.yml`로 postgres + redis + backend + frontend 4개 서비스 정의. 백엔드·프론트는 볼륨 마운트로 핫리로드.

**결과**
- `docker compose up -d`만으로 전체 스택 실행
- DB/Redis는 named volume으로 데이터 영속
- backend `.venv`, frontend `node_modules`도 named volume → 컨테이너 재시작 시 재설치 불필요
