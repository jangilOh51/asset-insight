#!/usr/bin/env node
// PostToolUse hook: 프론트엔드 화면 파일 수정 시 화면 요구사항 문서 업데이트 여부를 확인한다.

let raw = '';
process.stdin.on('data', chunk => raw += chunk);
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const filePath = (data?.tool_input?.file_path || '').replace(/\\/g, '/');

  const SCREEN_MAP = [
    ['frontend/pages/index.tsx',            'docs/screens/screen-01-dashboard.md',        '포트폴리오 홈 (/)'],
    ['frontend/components/dashboard/',      'docs/screens/screen-01-dashboard.md',        '포트폴리오 홈 (/)'],
    ['frontend/pages/portfolio/',           'docs/screens/screen-02-portfolio-detail.md', '포트폴리오 상세 (/portfolio/[id])'],
    ['frontend/components/portfolio/',      'docs/screens/screen-02-portfolio-detail.md', '포트폴리오 상세 (/portfolio/[id])'],
    ['frontend/pages/trend/',               'docs/screens/screen-03-trend.md',            '트렌드 분석 (/trend)'],
    ['frontend/components/charts/',         'docs/screens/screen-03-trend.md',            '트렌드 분석 (/trend)'],
    ['frontend/pages/history/',             'docs/screens/screen-04-history.md',          '자산 히스토리 (/history)'],
    ['frontend/pages/accounts/',            'docs/screens/screen-05-accounts.md',         '계좌 관리 (/accounts)'],
    ['frontend/pages/guide/',               'docs/screens/screen-06-guide.md',            '사용 가이드 (/guide)'],
  ];

  const match = SCREEN_MAP.find(([pattern]) => filePath.includes(pattern));
  if (!match) process.exit(0);

  const [, doc, screen] = match;
  process.stdout.write(`
[screen-docs 체크] 화면 파일이 수정되었습니다.
  수정 파일: ${filePath}
  해당 화면: ${screen}
  요구사항 파일: ${doc}

⚠️  위 요구사항 파일을 반드시 함께 업데이트하세요:
  - 변경된 기능을 FR 항목에 반영 (추가 / 수정 / 삭제)
  - last_updated 를 오늘 날짜로 갱신
  - version 을 올려주세요 (예: 1.0 → 1.1)
`);
});
