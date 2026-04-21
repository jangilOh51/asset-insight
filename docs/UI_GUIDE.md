# Asset Insight — UI 가이드

> 버전: v1.0  
> 최종 수정: 2026-04-21  
> 이 문서는 코드베이스에서 추출한 실제 구현 기준이다.

---

## 1. 디자인 원칙

1. **데이터 중심** — 숫자와 차트가 주인공. 장식적 요소 최소화
2. **다크 모드 전용** — 배경 `#0B111B` 기반 단일 테마 (라이트 모드 미지원)
3. **한국 금융 관례** — 수익 빨강, 손실 파랑 (서양 관례와 반대, 절대 변경 금지)
4. **5가지 상태** — 모든 데이터 컴포넌트는 기본·로딩·에러·빈화면·오프라인 상태를 구현
5. **일관된 숫자 표기** — `fmt()` 함수로 통일, 직접 `toLocaleString()` 사용 금지

---

## 2. 컬러 시스템

### 배경 계층

| 토큰 | 색상값 | 용도 |
|------|--------|------|
| `background` | `#0B111B` | 페이지 최외곽 배경 |
| `surface` | `#111827` | 헤더, 사이드바, 카드 기반 |
| `card` | `#1A2332` | 카드·패널 내부 |
| `card-hover` | `#1E2D3E` | 호버 상태, 스켈레톤 |
| `border` | `#1f2937` | 구분선, 테이블 경계 |

### 시맨틱 컬러

| 토큰 | 색상값 | 용도 |
|------|--------|------|
| `primary` | `#06B6D4` | 포인트, 활성 상태, 링크 |
| `primary-light` | `#22D3EE` | 활성 텍스트, 아이콘 강조 |
| `profit` | `#EF4444` | **수익 (양수)**. 절대 손실에 사용 금지 |
| `loss` | `#60A5FA` | **손실 (음수)**. 절대 수익에 사용 금지 |
| `warning` | `#F59E0B` | 경고, 주의 |
| `neutral` | `#9CA3AF` | 비활성 텍스트, 아이콘 |

### 텍스트 계층

| 색상값 | 용도 |
|--------|------|
| `#F9FAFB` | 주요 텍스트 (제목, 강조 수치) |
| `#E5E7EB` | 일반 텍스트 |
| `#9CA3AF` | 보조 텍스트, 레이블 |
| `#6B7280` | 약한 보조 (날짜, 메타 정보) |
| `#4B5563` | 비활성, placeholder |

---

## 3. 타이포그래피

### 폰트 패밀리

```css
/* UI 텍스트 */
font-family: 'Pretendard Variable', -apple-system, sans-serif;

/* 숫자, 금액, 수익률 — 단독으로 또는 UI 폰트와 혼용 */
font-family: 'JetBrains Mono', monospace;
```

### 폰트 사이즈 사용 패턴

| 크기 | 용도 |
|------|------|
| `22–24px` | 페이지 제목 |
| `18px` | TopBar 타이틀 |
| `15px` | 사이드바 로고 |
| `14px` | 카드 제목, 중요 레이블 |
| `13px` | 본문, 표 데이터, 네비게이션 |
| `12px` | 보조 텍스트, 날짜, 메타 |
| `11px` | 배지, 미니 레이블 |
| `9px` | 알림 배지 숫자 |

### 폰트 웨이트

| 값 | 용도 |
|----|------|
| `700` | 핵심 수치 (총자산 금액 등) |
| `600` | 카드 제목, 섹션 헤더 |
| `500` | 네비게이션, 버튼 텍스트 |
| `400` | 일반 본문 |

---

## 4. 간격 시스템

컴포넌트 내부는 일관된 값을 사용한다.

| 용도 | 값 |
|------|----|
| 카드 패딩 | `20–24px` |
| 섹션 간격 | `16–24px` |
| 요소 간격 (gap) | `8–12px` |
| 인라인 간격 | `4–8px` |
| 보더 반경 (카드) | `12px` |
| 보더 반경 (버튼·배지) | `6–8px` |
| 보더 반경 (원형 배지) | `50%` |

---

## 5. 수익률·금액 표기 규칙

### 금액 (`fmt()` 함수 — `frontend/lib/format.ts`)

```typescript
fmt(86360000)    // → "₩86,360,000"
fmt(1200000000)  // → "₩1,200,000,000"
```

- 단위 축약(만원/억원) 사용 안 함 — 정확한 숫자 표기
- 통화 기호 `₩` 접두
- 천 단위 콤마 구분

### 수익률

```
양수: +12.3%  → color: #EF4444 (profit, 빨강)
음수: -8.5%   → color: #60A5FA (loss, 파랑)
0:    0.00%   → color: #9CA3AF (neutral)
```

**반드시 `+` 부호를 명시한다** (`return_pct > 0 ? '+' : ''`).

### 수익률 배지

```
수익: background rgba(239,68,68,0.12), color #EF4444, border 1px rgba(239,68,68,0.3)
손실: background rgba(96,165,250,0.12), color #60A5FA, border 1px rgba(96,165,250,0.3)
```

---

## 6. 컴포넌트 패턴

### 6.1 요약 카드 (SummaryCard)

포트폴리오 상세 상단 5열 그리드에 사용.

```
┌─────────────────────┐
│ 레이블              │
│ 주요 수치 (700)     │
│ 보조 정보 (작은 색) │
└─────────────────────┘

background: #1A2332
border: 1px solid #1f2937
border-radius: 10px
padding: 16px 20px
```

### 6.2 데이터 테이블

종목 테이블 등 풀컬럼 테이블 기준.

```
테이블 전체: width 100%
헤더 행: background #111827, border-bottom #1f2937
         font-size: 11px, color: #6B7280, text-transform: uppercase
         cursor: pointer (정렬 가능 컬럼)
데이터 행: border-bottom 1px solid #1f2937
           hover → background rgba(255,255,255,0.02)
우측 정렬: 숫자 컬럼 (금액, 수익률, 비중 등)
좌측 정렬: 텍스트 컬럼 (종목명)
```

### 6.3 차트 컴포넌트

모든 차트는 `dynamic import + ssr: false` 필수.

```typescript
const MyChart = dynamic(() => import('@/components/charts/MyChart'), {
  ssr: false,
  loading: () => <div style={{ height: 180, background: '#1E2D3E', borderRadius: 8 }} />,
});
```

| 차트 종류 | 라이브러리 | 용도 |
|---------|-----------|------|
| 도넛 | Recharts PieChart | 자산 구성 비중 |
| 바차트 | Recharts BarChart | 일별 자산 히스토리 |
| 라인차트 | Recharts LineChart | 트렌드·벤치마크 |
| 트리맵 | Recharts Treemap | 보유 종목 비중 |

**차트 공통 색상**: `#06B6D4` (primary), `#EF4444` (수익), `#60A5FA` (손실)

### 6.4 스켈레톤 로딩

```typescript
function Skeleton({ w = '100%', h = 20 }: { w?: number | string; h?: number }) {
  return (
    <div style={{
      width: w, height: h,
      background: '#1E2D3E',
      borderRadius: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}/>
  );
}
```

### 6.5 버튼

| 유형 | 배경 | 텍스트 | 용도 |
|------|------|--------|------|
| Primary | `#0891B2` | `#fff` | 주요 액션 |
| Secondary | `#1f2937` | `#E5E7EB` | 보조 액션 |
| Danger | `rgba(239,68,68,0.1)` | `#EF4444` | 삭제, 위험 액션 |
| Ghost | `transparent` | `#9CA3AF` | 텍스트 버튼 |

공통:
```
border-radius: 6–8px
font-size: 13px
font-weight: 500
cursor: pointer
transition: opacity 150ms, background 150ms
```

### 6.6 모달

```
overlay: rgba(0,0,0,0.7) fixed inset-0 z-50
panel: background #111827, border 1px solid #1f2937
       border-radius: 12px, max-width: 600px
       padding: 24px
닫기: X 버튼 (우상단) + 오버레이 클릭 + ESC키
```

---

## 7. 5가지 UI 상태 구현 필수 규칙

모든 데이터 컴포넌트는 다음 5가지 상태를 구현해야 한다.

| 상태 | 조건 | 처리 방법 |
|------|------|----------|
| **기본** | 데이터 정상 | 일반 렌더링 |
| **로딩** | `isLoading = true` | 스켈레톤 컴포넌트 |
| **에러** | `error != null` | 에러 메시지 + 재시도 버튼 |
| **빈 화면** | 데이터 있지만 항목 0개 | 안내 문구 (아이콘 + 설명) |
| **오프라인** | 네트워크 없음 | 오프라인 배너 또는 캐시 데이터 표시 |

```typescript
// 패턴 예시
if (isLoading) return <Skeleton />;
if (error) return <ErrorState onRetry={mutate} />;
if (!data || data.length === 0) return <EmptyState />;
return <DataComponent data={data} />;
```

---

## 8. 레이아웃 시스템

### 사이드바

```
width: 224px
background: #030712
border-right: 1px solid #1f2937
position: sticky, top: 0, height: 100vh

로고 영역: height 56px, border-bottom
네비게이션: flex-direction column, gap 2px, padding 12px 8px
하단 링크: 사용 가이드, 설정, 알림벨 — padding 8px, border-top
```

### TopBar

```
height: ~48px
background: #111827
border-bottom: 1px solid #1f2937
position: sticky, top: 0, z-index: 10
좌: 페이지 제목 (18px, 600)
우: 업데이트 시각 + 커스텀 액션 (RefreshButton, 환율 등)
```

### 메인 컨텐츠 영역

```
최대 너비: 1280px (포트폴리오 상세), 1100px (그 외)
padding: 24px
```

### 네비게이션 활성 상태

```
활성:    background rgba(6,182,212,0.10), color #22D3EE
비활성:  background transparent, color #9CA3AF
호버:    background #1f2937, color #fff
border-radius: 8px, padding: 9px 12px
```

---

## 9. 알림 (Notification) UI 패턴

| 알림 타입 | 아이콘 | 색상 |
|---------|--------|------|
| `goal_achieved` | 🎯 | `#06B6D4` |
| `goal_milestone` | 📊 | `#60A5FA` |
| `high_return` | 📈 | `#EF4444` |
| `high_loss` | 📉 | `#60A5FA` |

미읽음 배지: `background #EF4444`, `9+` 표시 제한.

---

## 10. 금지 사항

| 금지 | 대체 |
|------|------|
| `any` 타입 (TypeScript) | 명시적 인터페이스 |
| 임의 색상값 | 디자인 토큰 값만 사용 |
| 수익에 파란색 / 손실에 빨간색 | 한국 관례 엄수 |
| `toLocaleString()` 직접 호출 | `fmt()` 함수 사용 |
| SSR에서 차트 렌더링 | `dynamic import + ssr: false` |
| 5가지 UI 상태 중 일부 생략 | 모두 구현 |
