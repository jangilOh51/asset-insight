#!/usr/bin/env python3
"""PostToolUse hook: 프론트엔드 화면 파일 수정 시 화면 요구사항 문서 업데이트 여부를 확인한다."""

import json
import sys

data = json.load(sys.stdin)
tool_input = data.get("tool_input", {})
file_path = tool_input.get("file_path", "").replace("\\", "/")

# 프론트엔드 파일 → 화면 요구사항 문서 매핑
SCREEN_MAP = [
    ("frontend/pages/index.tsx",        "docs/screens/screen-01-dashboard.md",        "포트폴리오 홈 (/)"),
    ("frontend/components/dashboard/",  "docs/screens/screen-01-dashboard.md",        "포트폴리오 홈 (/)"),
    ("frontend/components/dashboard/SectorTreemap", "docs/screens/screen-01-dashboard.md", "포트폴리오 홈 (/)"),
    ("frontend/pages/portfolio/",       "docs/screens/screen-02-portfolio-detail.md", "포트폴리오 상세 (/portfolio/[id])"),
    ("frontend/components/portfolio/",  "docs/screens/screen-02-portfolio-detail.md", "포트폴리오 상세 (/portfolio/[id])"),
    ("frontend/pages/trend/",           "docs/screens/screen-03-trend.md",            "트렌드 분석 (/trend)"),
    ("frontend/components/charts/",     "docs/screens/screen-03-trend.md",            "트렌드 분석 (/trend)"),
    ("frontend/pages/history/",         "docs/screens/screen-04-history.md",          "자산 히스토리 (/history)"),
    ("frontend/pages/accounts/",        "docs/screens/screen-05-accounts.md",         "계좌 관리 (/accounts)"),
    ("frontend/pages/guide/",           "docs/screens/screen-06-guide.md",            "사용 가이드 (/guide)"),
]

matched_doc = None
matched_screen = None
for pattern, doc, screen in SCREEN_MAP:
    if pattern in file_path:
        matched_doc = doc
        matched_screen = screen
        break

if matched_doc:
    print(f"""
[screen-docs 체크] 화면 파일이 수정되었습니다.
  수정 파일: {file_path}
  해당 화면: {matched_screen}
  요구사항 파일: {matched_doc}

반드시 위 요구사항 파일을 함께 업데이트하세요:
  - 변경된 기능을 FR 항목에 반영 (추가/수정/삭제)
  - last_updated 를 오늘 날짜로 갱신
  - version 을 올려주세요 (예: 1.0 → 1.1)
""")
