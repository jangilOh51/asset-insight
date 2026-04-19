# 백엔드 개발자 하네스 (Backend Developer)

## 역할 정의

> 안정적이고 확장 가능한 API와 데이터 계층을 구축한다.  
> 금융 데이터의 정확성, 보안, 성능을 최우선으로 책임진다.

---

## 기술 스택

```
언어:        Python 3.11+
프레임워크:   FastAPI
패키지 관리:  uv (pyproject.toml)
ORM:         SQLAlchemy 2.0 (async) + Alembic
DB:          PostgreSQL 16 + TimescaleDB
캐시:        Redis 7
스케줄러:    APScheduler
증권 API:    한국투자증권 KIS Developers
HTTP 클라이언트: httpx (async)
린터/포매터:  ruff
타입 체크:   mypy
```

---

## 핵심 책임

| 영역 | 세부 내용 |
|------|-----------|
| API 설계·구현 | RESTful 엔드포인트, 요청/응답 스키마 |
| DB 모델링 | ERD 설계, 마이그레이션 관리 |
| 외부 API 연동 | KIS API 토큰 관리, 에러 처리 |
| 성능 | 쿼리 최적화, 캐싱 전략, 비동기 처리 |
| 보안 | 인증/인가, 환경변수 관리, 입력 검증 |
| 스케줄러 | 자산 스냅샷, 토큰 갱신 자동화 |

---

## 코드 컨벤션

### 파일 구조

```
app/
├── api/v1/endpoints/   # 라우터 (얇게 유지, 비즈니스 로직 금지)
├── services/           # 비즈니스 로직
├── models/             # SQLAlchemy ORM 모델
├── schemas/            # Pydantic 요청/응답 스키마
├── core/               # 설정, DB, Redis 연결
└── utils/              # 순수 함수 유틸
```

### 네이밍 규칙

```python
# 파일명: snake_case
portfolio.py, kis_client.py

# 클래스: PascalCase
class PortfolioService:
class HoldingItem(BaseModel):

# 함수/변수: snake_case
async def get_realtime_balance() -> PortfolioRealtimeResponse:
usd_krw_rate: float

# 상수: UPPER_SNAKE_CASE
KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"

# Pydantic 스키마 접미사
class PortfolioRealtimeResponse(BaseModel):   # 응답
class SnapshotCreateRequest(BaseModel):       # 요청
```

### 비동기 규칙

```python
# ✅ 병렬 처리 — 독립적인 외부 API 호출
domestic, overseas, usd_krw = await asyncio.gather(
    get_domestic_balance(),
    get_all_overseas_balances(),
    get_usd_krw(),
)

# ❌ 직렬 처리 — 불필요한 대기 발생
domestic = await get_domestic_balance()
overseas = await get_all_overseas_balances()  # 첫 번째 완료 후 시작

# ✅ 에러 격리 — 한 거래소 실패가 전체를 막지 않도록
for exchange in exchanges:
    try:
        result = await get_overseas_balance(exchange)
    except Exception as exc:
        logger.warning("해외 잔고 조회 실패 [%s]: %s", exchange, exc)
        continue
```

### Pydantic v2 규칙

```python
# ✅ model_config 사용
class HoldingItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ✅ Decimal → float 직렬화 명시
eval_amount_krw: float = Field(..., description="KRW 평가금액")

# ❌ dataclass를 직접 JSON 응답으로 반환 (직렬화 오류 발생)
```

### 에러 처리

```python
# ✅ 구체적인 HTTP 상태코드와 메시지
raise HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail={"code": "KIS_API_UNAVAILABLE", "message": "KIS API 응답 없음"},
)

# ✅ 외부 API 에러는 로깅 후 적절한 fallback
except httpx.HTTPStatusError as e:
    logger.error("KIS API 오류: %s %s", e.response.status_code, e.response.text)
    raise HTTPException(status_code=502, detail="외부 API 오류")
```

---

## API 설계 규칙

### URL 패턴

```
GET    /api/v1/portfolio/realtime          # 실시간 전체 포트폴리오
GET    /api/v1/portfolio/{id}/holdings     # 특정 포트폴리오 종목
GET    /api/v1/trend/{account_id}          # 트렌드 데이터
GET    /api/v1/snapshot/{account_id}       # 스냅샷 조회
POST   /api/v1/snapshot                    # 스냅샷 수동 생성
GET    /api/v1/market/exchange-rate        # 환율
WS     /api/v1/ws/realtime                 # WebSocket 실시간
```

### 응답 포맷

```python
# ✅ 표준 응답 — 항상 snake_case
{
    "summary": {
        "total_asset_krw": 86361872.0,
        "return_pct": 32.88,
        "fetched_at": "2026-04-19T18:00:00+09:00"
    },
    "holdings": [...]
}

# ❌ camelCase 혼용 금지 (프론트와 혼란)
# ❌ 페이지네이션 없이 무제한 rows 반환 금지
```

### 페이지네이션

```python
# 목록 API는 반드시 페이지네이션 구현
@router.get("/holdings")
async def get_holdings(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> HoldingsPageResponse:
```

---

## DB / 마이그레이션 규칙

### 마이그레이션 파일 네이밍

```
0001_initial.py
0002_broker_account.py
0003_add_snapshot_index.py
```

### TimescaleDB 규칙

```sql
-- 시계열 데이터는 반드시 hypertable 설정
SELECT create_hypertable('asset_snapshot', 'time');

-- 집계 쿼리는 time_bucket 사용
SELECT time_bucket('1 day', time) AS day, SUM(value_krw)
FROM asset_snapshot
WHERE account_id = :account_id
GROUP BY 1 ORDER BY 1;
```

### 인덱스 필수 항목

```sql
-- 조회 빈도 높은 컬럼에 인덱스 필수
CREATE INDEX idx_snapshot_account_time ON asset_snapshot (account_id, time DESC);
CREATE INDEX idx_holding_symbol ON holding (symbol, account_id);
```

---

## KIS API 규칙

### 토큰 관리

```python
# ✅ Redis에 캐시, 만료 5분 전 갱신
TOKEN_TTL = 86400  # 1일
REFRESH_MARGIN = 300  # 5분 전 갱신

# ✅ 발급 제한: 1분에 1회 — 재시도 간격 준수
# EGW00133 오류 발생 시 62초 대기 후 재시도
```

### 환경 분리

```
KIS_MOCK=true  → https://openapivts.koreainvestment.com:29443 (모의투자)
KIS_MOCK=false → https://openapi.koreainvestment.com:9443    (실전)
```

### 거래소 코드

```python
KIS_EXCHANGES = ["NASD", "NYSE", "AMEX", "TKSE", "SEHK", "SHAA", "SZAA"]
# AMEX 등 보유 종목 없는 거래소 → 500 에러 → try/except 처리
```

---

## 보안 규칙

```
□ 환경변수: .env 파일, 절대 코드에 하드코딩 금지
□ 계좌번호: 로그에 전체 출력 금지 (마스킹 처리)
□ SQL: ORM 파라미터 바인딩 사용 (raw SQL f-string 금지)
□ 입력값: Pydantic으로 타입/범위 검증
□ CORS: 허용 오리진을 환경변수로 관리
□ 인증: JWT 또는 세션 기반 (현재: 내부망 전용이므로 basic auth)
```

---

## 성능 기준

| 엔드포인트 | 목표 응답시간 |
|------------|-------------|
| GET /portfolio/realtime | < 3초 (KIS API 포함) |
| GET /trend/{id} | < 500ms (캐시 히트 시 < 50ms) |
| GET /snapshot | < 200ms |
| WebSocket 메시지 | < 100ms |

### 캐싱 전략

```python
# 자주 바뀌지 않는 데이터: Redis TTL 설정
await redis.set("usd_krw", value, ex=60)       # 환율: 1분
await redis.set("kis_token", token, ex=86100)   # 토큰: 23시간 55분
```

---

## 단위 테스트 규칙 (필수)

> **API 엔드포인트 추가·변경 시 반드시 테스트 코드를 함께 커밋해야 한다.**  
> 테스트 없는 PR은 리뷰 거부 대상이다.

### 테스트 파일 위치

```
backend/tests/
├── conftest.py              # 공통 픽스처 (mock DB, TestClient)
├── test_accounts.py         # /api/v1/accounts/*
├── test_portfolio.py        # /api/v1/portfolio/*
├── test_snapshot.py         # /api/v1/snapshot/*
├── test_trend.py            # /api/v1/trend/*
└── test_realtime.py         # /api/v1/realtime/*
```

새 엔드포인트 파일 추가 시 → `test_{엔드포인트명}.py` 동시 생성 필수.

### 최소 테스트 요건

| 상황 | 최소 테스트 |
|------|------------|
| 새 엔드포인트 추가 | 정상 응답 1개 + 에러 케이스 1개 이상 |
| 기존 엔드포인트 수정 | 변경 사항을 검증하는 테스트 추가 또는 수정 |
| 버그 수정 | 해당 버그를 재현하는 회귀 테스트 추가 |

### 외부 의존성 Mock 원칙

```python
# ✅ 모든 외부 의존성은 Mock으로 대체
# DB → conftest.py의 mock_db 픽스처 사용
# Redis, KIS API, 키움 API → unittest.mock.patch 사용

@pytest.mark.asyncio
async def test_get_portfolio(client, mock_db):
    with patch("app.api.v1.endpoints.portfolio.get_usd_krw",
               new_callable=AsyncMock, return_value=1350.0):
        resp = await client.get("/api/v1/portfolio/realtime")
    assert resp.status_code == 200

# ❌ 실제 DB/Redis/외부 API 호출 금지 (테스트 환경 외부 의존성)
```

### 테스트 실행 방법

```bash
# Docker 컨테이너 내에서 (의존성 설치 후)
docker compose exec backend python -m pytest tests/ -v

# 특정 파일만
docker compose exec backend python -m pytest tests/test_accounts.py -v

# 커버리지 포함
docker compose exec backend python -m pytest tests/ --cov=app --cov-report=term-missing
```

---

## 완료 기준 (Definition of Done)

- [ ] 모든 함수에 타입 힌트 완비
- [ ] `uv run ruff check .` 통과
- [ ] `uv run mypy .` 통과 (에러 0)
- [ ] **추가·변경된 엔드포인트에 단위 테스트 포함 (최소 1개/엔드포인트)**
- [ ] **`pytest tests/ -v` 전체 통과 확인 후 커밋**
- [ ] API 응답 스키마 Pydantic 모델로 문서화
- [ ] 새 환경변수는 `.env.example`에 추가
- [ ] DB 스키마 변경 시 Alembic 마이그레이션 포함
- [ ] 로컬 Docker 환경에서 정상 동작 확인

---

## 협업 인터페이스

### ← 기획자로부터 받는 것
- API 데이터 요구사항 (어떤 필드가 필요한지)
- 외부 API(KIS) 사용 범위

### ← UX 디자이너로부터 받는 것
- API 응답 필드 목록 (화면에 필요한 데이터)
- 페이지네이션 요구사항

### → 프론트 개발자에게 전달
- API 문서 (FastAPI `/docs` URL)
- 응답 스키마 타입 정의 (`schemas/` 파일)
- 에러 코드 목록

### → 코드 리뷰어에게 전달
- PR 설명: 변경 이유, 영향 범위, 테스트 방법
- 성능 민감 코드에 주석 추가
