# 프론트엔드 개발자 하네스 (Frontend Developer)

## 역할 정의

> 디자인 시스템을 코드로 구현하고, API 데이터를 사용자 인터페이스로 연결한다.  
> **사용자가 실제로 보는 화면의 품질** 을 책임진다.

---

## 기술 스택

```
프레임워크:  Next.js 14 (Pages Router)
언어:        TypeScript (strict mode)
스타일링:    Tailwind CSS + inline styles (디자인 토큰 기반)
차트:        순수 SVG / Recharts (필요 시)
HTTP:        axios (baseURL: /api/v1)
폰트:        Pretendard Variable, JetBrains Mono
패키지 관리: npm
```

---

## 핵심 책임

| 영역 | 세부 내용 |
|------|-----------|
| UI 구현 | Figma 목업 → React 컴포넌트 |
| API 연동 | `/lib/api.ts` 통해 백엔드 호출 |
| 상태 관리 | useState/useCallback, 필요 시 Context |
| 성능 | dynamic import, 이미지 최적화, 불필요 리렌더 방지 |
| 타입 안전성 | 모든 API 응답 타입 정의 (`/types/index.ts`) |
| 반응형 | 모바일(375px) ~ 데스크탑(1440px) |

---

## 코드 컨벤션

### 파일 구조

```
frontend/
├── pages/              # 라우트 (얇게 유지, 로직은 hooks/components로)
├── components/
│   ├── layout/         # AppLayout, TopBar, Sidebar
│   ├── dashboard/      # 대시보드 전용 컴포넌트
│   ├── portfolio/      # 포트폴리오 전용 컴포넌트
│   └── common/         # 공통 컴포넌트 (Button, Card, Badge 등)
├── hooks/              # 커스텀 훅
├── lib/                # api.ts, websocket.ts 등
├── types/              # TypeScript 타입 정의
└── styles/             # globals.css
```

### 네이밍 규칙

```typescript
// 파일명: PascalCase (컴포넌트), camelCase (훅/유틸)
HoldingsList.tsx
usePortfolio.ts
api.ts

// 컴포넌트: PascalCase
function HoldingRow({ h }: { h: HoldingItem }) {}

// 훅: use 접두사
function usePortfolioRealtime() {}

// 상수: UPPER_SNAKE_CASE
const SORT_KEYS: SortKey[] = ['eval_amount_krw', 'return_pct', 'weight_pct'];

// 타입/인터페이스: PascalCase
interface HoldingItem {}
type SortKey = 'eval_amount_krw' | 'return_pct' | 'weight_pct';
```

### 컴포넌트 작성 규칙

```typescript
// ✅ Props 타입 명시 (인라인 또는 interface)
interface Props {
  holdings: HoldingItem[];
  isLoading?: boolean;
}

export default function HoldingsList({ holdings, isLoading }: Props) {
  // 1. 상태 선언
  const [tab, setTab] = useState<Tab>('전체');

  // 2. 파생 데이터 계산
  const filtered = holdings.filter(...);

  // 3. 이벤트 핸들러
  function handleTabChange(t: Tab) { setTab(t); }

  // 4. 렌더
  return (...);
}

// ❌ any 타입 사용 금지
// ❌ 컴포넌트 내부에서 직접 fetch 금지 (lib/api.ts 사용)
// ❌ 인라인 스타일에 하드코딩된 색상 (디자인 토큰 사용)
```

### 금액 포맷 유틸

```typescript
// ✅ 공통 포맷 함수 (중복 작성 금지)
function fmt(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

// ✅ 수익률 표시: 항상 부호 포함
const returnLabel = `${isProfit ? '+' : ''}${returnPct.toFixed(2)}%`;

// ✅ 수익 색상
const profitColor = isProfit ? '#EF4444' : '#60A5FA';
```

---

## 컴포넌트 상태 처리 필수 규칙

모든 데이터 컴포넌트는 5가지 상태를 구현한다.

```typescript
// ✅ 로딩 상태: 스켈레톤 UI
if (isLoading) return <SkeletonCard />;

// ✅ 에러 상태: 메시지 + 재시도
if (error) return (
  <ErrorState message={error} onRetry={() => load()} />
);

// ✅ 빈 데이터: 안내 문구 + CTA
if (data.length === 0) return (
  <EmptyState message="보유 종목이 없습니다" />
);

// ✅ 정상 상태
return <DataComponent data={data} />;
```

### 스켈레톤 구현 패턴

```typescript
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
      <div style={{
        height: 44, background: '#1E2D3E', borderRadius: 4,
        animation: 'pulse 1.5s ease-in-out infinite',
        width: '100%',
      }}/>
    </div>
  );
}
```

---

## API 연동 규칙

### lib/api.ts 패턴

```typescript
// ✅ axios 인스턴스는 /api/v1 baseURL 사용 (Next.js proxy 경유)
const api = axios.create({ baseURL: '/api/v1' });

// ✅ 응답 타입 명시
export async function fetchPortfolioRealtime(): Promise<PortfolioRealtimeResponse> {
  const { data } = await api.get('/portfolio/realtime');
  return data;
}

// ❌ 직접 http://backend:8000 호출 금지 (브라우저에서 CORS 발생)
// ❌ fetch() 직접 사용 지양 (axios 인스턴스 일관 사용)
```

### 로딩/에러 패턴

```typescript
const load = useCallback(async (silent = false) => {
  if (!silent) setIsLoading(true);
  else setIsRefreshing(true);
  setError(null);
  try {
    const result = await fetchPortfolioRealtime();
    setData(result);
    setLastUpdated(new Date());
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.');
  } finally {
    setIsLoading(false);
    setIsRefreshing(false);
  }
}, []);
```

---

## 차트 구현 규칙

### SSR 안전 처리

```typescript
// ✅ 차트 컴포넌트는 반드시 dynamic import (window 참조 오류 방지)
const AssetDonutChart = dynamic(
  () => import('@/components/portfolio/AssetDonutChart'),
  {
    ssr: false,
    loading: () => <div style={{ height: 192, background: '#1E2D3E', borderRadius: 8 }}/>,
  }
);
```

### SVG 차트 작성 시

```typescript
// ✅ viewBox 기반 SVG (반응형)
<svg viewBox="0 0 160 160" style={{ width: '100%' }}>

// ✅ 수학 함수는 컴포넌트 바깥에 정의
function arc(cx, cy, r, inner, startPct, endPct): string { ... }

// ✅ 인터랙션은 onMouseEnter/Leave로 처리
onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
```

---

## 디자인 토큰 사용 규칙

```typescript
// ✅ 색상은 디자인 토큰 값 사용 (하드코딩 허용 범위 = 토큰 정의된 값)
const colors = {
  bg:       '#0B111B',
  surface:  '#111827',
  card:     '#1A2332',
  border:   '#1F2937',
  accent:   '#06B6D4',
  profit:   '#EF4444',
  loss:     '#60A5FA',
  text:     '#F9FAFB',
  muted:    '#6B7280',
};

// ✅ Tailwind 클래스명은 tailwind.config.js 토큰 기준
className="bg-ai-card border-ai-border text-ai-text"

// ❌ 임의 hex 값 인라인 사용 금지 (토큰 외 색상은 UX 디자이너 승인 필요)
```

---

## 반응형 브레이크포인트

```
모바일:    ~ 767px   (단일 컬럼, 바텀 탭)
태블릿:   768~ 1023px (사이드바 축소)
데스크탑: 1024px ~   (사이드바 + 2열 레이아웃)
```

---

## 성능 규칙

```typescript
// ✅ 무거운 컴포넌트는 dynamic import
// ✅ 이벤트 핸들러는 useCallback으로 메모이제이션
// ✅ 리스트 렌더링 시 key는 고유값 사용 (index 단독 사용 금지)
key={`${h.symbol}-${h.exchange}`}  // ✅
key={i}                             // ❌

// ✅ 불필요한 useEffect 의존성 배열 최소화
// ✅ 큰 데이터 목록은 가상화 검토 (100행 이상)
```

---

## 완료 기준 (Definition of Done)

- [ ] TypeScript 컴파일 에러 0개 (`tsc --noEmit`)
- [ ] ESLint 경고 0개
- [ ] 5가지 UI 상태 모두 구현 (기본/로딩/빈화면/에러/오프라인)
- [ ] 모바일(375px) + 데스크탑(1280px) 레이아웃 확인
- [ ] 크롬 DevTools Console 에러 0개
- [ ] Figma 목업과 색상/간격 비교 완료
- [ ] 수익/손실 색상 한국 관례 준수 확인

---

## 협업 인터페이스

### ← UX 디자이너로부터 받는 것
- Figma 링크 (Inspect 모드)
- 디자인 토큰 정의
- 인터랙션 스펙 (모션 duration, easing)

### ← 백엔드로부터 받는 것
- FastAPI Swagger (`/docs`)
- TypeScript 타입 정의 (또는 OpenAPI 스펙)
- 에러 코드 목록

### → 코드 리뷰어에게 전달
- PR: 변경 화면 스크린샷 첨부
- 주요 상태(로딩/에러/빈화면) 동작 방법 설명
