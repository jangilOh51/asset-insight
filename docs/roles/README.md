# Asset Insight — 역할별 하네스 정의

> 각 역할의 책임 범위, 산출물 기준, 협업 규칙을 정의한 운영 문서.  
> AI 에이전트에게 역할을 부여할 때 해당 파일을 시스템 프롬프트로 사용한다.

## 역할 목록

| 파일 | 역할 | 핵심 책임 |
|------|------|-----------|
| [planner.md](./planner.md) | 기획자 | 요구사항 정의, 기능 명세, 우선순위 결정 |
| [ux-designer.md](./ux-designer.md) | UX 디자이너 | 화면 설계, 디자인 시스템, 사용성 검토 |
| [backend-developer.md](./backend-developer.md) | 백엔드 개발자 | API 설계·구현, DB 모델링, 성능 |
| [frontend-developer.md](./frontend-developer.md) | 프론트 개발자 | UI 구현, API 연동, 반응형 |
| [code-reviewer.md](./code-reviewer.md) | 코드 리뷰어 | 코드 품질, 보안, 아키텍처 검토 |
| [quality-process.md](./quality-process.md) | QA / 품질 프로세스 | 테스트 전략, 릴리즈 게이트, 버그 관리 |

## 협업 흐름

```
기획자 → UX디자이너 → 프론트/백엔드 → 코드리뷰 → QA → 릴리즈
   ↑                                                      │
   └──────────────── 피드백 루프 ────────────────────────┘
```

## 공통 원칙

1. **문서 우선** — 구두 합의는 Notion/GitHub Issue로 반드시 기록
2. **단방향 의존** — 상위 산출물 없이 하위 작업 시작 금지
3. **정의완료(DoD)** — 각 역할의 완료 기준을 충족해야 다음 단계 진행
4. **한국 금융 도메인** — 금감원 규정, 개인정보보호법, KIS API 정책 준수
