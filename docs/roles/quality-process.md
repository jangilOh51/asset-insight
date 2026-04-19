# 품질 프로세스 하네스 (Quality Assurance)

## 역할 정의

> 소프트웨어가 사용자에게 전달되기 전에 기대 품질을 충족하는지 검증한다.  
> 버그를 찾는 것이 아니라 **릴리즈 리스크를 관리** 하는 역할이다.

---

## 품질 게이트 (Quality Gates)

개발 → 릴리즈까지 통과해야 하는 게이트.

```
[개발 완료]
    │
    ▼
[Gate 1] 자동화 검사 ── CI 빌드, 린트, 타입 체크, 단위 테스트
    │ 통과
    ▼
[Gate 2] 코드 리뷰 ─── [MUST] 코멘트 해결, Approve 1명 이상
    │ 통과
    ▼
[Gate 3] 기능 테스트 ── 인수 기준 충족, 회귀 테스트
    │ 통과
    ▼
[Gate 4] 릴리즈 검수 ─ 스테이징 환경 최종 확인, 기획자 승인
    │ 통과
    ▼
[릴리즈]
```

---

## 테스트 전략

### 테스트 피라미드

```
        /─────────────\
       /   E2E (10%)   \      느림, 비용 높음
      /─────────────────\
     / 통합 테스트 (30%)  \    API 계약, DB 연동
    /─────────────────────\
   /    단위 테스트 (60%)   \  순수 함수, 비즈니스 로직
  /─────────────────────────\
```

### 백엔드 테스트

#### 단위 테스트 (pytest)

```python
# 테스트 파일 위치: backend/tests/
# 네이밍: test_[모듈명].py

# ✅ 금액 계산 로직 반드시 단위 테스트
def test_profit_calculation():
    holding = HoldingItem(
        purchase_amount_krw=10_000_000,
        eval_amount_krw=13_200_000,
    )
    assert holding.return_pct == pytest.approx(32.0, rel=1e-3)

# ✅ KIS API 응답 파싱 테스트 (실제 API 대신 fixture 사용)
def test_parse_domestic_balance(kis_response_fixture):
    result = parse_domestic_balance(kis_response_fixture)
    assert len(result.positions) > 0
    assert result.positions[0].symbol is not None
```

#### 통합 테스트

```python
# ✅ 실제 DB 사용 (Mock DB 금지 — 과거 Mock/실DB 불일치 사례 있음)
# ✅ TestClient로 API 엔드포인트 테스트
def test_portfolio_realtime_endpoint(client: TestClient):
    response = client.get("/api/v1/portfolio/realtime")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "holdings" in data
    assert data["summary"]["total_asset_krw"] > 0
```

### 프론트엔드 테스트

#### 컴포넌트 테스트 (Jest + Testing Library)

```typescript
// ✅ 5가지 상태 렌더링 테스트
describe('HoldingsList', () => {
  it('로딩 상태: 스켈레톤 7개 표시', () => {
    render(<HoldingsList holdings={[]} isLoading={true} />);
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(7);
  });

  it('빈 상태: 안내 문구 표시', () => {
    render(<HoldingsList holdings={[]} isLoading={false} />);
    expect(screen.getByText('종목이 없습니다')).toBeInTheDocument();
  });

  it('수익 종목: 빨간색 표시', () => {
    const holding = { ...mockHolding, return_pct: 5.0 };
    render(<HoldingRow h={holding} />);
    const returnEl = screen.getByText('+5.00%');
    expect(returnEl).toHaveStyle({ color: '#EF4444' });
  });

  it('손실 종목: 파란색 표시', () => {
    const holding = { ...mockHolding, return_pct: -3.0 };
    render(<HoldingRow h={holding} />);
    const returnEl = screen.getByText('-3.00%');
    expect(returnEl).toHaveStyle({ color: '#60A5FA' });
  });
});
```

---

## 기능 테스트 체크리스트

### 포트폴리오 화면

```
□ 실시간 데이터 정상 로드 (KIS API 연결)
□ 총 자산 = 평가금액 합계 + 예수금
□ 수익률 계산 정확성: (평가-매입)/매입 × 100
□ 수익 종목: 빨간색, 손실 종목: 파란색
□ 금액 표기: 1만 이상은 "만" 단위, 1억 이상은 "억" 단위
□ 새로고침 버튼: 스피너 표시 → 데이터 갱신
□ API 오류: 에러 메시지 표시 + 재시도 버튼
□ 로딩 중: 스켈레톤 UI 표시
□ 업데이트 시간 표시 (HH:MM:SS)
```

### 종목 목록

```
□ 전체/국내/해외 탭 필터링 정상 동작
□ 정렬: 평가금액순 → 수익률순 → 비중순 순환
□ 비중(weight_pct) 합계 ≈ 100% (오차 ±0.1%)
□ 종목명 긴 경우 말줄임(...) 처리
□ 스크롤 시 헤더(탭) 고정 (sticky)
```

### 반응형

```
□ 375px (모바일 최소): 레이아웃 깨짐 없음
□ 768px (태블릿): 사이드바 축소 또는 햄버거 메뉴
□ 1280px (데스크탑): 2열 레이아웃 정상
□ 1440px (와이드): 최대 너비 제한 확인
```

---

## 회귀 테스트 시나리오

새 기능 배포 시 반드시 확인하는 핵심 플로우.

```
시나리오 1: 정상 플로우
  1. http://localhost:3000 접속
  2. 대시보드 로드 확인 (총 자산 표시)
  3. 포트폴리오 카드 클릭 → /portfolio/kis 이동
  4. 종목 목록 로드 확인 (11개 종목)
  5. 탭 전환: 전체 → 국내 → 해외
  6. 정렬 버튼 클릭: 평가금액 → 수익률 → 비중
  7. 새로고침 버튼: 스피너 → 데이터 갱신

시나리오 2: 에러 복구
  1. 백엔드 서버 중단
  2. 포트폴리오 화면 접속
  3. 에러 메시지 표시 확인
  4. 백엔드 재시작
  5. 재시도 버튼 클릭 → 정상 로드

시나리오 3: 수익/손실 색상
  1. 수익률 양수 종목: 수익률/금액 빨간색 확인
  2. 수익률 음수 종목: 수익률/금액 파란색 확인
  3. 총 수익 양수: 포트폴리오 헤더 빨간색 확인
```

---

## 버그 보고 형식

```markdown
## 버그 제목

**심각도:** Critical / High / Medium / Low

**재현 환경:**
- OS: macOS 14 / Windows 11
- 브라우저: Chrome 124
- URL: http://localhost:3000/portfolio/kis

**재현 단계:**
1. ...
2. ...
3. ...

**기대 동작:**
...

**실제 동작:**
...

**스크린샷/로그:**
(첨부)

**추가 정보:**
- 발생 빈도: 항상 / 가끔 (10%)
- 관련 PR: #123
```

---

## 심각도 기준

| 심각도 | 정의 | 처리 기한 |
|--------|------|-----------|
| **Critical** | 서비스 사용 불가, 데이터 손실, 보안 취약점 | 즉시 (당일) |
| **High** | 핵심 기능 동작 불가 (잔고 조회 실패 등) | 1 영업일 |
| **Medium** | 기능 일부 오동작, UX 문제 | 다음 스프린트 |
| **Low** | 사소한 UI 불일치, 오탈자 | 백로그 |

---

## 릴리즈 체크리스트

```
릴리즈 전 (스테이징 환경)
□ 모든 Gate 1~3 통과
□ 회귀 테스트 시나리오 1~3 통과
□ 콘솔 에러 0개 (Chrome DevTools)
□ 네트워크 탭: 4xx/5xx 응답 없음
□ KIS API 연결 정상 (실전 환경)
□ 환경변수 (.env) 스테이징 값으로 설정

릴리즈 당일
□ 기획자 최종 승인
□ 백업 (DB 스냅샷)
□ 릴리즈 노트 작성
□ 배포 후 5분 모니터링 (에러 로그 확인)
□ 핵심 기능 스모크 테스트 (시나리오 1)
```

---

## 금융 서비스 특화 품질 기준

```
□ 수익률 계산 오차: ±0.01% 이내
□ 실시간 데이터 지연 고지 (15초 이내)
□ 개인정보(계좌번호) 마스킹 처리 확인
□ 세션 만료 시 안전한 로그아웃 처리
□ KIS API 토큰 만료: 자동 갱신 또는 사용자 안내
□ HTTPS 강제 (HTTP 접근 시 리다이렉트)
□ 에러 메시지에 민감 정보(토큰, 계좌번호) 미포함
```

---

## 성능 품질 기준

| 측정 항목 | 목표값 | 측정 도구 |
|-----------|--------|-----------|
| 초기 로드 (FCP) | < 2초 | Chrome DevTools |
| 포트폴리오 API | < 3초 | Network 탭 |
| 트렌드 API (캐시) | < 200ms | Network 탭 |
| Lighthouse 성능 점수 | 80점 이상 | Lighthouse |
| 메모리 누수 | 없음 | Chrome Memory 탭 |
