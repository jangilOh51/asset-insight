import { useState } from 'react';
import AppLayout, { TopBar } from '@/components/layout/AppLayout';

const SECTIONS = [
  { id: 'overview',   label: '서비스 개요' },
  { id: 'dashboard',  label: '포트폴리오 (홈)' },
  { id: 'portfolio',  label: '포트폴리오 상세' },
  { id: 'trend',      label: '트렌드 분석' },
  { id: 'history',    label: '자산 히스토리' },
  { id: 'accounts',   label: '계좌 관리' },
  { id: 'faq',        label: '자주 묻는 질문' },
];

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} style={{
      fontSize: 17, fontWeight: 700, color: '#F9FAFB',
      borderBottom: '1px solid #1E3A5F', paddingBottom: 10, marginBottom: 16,
      scrollMarginTop: 80,
    }}>
      {children}
    </h2>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#22D3EE', marginBottom: 8, marginTop: 20 }}>
      {children}
    </h3>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.75, marginBottom: 10, ...style }}>
      {children}
    </p>
  );
}

function Badge({ color = '#06B6D4', children }: { color?: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 4,
      background: color + '22', color, fontWeight: 600, marginRight: 4,
    }}>
      {children}
    </span>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)',
      borderRadius: 10, padding: '12px 16px', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
      borderRadius: 10, padding: '12px 16px', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 12 }}>
      <tbody>
        {rows.map(([key, val], i) => (
          <tr key={i}>
            <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(42,63,85,0.4)', color: '#6B7280', width: '35%', fontWeight: 500 }}>{key}</td>
            <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(42,63,85,0.4)', color: '#D1D5DB' }}>{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function GuidePage() {
  const [activeId, setActiveId] = useState('overview');

  function scrollTo(id: string) {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <AppLayout>
      <TopBar title="사용 가이드"/>

      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto' }}>

        {/* 목차 — 고정 사이드바 */}
        <aside style={{
          width: 200, flexShrink: 0, padding: '24px 16px',
          position: 'sticky', top: 57, height: 'calc(100vh - 57px)',
          overflowY: 'auto', borderRight: '1px solid #1f2937',
        }}>
          <p style={{ fontSize: 10, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            목차
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  background: activeId === s.id ? 'rgba(6,182,212,0.10)' : 'transparent',
                  border: 'none', borderRadius: 6,
                  padding: '7px 10px', cursor: 'pointer',
                  textAlign: 'left', fontSize: 12,
                  color: activeId === s.id ? '#22D3EE' : '#9CA3AF',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (activeId !== s.id) (e.currentTarget as HTMLElement).style.color = '#F9FAFB'; }}
                onMouseLeave={e => { if (activeId !== s.id) (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* 본문 */}
        <div style={{ flex: 1, padding: '32px 32px', overflowY: 'auto', maxWidth: 820 }}>

          {/* ── 서비스 개요 ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="overview">서비스 개요</Heading>
            <P>
              <strong style={{ color: '#F9FAFB' }}>Asset Insight</strong>는 한국투자증권(KIS)·키움증권 등
              여러 증권 계좌를 한곳에서 통합 관리하는 개인 자산관리 플랫폼입니다.
              실시간 잔고 조회, 일별 자산 스냅샷 저장, 트렌드 분석을 제공합니다.
            </P>
            <InfoBox>
              <P style={{ marginBottom: 0 }}>
                💡 <strong style={{ color: '#F9FAFB' }}>색상 규칙 (한국 증권 관례)</strong>{' '}
                <Badge color="#EF4444">수익/상승 = 빨강</Badge>{' '}
                <Badge color="#60A5FA">손실/하락 = 파랑</Badge>
              </P>
            </InfoBox>
            <Sub>지원 기능</Sub>
            <Table rows={[
              ['실시간 포트폴리오', '보유 종목·수익률을 실시간으로 조회'],
              ['일별 스냅샷 저장', '매일 18:00 자동 저장 + 조회 시 자동 저장'],
              ['트렌드 분석', '일/주/월 수익률 차트 + KOSPI·S&P500·NASDAQ 비교'],
              ['자산 히스토리', 'DB에 저장된 날짜별 자산 내역 조회'],
              ['멀티계좌', 'KIS + 키움 등 복수 계좌 동시 관리'],
            ]}/>
          </section>

          {/* ── 포트폴리오 홈 ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="dashboard">포트폴리오 (홈)</Heading>
            <P>메인 화면입니다. 전체 계좌의 자산을 합산하여 표시합니다.</P>
            <Sub>화면 구성</Sub>
            <Table rows={[
              ['총 자산', '모든 활성 계좌의 평가금액 + 예수금 합계'],
              ['예수금', '원화 현금 잔고, 총 자산 대비 비중'],
              ['평가손익', '전체 보유 종목의 수익/손실'],
              ['종목 현황 (트리맵)', '보유 종목을 비중에 따라 시각화, 색상=수익률'],
              ['계좌 목록', '등록된 계좌 카드, 클릭 시 상세 화면으로 이동'],
            ]}/>
            <InfoBox>
              <P style={{ marginBottom: 0 }}>
                🔄 우상단 <Badge>새로고침</Badge> 버튼 클릭 또는 60초마다 자동 갱신됩니다.
                조회 시 자산 현황이 DB에 자동 저장됩니다 (10분 이내 중복 저장 방지).
              </P>
            </InfoBox>
          </section>

          {/* ── 포트폴리오 상세 ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="portfolio">포트폴리오 상세</Heading>
            <P>계좌 카드를 클릭하면 해당 계좌의 상세 화면으로 이동합니다.</P>
            <Sub>화면 구성</Sub>
            <Table rows={[
              ['좌측 패널', '계좌 총 자산, 수익률, 매입/평가/손익/예수금/환율'],
              ['자산 구성 (도넛차트)', '자산 유형별(국내주식/해외주식/현금) 비중'],
              ['기간별 자산 변화', '월별 자산 변화 바차트 (DB 스냅샷 기반)'],
              ['우측: 종목 목록', '보유 종목 전체 목록, 국내/해외/전체 탭 전환 가능'],
            ]}/>
            <WarnBox>
              <P style={{ marginBottom: 0 }}>
                ⚠️ <strong style={{ color: '#F9FAFB' }}>기간별 자산 변화</strong>는 DB에 저장된 스냅샷
                기반입니다. 첫 조회 시 "스냅샷 데이터 수집 중"이 표시될 수 있으며, 매일 18:00
                이후부터 데이터가 누적됩니다.
              </P>
            </WarnBox>
          </section>

          {/* ── 트렌드 분석 ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="trend">트렌드 분석</Heading>
            <P>기간별 수익률 추이를 차트로 확인하고, 주요 지수와 비교합니다.</P>
            <Sub>화면 구성</Sub>
            <Table rows={[
              ['기간 탭', '일간(90일) · 주간(52주) · 월간(24개월) 전환'],
              ['수익률 추이 차트', '첫 날 기준 누적 수익률(%) 라인 차트'],
              ['지수 비교 토글', 'KOSPI · S&P500 · NASDAQ 오버레이 (점선)'],
              ['기간별 수익률 비교표', '1주/1달/3달/1년 수익률을 지수와 함께 비교'],
              ['최근 데이터', '최근 10개 데이터포인트 상세 테이블'],
            ]}/>
            <InfoBox>
              <P style={{ marginBottom: 0 }}>
                📊 차트 데이터는 DB 스냅샷 기반입니다. 지수 데이터는 Yahoo Finance API에서
                실시간 조회하며 1시간 캐시됩니다.
              </P>
            </InfoBox>
          </section>

          {/* ── 자산 히스토리 ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="history">자산 히스토리</Heading>
            <P>DB에 저장된 날짜별 자산 현황을 조회합니다. 실시간 데이터가 아닌 스냅샷 데이터입니다.</P>
            <Sub>사용 방법</Sub>
            <ol style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
              <li>상단에서 계좌를 선택합니다.</li>
              <li>일별 자산 내역 테이블에서 날짜를 클릭합니다.</li>
              <li>하단에 해당 날짜의 종목별 보유 내역이 표시됩니다.</li>
            </ol>
            <Sub>데이터 저장 시점</Sub>
            <Table rows={[
              ['자동 저장 (스케줄러)', '매일 평일 18:00 (장 마감 후)'],
              ['자동 저장 (실시간 조회 시)', '포트폴리오 조회 시 자동 저장, 10분 이내 중복 방지'],
              ['수동 저장', 'POST /api/v1/snapshot/run 호출 (API 직접)'],
            ]}/>
          </section>

          {/* ── 계좌 관리 ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="accounts">계좌 관리</Heading>
            <P>증권 계좌를 등록·수정·삭제합니다. 등록된 계좌는 DB에 저장됩니다.</P>
            <Sub>계좌 등록 방법</Sub>
            <ol style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
              <li>우상단 <Badge>계좌 추가</Badge> 버튼을 클릭합니다.</li>
              <li>증권사(KIS / 키움), 계좌번호, API Key/Secret을 입력합니다.</li>
              <li>저장 시 API 연결 검증이 자동으로 실행됩니다.</li>
              <li>검증 성공 시 바로 포트폴리오에 표시됩니다.</li>
            </ol>
            <Sub>지원 증권사</Sub>
            <Table rows={[
              ['한국투자증권 (KIS)', 'KIS Developers API — apiportal.koreainvestment.com'],
              ['키움증권', 'Open API — openapi.kiwoom.com'],
            ]}/>
            <WarnBox>
              <P style={{ marginBottom: 0 }}>
                ⚠️ <strong style={{ color: '#F9FAFB' }}>환경변수 계좌</strong>: .env 파일에
                KIS_APP_KEY, KIS_APP_SECRET, KIS_ACCOUNT_NO가 설정된 경우, DB 미등록 상태에서도
                "KIS 환경변수 계좌"로 자동 표시됩니다.
                정식 사용은 계좌 관리 화면에서 등록을 권장합니다.
              </P>
            </WarnBox>
          </section>

          {/* ── FAQ ── */}
          <section style={{ marginBottom: 48 }}>
            <Heading id="faq">자주 묻는 질문</Heading>

            {[
              {
                q: '포트폴리오 화면에 데이터가 안 나와요.',
                a: '계좌 관리 메뉴에서 계좌를 등록하고 API 키를 입력해야 합니다. 환경변수(.env)에 KIS_APP_KEY 등이 설정되어 있으면 자동으로 인식됩니다.',
              },
              {
                q: '트렌드/히스토리 차트에 데이터가 없어요.',
                a: '자산 스냅샷은 첫 포트폴리오 조회 시 자동 저장되거나, 매일 18:00 스케줄러가 저장합니다. 최초 등록 후 하루가 지나야 트렌드 데이터가 쌓입니다.',
              },
              {
                q: '수익 색상이 파랑이고 손실이 빨강 아닌가요?',
                a: '이 서비스는 한국 증권 관례를 따릅니다: 수익(상승) = 빨강, 손실(하락) = 파랑.',
              },
              {
                q: '기간별 자산 변화 바차트가 비어있어요.',
                a: 'DB 스냅샷 기반이며, 조회가 된 날부터 데이터가 누적됩니다. 포트폴리오를 여러 번 조회하거나 다음 날 18:00 이후에 확인하세요.',
              },
              {
                q: '멀티계좌 합산이 안 되는 경우는?',
                a: '계좌 관리에서 해당 계좌의 활성화(toggle) 여부를 확인하세요. 비활성 계좌는 합산에서 제외됩니다.',
              },
            ].map(({ q, a }, i) => (
              <div key={i} style={{
                background: '#111827', borderRadius: 10, padding: '14px 16px',
                marginBottom: 10, border: '1px solid #1E2D3E',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', marginBottom: 6 }}>
                  Q. {q}
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>
                  A. {a}
                </p>
              </div>
            ))}
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
