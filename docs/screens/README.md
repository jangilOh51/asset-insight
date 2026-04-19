# 화면별 요구사항 문서 인덱스

각 파일은 해당 화면의 **현재 구현 상태 기준** 요구사항을 기록한다.  
변경 사항이 생기면 해당 파일을 직접 수정하고 `last_updated` 와 `version`을 업데이트한다.

---

## 문서 목록

| 파일 | 화면 | 라우트 | 버전 |
|------|------|--------|------|
| [screen-01-dashboard.md](screen-01-dashboard.md) | 포트폴리오 홈 | `/` | 1.0 |
| [screen-02-portfolio-detail.md](screen-02-portfolio-detail.md) | 포트폴리오 상세 | `/portfolio/[id]` | 1.0 |
| [screen-03-trend.md](screen-03-trend.md) | 트렌드 분석 | `/trend` | 1.0 |
| [screen-04-history.md](screen-04-history.md) | 자산 히스토리 | `/history` | 1.0 |
| [screen-05-accounts.md](screen-05-accounts.md) | 계좌 관리 | `/accounts` | 1.0 |
| [screen-06-guide.md](screen-06-guide.md) | 사용 가이드 | `/guide` | 1.0 |

---

## 문서 업데이트 규칙

1. **신규 요구사항 추가**: 해당 화면 문서의 FR 섹션에 항목 추가
2. **요구사항 변경**: 기존 FR 내용을 새 내용으로 교체 (이전 내용 삭제, 주석 불필요)
3. **완료된 항목**: "미구현 / 향후 개선 사항" 체크박스에 `[x]` 표시
4. **신규 화면 추가**: `screen-0N-{name}.md` 파일 생성 후 이 인덱스에 추가

---

## 화면 개발/개선 프로세스

```
1. 사용자 요청 수신
2. [PM] 해당 화면 요구사항 문서 확인 (docs/screens/screen-0N-*.md)
3. [PM] 현재 구현과 요구사항 GAP 분석
4. [기획자] 요구사항 문서 업데이트 (변경/추가 사항 반영)
5. [백엔드/프론트] 구현
6. [QA] 요구사항 항목 기준으로 검증
7. [PM] 요구사항 문서 최종 반영 (last_updated, version 업데이트)
```
