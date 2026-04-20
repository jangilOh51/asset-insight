import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { fetchStrategyReport } from '@/lib/api';
import type { RiskLevel, StrategyReport } from '@/types';

const RISK_OPTIONS: { value: RiskLevel; label: string; desc: string }[] = [
  { value: 'conservative', label: '보수적', desc: '안정 중심' },
  { value: 'moderate',     label: '중립적', desc: '균형 추구' },
  { value: 'aggressive',   label: '공격적', desc: '성장 중심' },
];

const HORIZON_OPTIONS: { value: number; label: string }[] = [
  { value: 1,  label: '1년' },
  { value: 3,  label: '3년' },
  { value: 5,  label: '5년' },
  { value: 10, label: '10년' },
];

function StrategySkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="w-6 h-6 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
      <p className="text-sm text-white/40">AI가 전략서를 작성 중입니다...</p>
      <p className="text-xs text-white/25">보통 15~25초 정도 소요됩니다</p>
    </div>
  );
}

function StrategyContent({ report }: { report: StrategyReport }) {
  const sections = report.content.split(/^(## \d+\. .+)$/m).filter(Boolean);

  const parsed: Array<{ heading: string; body: string }> = [];
  for (let i = 0; i < sections.length; i += 2) {
    if (sections[i + 1] !== undefined) {
      parsed.push({ heading: sections[i].replace(/^## \d+\. /, ''), body: sections[i + 1].trim() });
    }
  }

  if (parsed.length === 0) {
    return (
      <div
        className="rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB' }}
      >
        {report.content}
      </div>
    );
  }

  const isDisclaimer = (heading: string) => heading.includes('면책');

  return (
    <div className="flex flex-col gap-3">
      {parsed.map((s, i) => (
        <div
          key={i}
          className="rounded-xl p-5"
          style={{
            backgroundColor: '#111827',
            border: `1px solid ${isDisclaimer(s.heading) ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: isDisclaimer(s.heading) ? '#4B5563' : '#06B6D4' }}
          >
            {s.heading}
          </h3>
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: isDisclaimer(s.heading) ? '#6B7280' : '#D1D5DB' }}
          >
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function StrategyPage() {
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');
  const [horizonYears, setHorizonYears] = useState(3);
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await fetchStrategyReport(riskLevel, horizonYears);
      setReport(result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '전략서 생성에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const toggleBase: React.CSSProperties = {
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'background 150ms',
  };

  const activeStyle: React.CSSProperties = { ...toggleBase, backgroundColor: '#06B6D4', color: '#0B111B' };
  const inactiveStyle: React.CSSProperties = { ...toggleBase, backgroundColor: '#1A2332', color: 'rgba(255,255,255,0.5)' };

  const riskLabels: Record<RiskLevel, string> = { conservative: '보수적', moderate: '중립적', aggressive: '공격적' };

  return (
    <AppLayout title="투자 전략서">
      <div className="max-w-3xl mx-auto py-4 px-4 flex flex-col gap-5">

        {/* 설정 카드 */}
        <section
          className="rounded-xl p-5 flex flex-col gap-5"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* 리스크 성향 */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/40 font-medium">리스크 성향</span>
            <div className="flex gap-2">
              {RISK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  style={riskLevel === opt.value ? activeStyle : inactiveStyle}
                  onClick={() => setRiskLevel(opt.value)}
                >
                  {opt.label}
                  <span
                    className="ml-1 text-xs"
                    style={{ opacity: 0.6 }}
                  >
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 투자 기간 */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/40 font-medium">목표 투자 기간</span>
            <div className="flex gap-2">
              {HORIZON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  style={horizonYears === opt.value ? activeStyle : inactiveStyle}
                  onClick={() => setHorizonYears(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium self-start transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#06B6D4', color: '#0B111B' }}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                생성 중...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
                전략서 생성
              </>
            )}
          </button>
        </section>

        {/* 캐시 뱃지 */}
        {report && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={
                report.cached
                  ? { backgroundColor: '#374151', color: '#9CA3AF' }
                  : { backgroundColor: '#06B6D418', color: '#06B6D4' }
              }
            >
              {report.cached ? '캐시된 전략서' : '새로 생성됨'}
            </span>
            <span className="text-xs text-white/30">
              {riskLabels[report.risk_level]} · {report.horizon_years}년 목표
            </span>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div
            className="rounded-xl"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <StrategySkeleton />
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            <button
              onClick={handleGenerate}
              className="self-start text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: '#1A2332', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 기본 안내 */}
        {!loading && !error && !report && (
          <div
            className="rounded-xl p-8 flex flex-col items-center gap-3"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ color: '#4B5563', fontSize: 32 }}>✦</div>
            <p className="text-sm text-white/40 text-center">
              리스크 성향과 투자 기간을 설정하고<br />
              &quot;전략서 생성&quot;을 누르면 AI가 맞춤 전략을 작성합니다.
            </p>
          </div>
        )}

        {/* 전략서 내용 */}
        {report && !loading && <StrategyContent report={report} />}

      </div>
    </AppLayout>
  );
}
