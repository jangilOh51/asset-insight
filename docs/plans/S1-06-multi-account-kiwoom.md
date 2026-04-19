# S1-06 멀티계좌 + 키움증권 연동 계획서

> 상태: 🔄 진행 중  
> 스프린트: Sprint 1  
> 작성일: 2026-04-19

---

## 목적 / 배경

현재 시스템은 단일 KIS 계좌만 지원한다 (환경변수 고정).  
키움증권 계좌를 추가하고, 여러 계좌를 등록·관리·전환할 수 있는 구조로 확장한다.

**키움증권 API 방식**
- 키움 OpenAPI+는 Windows COM 기반 → Docker 환경 불가
- 키움 REST API (신규): 제한적 REST 지원, 잔고조회 가능
- **이번 구현**: KIS 패턴과 동일한 구조로 키움 클라이언트 작성.  
  실제 키움 REST 토큰/잔고 API 연동 + 미지원 기능은 stub

---

## 역할 배정

| 역할 | 담당 | 작업 |
|------|------|------|
| 기획자 | Claude/기획 | 기능 명세 |
| UX 디자이너 | Claude/디자인 | 계좌관리 화면 재설계 |
| 백엔드 개발자 | Claude/백엔드 | DB 마이그레이션, 키움 클라이언트, 멀티계좌 API |
| 프론트 개발자 | Claude/프론트 | 계좌관리 리뉴얼, 멀티계좌 선택 UI |
| 코드 리뷰어 | Claude/리뷰 | 보안(API 키 저장), 타입 안전성 |
| QA | Claude/QA | 계좌 추가/전환/삭제/활성화 시나리오 |

---

## 인수 기준 (Acceptance Criteria)

- [ ] KIS / 키움 계좌를 각각 추가할 수 있다
- [ ] 각 계좌별로 독립된 app_key / app_secret을 저장한다
- [ ] 포트폴리오 화면에서 계좌를 선택해 전환할 수 있다
- [ ] 대시보드에서 전체 계좌 합산 또는 개별 계좌를 볼 수 있다
- [ ] 계좌 활성/비활성 토글이 동작한다
- [ ] 계좌 삭제가 동작한다
- [ ] 계좌관리 페이지가 새 디자인 시스템을 사용한다 (apple-* 클래스 제거)

---

## 아키텍처 변경

### DB 변경 (BrokerAccount)
```
추가 컬럼:
  broker_type  VARCHAR(20)  -- "KIS" | "KIWOOM"
  app_key      VARCHAR(200) -- 암호화 저장
  app_secret   VARCHAR(200) -- 암호화 저장
  display_order INT         -- 표시 순서
```

### Broker Factory 패턴
```python
# services/broker_factory.py
def get_broker_client(account: BrokerAccount) -> BrokerClient:
    if account.broker_type == "KIS":
        return KISBrokerClient(account)
    elif account.broker_type == "KIWOOM":
        return KiwoomBrokerClient(account)
    raise ValueError(f"지원하지 않는 증권사: {account.broker_type}")
```

### Portfolio API 변경
```
GET /api/v1/portfolio/realtime              → 전체 활성 계좌 합산
GET /api/v1/portfolio/realtime?account_id=X → 특정 계좌만
```

---

## 완료 기준 (Definition of Done)

- [ ] Alembic 마이그레이션 파일 포함
- [ ] apple-* Tailwind 클래스 0개
- [ ] TypeScript 에러 0개
- [ ] 계좌 추가/삭제/전환 동작 확인
