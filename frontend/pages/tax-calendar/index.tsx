import useSWR from 'swr';
import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { fetchTaxCalendar } from '@/lib/api';
import type { TaxEvent, TaxEventCategory } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_DAY = new Date().getDate();

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const CATEGORY_CONFIG: Record<TaxEventCategory, { label: string; color: string; bg: string }> = {
  report:   { label: '신고',   color: '#EF4444', bg: '#EF444418' },
  payment:  { label: '납부',   color: '#F59E0B', bg: '#F59E0B18' },
  deadline: { label: '마감',   color: '#EC4899', bg: '#EC489918' },
  strategy: { label: '전략',   color: '#06B6D4', bg: '#06B6D418' },
  check:    { label: '확인',   color: '#8B5CF6', bg: '#8B5CF618' },
};

function dday(month: number, day: number | null): string {
  if (day === null) return '';
  const target = new Date(CURRENT_YEAR, month - 1, day);
  const today = new Date(CURRENT_YEAR, CURRENT_MONTH - 1, CURRENT_DAY);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '지남';
  if (diff === 0) return 'D-Day';
  return `D-${diff}`;
}

function isPast(month: number, day: number | null): boolean {
  if (day === null) return month < CURRENT_MONTH;
  if (month < CURRENT_MONTH) return true;
  if (month === CURRENT_MONTH && day < CURRENT_DAY) return true;
  return false;
}

function EventCard({ event, expanded, onToggle }: {
  event: TaxEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = CATEGORY_CONFIG[event.category];
  const past = isPast(event.month, event.day);
  const dd = event.day ? dday(event.month, event.day) : '';
  const isUrgent = dd && dd !== '지남' && dd !== 'D-Day' && parseInt(dd.replace('D-', '')) <= 7;

  return (
    <div
      onClick={onToggle}
      className="rounded-xl p-4 cursor-pointer transition-opacity"
      style={{
        backgroundColor: '#111827',
        border: `1px solid ${past ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'}`,
        opacity: past ? 0.45 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium" style={{ color: past ? '#6B7280' : '#F9FAFB' }}>
              {event.title}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {event.month}월 {event.day ? `${event.day}일` : ''}
            </p>
          </div>
        </div>
        {dd && (
          <span
            className="text-xs font-mono font-semibold shrink-0"
            style={{
              color: dd === '지남' ? '#4B5563'
                : dd === 'D-Day' ? '#EF4444'
                : isUrgent ? '#F59E0B'
                : '#06B6D4',
            }}
          >
            {dd}
          </span>
        )}
      </div>
      {expanded && (
        <p className="text-xs mt-3 leading-relaxed" style={{ color: '#9CA3AF' }}>
          {event.description}
        </p>
      )}
    </div>
  );
}

export default function TaxCalendarPage() {
  const { data: events, error, isLoading } = useSWR<TaxEvent[]>(
    `/api/v1/tax/calendar?year=${CURRENT_YEAR}`,
    () => fetchTaxCalendar(CURRENT_YEAR),
    { revalidateOnFocus: false },
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const filtered = (events ?? []).filter(e => selectedMonth === null || e.month === selectedMonth);
  const grouped = MONTHS.reduce<Record<number, TaxEvent[]>>((acc, _, i) => {
    const m = i + 1;
    acc[m] = filtered.filter(e => e.month === m);
    return acc;
  }, {});

  return (
    <AppLayout title="절세 캘린더">
      <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-5">

        {/* 월 필터 */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedMonth(null)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={selectedMonth === null
              ? { backgroundColor: '#06B6D4', color: '#0B111B' }
              : { backgroundColor: '#1A2332', color: 'rgba(255,255,255,0.5)' }}
          >
            전체
          </button>
          {MONTHS.map((label, i) => {
            const m = i + 1;
            const hasEvent = (events ?? []).some(e => e.month === m);
            if (!hasEvent) return null;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                style={selectedMonth === m
                  ? { backgroundColor: '#06B6D4', color: '#0B111B' }
                  : { backgroundColor: '#1A2332', color: 'rgba(255,255,255,0.5)' }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
          >
            일정을 불러오지 못했습니다.
          </div>
        )}

        {/* 빈 화면 */}
        {!isLoading && !error && filtered.length === 0 && (
          <div
            className="rounded-xl p-8 flex items-center justify-center"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm text-white/30">해당 월에 일정이 없습니다.</p>
          </div>
        )}

        {/* 이벤트 목록 */}
        {!isLoading && !error && (
          <div className="flex flex-col gap-5">
            {MONTHS.map((label, i) => {
              const m = i + 1;
              const monthEvents = grouped[m];
              if (!monthEvents || monthEvents.length === 0) return null;
              return (
                <section key={m}>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xs font-semibold text-white/40">{label}</h2>
                    {m === CURRENT_MONTH && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#06B6D418', color: '#06B6D4' }}
                      >
                        이번 달
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {monthEvents.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        expanded={expandedId === event.id}
                        onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
