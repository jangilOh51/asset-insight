# misc-20260421 작업 로그 — 키움증권 연동 정비

> 작업일: 2026-04-21
> 작업자: Claude/PM, Claude/백엔드, Claude/QA
> 상태: 완료

---

## [백엔드] 구현
- 작업 내용:
  1. `kiwoom/client.py`
     - Base URL 포트 추가: `https://openapi.kiwoom.com` → `https://openapi.kiwoom.com:9443`
     - 토큰 응답 유연화: `token` 또는 `access_token` 필드 모두 처리
     - 토큰 캐시 키에 실전/모의 구분 추가 (`mock_tag`)
     - 토큰 없는 경우 명시적 RuntimeError
  2. `kiwoom/balance.py`
     - TR ID 수정: KIS `TTTC8434R` → 키움 실전 `JTCE5005R` / 모의 `VTCE5005R`
     - `day_change_pct` 추가: `prdy_ctrt` 필드 파싱
     - `rt_cd` 비정상 응답 에러 처리 추가
     - 계좌번호 대시 없는 경우 기본 상품코드 `'01'` 처리
  3. `broker_factory.py`
     - 키움 포지션에 `day_change_pct` 전달 (누락됐었음)
     - 전역 환경변수 fallback: 계좌별 키 없으면 `kiwoom_app_key` / `kiwoom_app_secret` 사용
  4. `core/config.py`
     - `kiwoom_app_key`, `kiwoom_app_secret`, `kiwoom_account_no`, `kiwoom_mock` 필드 추가
  5. `.env.example`
     - 키움증권 환경변수 섹션 추가 및 가이드 주석
  6. `api/v1/endpoints/accounts.py`
     - 환경변수 키움 계좌 synthetic 추가 (`env-kiwoom`)
     - KIS synthetic `display_order` 998로 조정
  7. `tests/test_accounts.py`
     - `mock_settings`에 `kiwoom_account_no=""`, `kiwoom_app_key=""` 추가 (회귀 수정)
- 변경 파일:
  - `backend/app/services/kiwoom/client.py`
  - `backend/app/services/kiwoom/balance.py`
  - `backend/app/services/broker_factory.py`
  - `backend/app/core/config.py`
  - `backend/app/api/v1/endpoints/accounts.py`
  - `backend/tests/test_accounts.py`
  - `.env.example`
- PM 검토: ✅ 승인 — 실계좌 연동 준비 완료, 기존 테스트 회귀 없음

## [QA] 테스트
- `tests/test_kiwoom.py` 신규 작성 (12개):
  - 토큰 캐시 미스/히트
  - 토큰 응답 필드 `access_token` 변형 처리
  - 토큰 없는 경우 RuntimeError
  - 잔고 정상 조회 + day_change_pct 확인
  - 실전/모의 TR ID 분기 확인
  - rt_cd 오류 응답 처리
  - 네트워크 예외 처리
  - 수량 0 종목 필터링
  - 계좌번호 대시 없는 경우
  - broker_factory UnifiedSummary 변환 및 day_change_pct 전달
  - 전역 env 키 fallback
- 결과: 146 passed, 0 failed (전체 테스트)
- PM 검토: ✅ 승인 — 146 passed, 0 failed 확인

## [PM] 최종 완료 선언
- 완료 일시: 2026-04-21
- 최종 판단: 키움증권 REST API 연동 정비 완료
  - 잘못된 KIS tr_id → 올바른 키움 tr_id 교체
  - day_change_pct 전달 체인 완성
  - 전역 env 키 fallback 지원
  - 신규 테스트 12개 추가, 전체 146 passed
  - `.env`에 `KIWOOM_APP_KEY`, `KIWOOM_APP_SECRET`, `KIWOOM_ACCOUNT_NO`, `KIWOOM_MOCK` 입력하면 바로 동작
