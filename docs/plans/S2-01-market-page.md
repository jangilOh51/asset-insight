# S2-01 시황 페이지 계획서

## 목적 / 배경
주요 지수(KOSPI / S&P500 / NASDAQ)와 환율(USD/KRW)을 한눈에 확인하고,
보유 종목 기반 트리맵으로 포트폴리오 시황을 시각화한다.
기존 `SectorTreemap`이 보유 종목 실데이터를 이미 사용하므로 트리맵은 그대로 활용.

## 인수 기준 (Acceptance Criteria)
- AC-01: 주요 지수 4종(KOSPI, S&P 500, NASDAQ, USD/KRW) 현재가 + 등락률 표시
- AC-02: 전일 대비 상승/하락 컬러 구분 (수익=빨강 #EF4444, 손실=파랑 #60A5FA)
- AC-03: 보유 종목 트리맵 — 실시간 종목별 등락률 색상
- AC-04: 로딩/에러/빈화면 5가지 UI 상태 구현
- AC-05: Redis 캐시 5분 (TTL=300s) — 동일 요청 반복 방지
- AC-06: 단위 테스트 작성

## API 설계
### GET /api/v1/market/indices
```json
{
  "KOSPI":   { "name": "KOSPI",     "value": 2750.5, "change": 12.3,  "change_pct": 0.45,  "updated_at": "2026-04-20T09:00:00" },
  "SP500":   { "name": "S&P 500",   "value": 5200.3, "change": -8.2,  "change_pct": -0.16, "updated_at": "..." },
  "NASDAQ":  { "name": "NASDAQ",    "value": 16800.0,"change": 45.3,  "change_pct": 0.27,  "updated_at": "..." },
  "USD_KRW": { "name": "USD/KRW",   "value": 1380.5, "change": 2.3,   "change_pct": 0.17,  "updated_at": "..." }
}
```
데이터 소스: Yahoo Finance v8 chart API (2일치 조회 → 전일 대비 등락 계산)

## 영향 범위
- 신규: `backend/app/services/market/indices.py`
- 신규: `backend/app/api/v1/endpoints/market.py`
- 수정: `backend/app/api/v1/router.py`
- 신규: `frontend/pages/market/index.tsx`
- 신규: `backend/tests/test_market.py`

## 예상 소요 시간
약 2~3시간
