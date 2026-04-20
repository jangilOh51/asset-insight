import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { fetchMonthlyReport } from '@/lib/api';
import type { MonthlyReport } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function ReportSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="w-6 h-6 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
      <p className="text-sm text-white/40">AI가 리포트를 작성 중입니다...</p>
      <p className="text-xs text-white/25">보통 10~20초 정도 소요됩니다</p>
    </div>
  );
}

function ReportContent({ report }: { report: MonthlyReport }) {
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

  return (
    <div className="flex flex-col gap-3">
      {parsed.map((s, i) => (
        <div
          key={i}
          className="rounded-xl p-5"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#06B6D4' }}>
            {s.heading}
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#D1D5DB' }}>
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ReportPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await fetchMonthlyReport(year, month);
      setReport(result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '리포트 생성에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    backgroundColor: '#1A2332',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#F9FAFB',
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <AppLayout title="AI 리포트">
      <div className="max-w-3xl mx-auto py-4 px-4 flex flex-col gap-5">

        {/* 컨트롤 */}
        <section
          className="rounded-xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
              {YEARS.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
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
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                리포트 생성
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
              {report.cached ? '캐시된 리포트' : '새로 생성됨'}
            </span>
            <span className="text-xs text-white/30">
              {report.year}년 {report.month}월
            </span>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div
            className="rounded-xl"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ReportSkeleton />
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
              연월을 선택하고 &quot;리포트 생성&quot;을 누르면<br />
              AI가 포트폴리오를 분석합니다.
            </p>
          </div>
        )}

        {/* 리포트 내용 */}
        {report && !loading && <ReportContent report={report} />}

      </div>
    </AppLayout>
  );
}
