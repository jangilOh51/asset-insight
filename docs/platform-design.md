# Asset Insight — 개인 자산관리 플랫폼 기획서

> 작성일: 2026-04-19  
> 참여: 시장조사 · 경쟁사분석 · UX디자인 · 백엔드개발 · 프론트엔드개발 팀

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [시장 분석](#2-시장-분석)
3. [경쟁사 분석 및 차별화 전략](#3-경쟁사-분석-및-차별화-전략)
4. [핵심 기능 정의](#4-핵심-기능-정의)
5. [화면 구성 (UX/UI)](#5-화면-구성-uxui)
6. [백엔드 아키텍처 및 API 설계](#6-백엔드-아키텍처-및-api-설계)
7. [프론트엔드 구조 및 개발 계획](#7-프론트엔드-구조-및-개발-계획)
8. [개발 로드맵](#8-개발-로드맵)

---

## 1. 서비스 개요

### 비전

> **"흩어진 내 모든 투자 자산을 하나로, 매일 자동으로 분석하고 AI가 전략까지 제안한다"**

개인 투자자가 여러 증권사·은행에 분산된 국내/해외 자산을 하나의 대시보드에서 조회하고, 일별 자산 스냅샷 이력을 기반으로 트렌드를 분석한다. 나아가 AI(Claude API)가 시황 요약과 투자 전략서를 자동 생성하는 "나만의 AI 애널리스트" 플랫폼이다.

### 핵심 가치 제안

| 가치 | 설명 |
|------|------|
| **통합** | 국내/해외 증권 계좌 + 현금을 단일 뷰로 |
| **자동화** | 매일 자산 스냅샷 자동 저장, 시황 자동 수집 |
| **인사이트** | AI 기반 시황 요약 · 투자 전략서 · 종목 리포트 |
| **추적** | 일/주/월 자산 트렌드 + 실적발표 일정 관리 |

---

## 2. 시장 분석

### 시장 규모

| 구분 | 2024년 | 2026년 (추정) | 2028년 (전망) | CAGR |
|------|--------|--------------|--------------|------|
| 글로벌 WealthTech | $5.4조 | $6.8조 | $9.5조 | ~14% |
| 글로벌 PFM 앱 | $14.2억 | $19.1억 | $31.5억 | ~17% |
| 국내 핀테크 자산관리 | 약 3.2조 원 | 약 4.1조 원 | 약 6.0조 원 | ~15% |

국내 핀테크 앱 MAU는 2025년 기준 약 **2,800만 명**, 증권 계좌 수 **7,800만 개** 돌파.

### 타겟 고객

| 세그먼트 | 연령 | 성향 | 비중 | 핵심 니즈 |
|---------|------|------|------|----------|
| 자산형성기 직장인 | 30~39세 | 중립~성장형 | **38%** | 다계좌 통합, 손익 자동 계산 |
| 디지털 네이티브 투자 입문자 | 20~29세 | 공격형 | 32% | 해외주식, ETF 트래킹 |
| 자산관리 고도화 수요층 | 40~49세 | 안정성장형 | 22% | AI 분석, 세금 최적화 |
| 은퇴준비 선행층 | 50대 초반 | 안정형 | 8% | 연금 통합, 리스크 관리 |

**주요 페인포인트**
- 분산된 계좌를 통합 조회할 수단 없음
- 기관 대비 개인 투자자의 정보·분석 도구 격차
- 감정적 투자 판단 → AI 인사이트 수요 증가

### 성장 동인

1. **마이데이터 제도 정착** — 금융 정보 통합 조회 법적 기반
2. **주식·ETF 투자 대중화** — MZ세대 투자자 급증
3. **AI 투자 어드바이저 확산** — LLM 기반 자동화 리포팅
4. **해외주식 투자 급증** — 환율·세금 관리 기능 수요 확대

---

## 3. 경쟁사 분석 및 차별화 전략

### 직접 경쟁사

| 서비스 | MAU | 핵심 강점 | 핵심 약점 |
|--------|-----|-----------|-----------|
| 토스 | ~1,600만 | 브랜드·간편결제 | 투자 분석 깊이 부족 |
| 뱅크샐러드 | ~500만 | 자산 분류 UX | 증권 연동 분석 약함 |
| 카카오페이 | ~2,200만 | 결제·보험 생태계 | 포트폴리오 심층 분석 미흡 |
| 삼성증권 mPOP | ~300만 | 거래 완성도 | 자산 통합 불가 |
| 미래에셋 m.able | ~250만 | 글로벌 투자 지원 | 타사 계좌 연동 없음 |

### 기능 비교 (Feature Matrix)

| 기능 | **Asset Insight** | 토스 | 뱅크샐러드 | 증권사 앱 |
|------|:-----------------:|:----:|:----------:|:---------:|
| 다기관 증권 계좌 통합 | ✅ | ⚠️ | ⚠️ | ❌ |
| 일별 자산 스냅샷·히스토리 | ✅ | ❌ | ✅ | ❌ |
| 종목별 수익률 분석 | ✅ | ❌ | ❌ | ✅ |
| AI 투자 전략서 자동 생성 | ✅ | ❌ | ❌ | ❌ |
| 매일 시황 자동 정리 | ✅ | ❌ | ❌ | ❌ |
| 실적발표 일정 관리 | ✅ | ❌ | ❌ | ⚠️ |
| 해외주식 통합 관리 | ✅ | ❌ | ❌ | ⚠️ |

### 포지셔닝

```
          [투자 분석 깊이]
               ▲
   Asset Insight ★
               │     미래에셋·삼성증권
───────────────┼──────────────────── [자산 통합 범위]
   카카오페이  │  뱅크샐러드
         토스  │
               ▼
```

**결제/생활금융** 영역은 토스·카카오에 양보하고,  
**멀티 계좌 통합 + AI 투자 분석** 포지션을 선점한다.

---

## 4. 핵심 기능 정의

### 기능 우선순위

| 우선순위 | 기능 | 설명 |
|---------|------|------|
| P0 | **일별 자산 자동 저장** | 매일 18시 KIS API → DB 스냅샷 |
| P0 | **자산 트렌드 대시보드** | 일/주/월 차트, 계좌별 구성 |
| P0 | **실시간 계좌 조회** | 국내/해외 종목별 현재 손익 |
| P1 | **매일 시황 정리** | 지수·뉴스 자동 수집 + AI 요약 |
| P1 | **투자 전략서 작성** | Claude API 기반 자동 생성 |
| P1 | **실적발표 일정 관리** | 보유 종목 실적 캘린더 |
| P2 | **종목 리포트 분석** | 개별 종목 심층 AI 분석 |
| P2 | **세금 최적화 시뮬레이션** | 양도소득세·금융소득 계산 |

---

## 5. 화면 구성 (UX/UI)

### 디자인 시스템

| 역할 | 색상명 | HEX |
|------|--------|-----|
| Primary | Deep Navy | `#0D1B2A` |
| Secondary | Slate Blue | `#1E3A5F` |
| Accent | Electric Cyan | `#00C4CC` |
| Surface | Dark Carbon | `#141920` |
| Profit | Emerald | `#00C896` |
| Loss | Coral Red | `#FF4D6D` |
| Neutral | Muted Silver | `#8A9BB0` |

- **폰트**: Pretendard (헤딩/본문) + Roboto Mono (금융 수치)
- **테마**: 다크 모드 기본, 데이터 중심 미니멀리즘

### 정보 아키텍처

```
Asset Insight
├── 대시보드          총 자산 현황, 7일 트렌드, 자산 구성
├── 자산 트렌드       일/주/월 차트, 기간별 수익률
├── 실시간 계좌       국내/해외 종목별 실시간 현황
├── 시황 정리         매일 자동 수집 시황 카드
├── 투자 전략서       AI 생성 전략 문서, 버전 히스토리
├── 실적 캘린더       보유 종목 실적발표 일정
└── 설정             계좌 연동, 알림 설정
```

### 화면별 레이아웃

#### 대시보드 메인

```
┌─────────────────────────────────────────────────────┐
│  LOGO              [알림🔔]  [마지막 업데이트: 14:32] │
├──────┬──────────────────────────────────────────────┤
│      │  총 자산          일간 손익        수익률      │
│ NAV  │  ₩ 152,340,000   +1,240,000     +0.82%       │
│      │  ─────────────────────────────────────────  │
│ 대시 │  [국내주식]       [해외주식]      [현금]       │
│ 트렌 │   ₩71.2M          ₩62.4M        ₩18.7M      │
│ 계좌 │  ─────────────────────────────────────────  │
│ 시황 │  [7일 스파크라인 차트]  [자산 구성 도넛 차트]   │
│ 전략 │  ─────────────────────────────────────────  │
│ 캘린 │  상위 보유 종목                               │
│ 설정 │  NVDA $112.3 × 50  ₩7,812K  +4.2%  ████▓   │
│      │  005930  ₩72,500   × 80   ₩5,800K  +1.8%   │
└──────┴──────────────────────────────────────────────┘
```

#### 자산 트렌드 페이지

```
┌─────────────────────────────────────────────────────┐
│  [일] [주] [월]  탭 전환            [기간 선택 ▼]   │
│  ─────────────────────────────────────────────────  │
│  ▲                                                  │
│  │  ╭────────────────────────────────╮ ← 총자산     │
│  │ ─╯       ╭──────────────╮          ← 국내        │
│  │          │               ╰──────── ← 해외        │
│  └─────────────────────────────────────────── ▶    │
│                                                     │
│  [기간 최고 ₩162M]  [기간 최저 ₩143M]  [변동폭 ±8%] │
│  특정 날짜 클릭 → 해당일 포트폴리오 사이드패널 표시  │
└─────────────────────────────────────────────────────┘
```

#### 시황 정리 페이지

```
┌─────────────────────────────────────────────────────┐
│  시황 정리   [오늘] [이번주] [전체]  [국내/해외 필터] │
├──────────────────┬──────────────────────────────────┤
│  2026-04-19      │  2026-04-18     │  2026-04-17    │
│  ─────────────── │  ─────────────── │  ─────────── │
│  KOSPI  +0.8%    │  FOMC 금리동결   │  고용지표 호조│
│  NASDAQ -0.3%    │  증시 반응 혼조  │  나스닥 +1.4% │
│  [AI 요약 펼치기▼]│  [펼치기 ▼]     │  [펼치기 ▼]  │
│                  │                  │               │
│  관련 보유종목:   │                  │               │
│  NVDA ▲ TSLA ▼  │                  │               │
└──────────────────┴──────────────────┴───────────────┘
```

#### 투자 전략서 페이지

```
┌─────────────────────────────────────────────────────┐
│  투자 전략서          2026-04-19      [AI 재생성 🤖] │
│  [변동성 주의] [기술주 비중 유지] [현금 확보]         │
│  ─────────────────────────────────────────────────  │
│  ## 현재 시장 환경                                   │
│  나스닥 조정 국면. 반도체 섹터 차별화 진행 중.        │
│  FOMC 금리 동결 이후 성장주 회복 기대감 확산...       │
│                                                     │
│  ## 보유 종목 점검                                   │
│  - NVDA: 실적 발표 앞두고 변동성 확대 예상           │
│  - 삼성전자: HBM3E 수주 기대감 긍정적               │
│                                                     │
│  ## 리밸런싱 제안                                    │
│  현금 비중 10% → 15% 확대, 단기 변동성 대응         │
└─────────────────────────────────────────────────────┘
```

#### 실적발표 캘린더

```
┌─────────────────────────────────────────────────────┐
│  ◀  2026년 4월  ▶              [보유종목만 ☑]        │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────┤
│  월  │  화  │  수  │  목  │  금  │  토  │  일      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────┤
│      │  1   │  2   │  3   │  4   │  5   │  6       │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────┤
│  7   │  8   │  9   │  10  │  11  │  12  │  13      │
│      │★TSLA │      │★NVDA │      │      │          │
│      │ AMC  │      │ BMO  │      │      │          │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────┤
│  14  │  15  │  16  │  17  │  18  │  19  │  20      │
│      │      │★AAPL │      │★005930│     │          │
│      │      │ BMO  │      │ AMC  │      │          │
└──────┴──────┴──────┴──────┴──────┴──────┴──────────┘
  ★ = 보유 종목  BMO = 장 전  AMC = 장 후
  클릭 시 → 예상 EPS / 실제 EPS / 매출 팝오버 표시
```

### UX 핵심 원칙

1. **데이터 계층화** — 요약 → 드릴다운, 첫 화면에서 과부하 방지
2. **컨텍스트 유지** — 사이드패널·모달로 페이지 이동 최소화
3. **감정 중립 시각화** — 수익/손실 색상은 상태 전달에만 사용
4. **시간 기준 일관성** — 모든 데이터에 타임스탬프, 실시간/지연 구분 표시
5. **액션 최소화** — 조회 중심, CTA는 전략서 작성·알림 설정에만 집중

### 반응형 전략

| 구분 | 레이아웃 | 특이사항 |
|------|----------|----------|
| 데스크톱 (1280px+) | 좌측 고정 사이드바 | 사이드패널 병렬 표시 |
| 태블릿 (768~1279px) | 콜랩스 사이드바 (아이콘) | 차트 단순화 |
| 모바일 (767px 이하) | 하단 탭바 5개 | 카드 스택 세로 스크롤 |

---

## 6. 백엔드 아키텍처 및 API 설계

### 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│              Web App (Next.js) / Mobile                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Application                    │
│  ┌─────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │  REST APIs  │  │   WebSocket   │  │  APScheduler  │ │
│  │  /api/v1/   │  │  계좌 실시간   │  │  자동 수집     │ │
│  └──────┬──────┘  └──────┬────────┘  └──────┬────────┘ │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                  │
┌─────────▼──────┐  ┌──────▼──────┐  ┌───────▼──────────┐
│  PostgreSQL    │  │    Redis    │  │   External APIs  │
│ +TimescaleDB   │  │   Cache     │  │  KIS / Claude /  │
│  시계열 저장   │  │  환율·시황   │  │  Alpha Vantage   │
└────────────────┘  └─────────────┘  └──────────────────┘
```

### DB 스키마

#### position_snapshot (종목별 일별 스냅샷 — hypertable)

```sql
time                 TIMESTAMPTZ  PK  -- 파티션 기준
account_no           VARCHAR(20)  PK
symbol               VARCHAR(20)  PK
market               VARCHAR(5)   PK  -- KR, US, HK, CN, JP
asset_type           ENUM             -- stock_kr, stock_us, etf_kr ...
name                 VARCHAR(100)
quantity             NUMERIC(18,6)
available_qty        NUMERIC(18,6)    -- 매도가능수량
currency             VARCHAR(3)       -- KRW, USD, HKD ...
avg_cost             NUMERIC(18,6)    -- 매입평균가 (원화 or 외화)
current_price        NUMERIC(18,6)    -- 현재가
purchase_amount_krw  NUMERIC(18,2)    -- KRW 환산 매입금액
eval_amount_krw      NUMERIC(18,2)    -- KRW 환산 평가금액
profit_loss_krw      NUMERIC(18,2)    -- KRW 환산 손익
return_pct           NUMERIC(8,4)     -- 수익률 (%)
exchange_rate        NUMERIC(10,4)    -- 환율
exchange_code        VARCHAR(10)      -- NASD, NYSE ...
```

#### account_daily_summary (계좌 일별 요약 — hypertable)

```sql
time                  TIMESTAMPTZ  PK
account_no            VARCHAR(20)  PK
purchase_amount_krw   NUMERIC(18,2)   -- 총 매입금액
eval_amount_krw       NUMERIC(18,2)   -- 총 평가금액
profit_loss_krw       NUMERIC(18,2)   -- 총 손익
return_pct            NUMERIC(8,4)    -- 수익률
cash_krw              NUMERIC(18,2)   -- 원화 예수금
cash_foreign_krw      NUMERIC(18,2)   -- 외화예수금 KRW 환산
total_asset_krw       NUMERIC(18,2)   -- 총 자산 (현금+주식)
position_count        INTEGER
```

#### market_daily_summary (시황 정리 — hypertable)

```sql
id                BIGSERIAL   PK
date              DATE        PK (hypertable 기준)
market            VARCHAR(10)     -- KOSPI, KOSDAQ, NASDAQ, NYSE
index_close       NUMERIC(12,2)
index_chg_pct     NUMERIC(6,3)
top_sectors       JSONB           -- [{"sector":"반도체","chg":2.1}]
news_headlines    JSONB           -- [{"title":"...","url":"..."}]
ai_summary        TEXT            -- Claude 생성 시황 요약
```

#### investment_strategy (투자 전략서)

```sql
id              UUID        PK
title           VARCHAR(200)
strategy_date   DATE
tickers         TEXT[]          -- ['005930','NVDA','AAPL']
rationale       TEXT            -- 사용자 메모
ai_content      TEXT            -- Claude 생성 전략 본문
ai_model        VARCHAR(50)     -- 'claude-sonnet-4-6'
status          VARCHAR(20)     -- draft / published / archived
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### earnings_calendar (실적 일정)

```sql
id              BIGSERIAL   PK
ticker          VARCHAR(20)
company_name    VARCHAR(100)
market          VARCHAR(10)
announce_date   DATE
announce_time   VARCHAR(15)     -- before_open / after_close
eps_estimate    NUMERIC(10,4)
eps_actual      NUMERIC(10,4)
revenue_est     BIGINT
revenue_actual  BIGINT
surprise_pct    NUMERIC(6,2)    -- 어닝 서프라이즈 (%)
source          VARCHAR(30)     -- kis / alpha_vantage / manual
```

### API 엔드포인트

#### 스냅샷 그룹 `/api/v1/snapshot`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/summary/{account_no}` | 계좌 일별 요약 목록 |
| GET | `/positions/{account_no}` | 특정 날짜 종목별 현황 |
| POST | `/run` | 수동 스냅샷 즉시 실행 |
| GET | `/ws/account` | WebSocket 실시간 계좌 |

#### 시황 그룹 `/api/v1/market`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/summary` | 일별 시황 목록 |
| POST | `/summary/generate` | AI 시황 요약 생성 (수동) |
| GET | `/news` | 헤드라인 뉴스 목록 |

#### 전략 그룹 `/api/v1/strategies`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/` | 전략서 목록 |
| POST | `/` | 전략서 생성 (AI 옵션 포함) |
| GET | `/{id}` | 전략서 상세 |
| PUT | `/{id}` | 수정 |
| DELETE | `/{id}` | 삭제 |
| POST | `/{id}/regenerate` | AI 재생성 |

**POST /strategies 요청 예시:**
```json
{
  "title": "2Q 반도체 비중 확대",
  "tickers": ["005930", "NVDA"],
  "rationale": "HBM 수요 증가 근거로 반도체 비중 확대 검토",
  "use_ai": true
}
```

#### 일정 그룹 `/api/v1/calendar`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/earnings` | 실적 일정 조회 |
| POST | `/earnings` | 수동 일정 등록 |
| PUT | `/earnings/{id}` | 실적 결과 업데이트 |
| GET | `/events` | 월별 주요 이벤트 |

#### 트렌드 그룹 `/api/v1/trend`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/{account_no}?period=daily\|weekly\|monthly` | 자산 트렌드 집계 |
| GET | `/{account_no}/composition` | 자산 구성 비율 |

### 스케줄러 작업 목록

| Job | 주기 | 실행 시각 | 데이터 소스 | 저장 대상 |
|-----|------|-----------|------------|----------|
| `daily_position_snapshot` | 매일 | 16:10 | KIS 잔고 API | position_snapshot |
| `daily_account_summary` | 매일 | 16:15 | KIS 잔고 + 환율 | account_daily_summary |
| `market_index_collect` | 매일 | 16:30 | KIS 지수 API | market_daily_summary |
| `news_collect` | 매일 | 17:00 | 네이버RSS + Alpha Vantage | news_headlines |
| `ai_market_summary` | 매일 | 17:30 | market_daily_summary | ai_summary 업데이트 |
| `earnings_sync` | 매주 월요일 | 08:00 | Alpha Vantage | earnings_calendar |
| `exchange_rate_refresh` | 매시간 | :05 | open.er-api.com | Redis TTL=3600 |

### Claude API 연동 패턴

```python
# services/ai_strategy.py
async def generate_strategy(tickers: list[str], rationale: str) -> str:
    context = await build_context(tickers)  # 스냅샷 + 시황 + 실적 집계
    async with anthropic.AsyncAnthropic() as client:
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system="당신은 전문 포트폴리오 매니저입니다. "
                   "제공된 자산 현황과 시장 데이터를 바탕으로 "
                   "투자 전략서를 마크다운 형식으로 작성해주세요.",
            messages=[{"role": "user", "content": f"{context}\n\n{rationale}"}]
        )
    return message.content[0].text
```

---

## 7. 프론트엔드 구조 및 개발 계획

### 페이지 구조

```
pages/
├── _app.tsx                 전역 레이아웃, SWR Provider, WS 초기화
├── index.tsx                → /dashboard 리다이렉트
├── dashboard/index.tsx      대시보드 메인
├── trend/index.tsx          자산 트렌드 (일/주/월)
├── accounts/index.tsx       실시간 계좌 현황
├── market/index.tsx         시황 정리
├── strategy/index.tsx       투자 전략서
└── earnings/index.tsx       실적발표 캘린더
```

### 컴포넌트 계층

```
AppLayout
├── Sidebar          네비게이션 + 총 자산 미니 위젯
├── Header           마지막 업데이트 시각, WS 연결 상태
└── [page content]
    └── DashboardPage
        ├── TotalAssetHeader     총 자산, 일간 손익
        ├── DailyTrendMiniChart  7일 스파크라인 (Recharts AreaChart)
        ├── AssetAllocationChart 도넛 차트 (Recharts PieChart)
        └── TopHoldingsTable     상위 5종목

    └── TrendPage
        ├── PeriodToggle         일/주/월 탭
        └── AssetLineChart       라인 차트 (TradingView or Recharts)

    └── MarketPage
        └── MarketCardGrid → MarketCardItem (아코디언)

    └── StrategyPage
        ├── StrategyHeader       태그, 재생성 버튼
        └── StrategyDocument     react-markdown 렌더링

    └── EarningsPage
        ├── EarningsCalendar     월간 그리드
        └── EarningsEventPopover 종목 상세 팝오버
```

### 공통 컴포넌트 (`components/ui/`)

| 컴포넌트 | 역할 |
|----------|------|
| `StatCard` | 숫자 + 라벨 + 등락률 배지 |
| `DataTable` | 정렬/페이지네이션 범용 테이블 |
| `ChartWrapper` | Recharts 공통 ResponsiveContainer |
| `Badge` | 상승(green)/하락(red)/중립 배지 |
| `SkeletonLoader` | SWR 로딩 플레이스홀더 |

### SWR 데이터 패칭 전략

```typescript
usePortfolio()    // 총 자산, 종목별 비중     refreshInterval: 30s
useTrend(period)  // 일/주/월 차트 데이터
useAccounts()     // 계좌 스냅샷 + WS 실시간 병합
useMarket()       // 시황 카드 목록           revalidateOnFocus: false
useStrategy()     // 최신 전략 문서           staleTime: 1h
useEarnings()     // 실적 일정               dedupingInterval: 10m
```

**WebSocket 구조:**
```
WebSocketContext (전역, _app.tsx)
  └── wss://api.asset-insight/ws/prices
      └── 수신: { symbol, price, change, changeRate }
          → useSWR mutate()로 계좌 페이지 실시간 갱신
```

### 차트 라이브러리 활용

| 차트 종류 | 라이브러리 | 사용 화면 |
|-----------|-----------|----------|
| Area (스파크라인) | Recharts | 대시보드 미니 트렌드 |
| Pie/Donut | Recharts | 자산 구성 비율 |
| Line+Bar Composed | Recharts | 트렌드 기본 뷰 |
| 캔들스틱 | TradingView Lightweight Charts | 트렌드 고급 뷰 (토글) |
| Bar | Recharts | 계좌 수익률 비교 |

---

## 8. 개발 로드맵

### Phase 1 — 기반 (현재 완료)
- ✅ FastAPI + TimescaleDB + Redis 인프라
- ✅ KIS API 국내/해외 잔고 조회
- ✅ position_snapshot + account_daily_summary DB 및 스케줄러
- ✅ 자산 트렌드 API (time_bucket 집계)

### Phase 2 — 프론트엔드 + 시황 (Sprint 1~3, 6주)

**Sprint 1 (2주) — 기반 구조 + 대시보드**
- AppLayout, Sidebar, Header
- StatCard, DataTable, ChartWrapper 공통 컴포넌트
- 대시보드 페이지 (총 자산, 도넛 차트, 종목 테이블)
- SWR 공통 설정 및 API 클라이언트

**Sprint 2 (2주) — 실시간 + 트렌드 + 계좌**
- WebSocketContext 실시간 시세 연동
- 자산 트렌드 페이지 (Recharts + Lightweight Charts 토글)
- 실시간 계좌 페이지 (국내/해외 탭)
- SkeletonLoader + 에러 바운더리

**Sprint 3 (2주) — 콘텐츠 화면 + 마감**
- 시황 정리 카드 그리드 + 아코디언
- 투자 전략서 마크다운 렌더링 + 재생성 UI
- 실적발표 캘린더 + 팝오버
- 반응형 최종 점검, Lighthouse 성능 최적화

### Phase 3 — AI 기능 (7~10주차)
- Claude API 연동: 시황 AI 요약 자동 생성
- 투자 전략서 AI 자동 생성 + 재생성
- 실적발표 데이터 수집 자동화 (Alpha Vantage)

### Phase 4 — 고도화 (11주차~)
- 종목별 AI 심층 분석 리포트
- 세금 최적화 시뮬레이션
- 연금(IRP/퇴직연금) 통합 관리
- 모바일 앱 (React Native)

---

*본 기획서는 시장조사 · 경쟁사분석 · UX디자인 · 백엔드 · 프론트엔드 팀의 분석을 종합하여 작성되었습니다.*
