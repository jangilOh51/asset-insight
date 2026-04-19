import { useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import axios from 'axios';
import AppLayout, { TopBar } from '@/components/layout/AppLayout';
import type { AccountOut, TrendPoint } from '@/types';

const AssetTrendChart = dynamic(() => import('@/components/charts/AssetTrendChart'), {
  ssr: false,
  loading: () => <div style={{ height: 240, background: '#1A2332', borderRadius: 12 }}/>,
});

const fetcher = (url: string) => axios.get(url).then(r => r.data);

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_LABELS: Record<Period, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
};
const PERIOD_LIMITS: Record<Period, number> = {
  daily: 90,
  weekly: 52,
  monthly: 24,
};

function fmt(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

function fmtPct(n: number, showSign = true) {
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function ReturnCell({ value }: { value: number | null }) {
  if (value === null) return <td style={tdStyle()}>—</td>;
  const isPos = value >= 0;
  return (
    <td style={tdStyle(isPos ? '#EF4444' : '#60A5FA')}>
      {fmtPct(value)}
    </td>
  );
}

function tdStyle(color?: string) {
  return {
    padding: '10px 16px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
    color: color ?? '#D1D5DB',
    borderBottom: '1px solid rgba(42,63,85,0.4)',
    textAlign: 'right' as const,
  };
}

function Skeleton({ h = 20 }: { h?: number }) {
  return <div style={{ height: h, background: '#1E2D3E', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>;
}

function computePeriodReturn(points: TrendPoint[], days: number): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const last = sorted[sorted.length - 1];
  const cutoff = new Date(last.period);
  cutoff.setDate(cutoff.getDate() - days);
  const baseline = sorted.find(p => new Date(p.period) >= cutoff);
  if (!baseline || baseline.total_value_krw === 0) return null;
  return ((last.total_value_krw - baseline.total_value_krw) / baseline.total_value_krw) * 100;
}

export default function TrendPage() {
  const [period, setPeriod] = useState<Period>('daily');

  const { data: accounts = [] } = useSWR<AccountOut[]>('/api/v1/accounts', fetcher);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const activeAccounts = accounts.filter(a => a.is_active);
  const accountId = selectedAccountId || activeAccounts[0]?.id;

  const { data: trendPoints = [], isLoading, error } = useSWR<TrendPoint[]>(
    accountId ? `/api/v1/trend/${accountId}?period=${period}&limit=${PERIOD_LIMITS[period]}` : null,
    fetcher,
  );

  const sortedPoints = [...trendPoints].sort((a, b) => a.period.localeCompare(b.period));

  const periodReturns: { label: string; days: number }[] = [
    { label: '1주일', days: 7 },
    { label: '1개월', days: 30 },
    { label: '3개월', days: 90 },
    { label: '1년', days: 365 },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      <TopBar title="트렌드 분석"/>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 컨트롤 바 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          {/* 계좌 선택 */}
          {activeAccounts.length > 1 && (
            <select
              value={accountId ?? ''}
              onChange={e => setSelectedAccountId(e.target.value)}
              style={{
                background: '#1A2332', border: '1px solid #2A3F55',
                borderRadius: 8, padding: '7px 12px',
                color: '#D1D5DB', fontSize: 12, cursor: 'pointer',
              }}
            >
              {activeAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_name || a.account_no} ({a.broker_type})
                </option>
              ))}
            </select>
          )}
          {activeAccounts.length <= 1 && activeAccounts[0] && (
            <p style={{ fontSize: 12, color: '#6B7280' }}>
              {activeAccounts[0].account_name || activeAccounts[0].account_no} · {activeAccounts[0].broker}
            </p>
          )}

          {/* 기간 탭 */}
          <div style={{ display: 'flex', gap: 4, background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 8, padding: 3 }}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, transition: 'all 150ms',
                  background: period === p ? '#06B6D4' : 'transparent',
                  color: period === p ? '#fff' : '#9CA3AF',
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* 계좌 없음 */}
        {activeAccounts.length === 0 && (
          <div style={{
            background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12,
            padding: '48px 24px', textAlign: 'center',
          }}>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 8 }}>활성 계좌가 없습니다</p>
            <a href="/accounts" style={{ color: '#22D3EE', fontSize: 12, textDecoration: 'none' }}>
              계좌 추가하기 →
            </a>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#F87171',
          }}>
            트렌드 데이터를 불러오지 못했습니다.
          </div>
        )}

        {/* 자산 변화 차트 */}
        {accountId && (
          <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
              자산 변화 추이
            </p>
            {isLoading ? (
              <Skeleton h={240}/>
            ) : sortedPoints.length === 0 ? (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <p style={{ color: '#6B7280', fontSize: 14 }}>데이터를 수집 중입니다</p>
                <p style={{ color: '#4B5563', fontSize: 12 }}>매일 18:00 스냅샷이 저장됩니다</p>
              </div>
            ) : (
              <AssetTrendChart points={sortedPoints}/>
            )}
          </div>
        )}

        {/* 기간별 수익률 테이블 */}
        {accountId && !isLoading && sortedPoints.length > 0 && (
          <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(42,63,85,0.5)' }}>
              <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                기간별 수익률
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...tdStyle(), textAlign: 'left', color: '#6B7280', fontWeight: 500 }}>구분</th>
                    {periodReturns.map(p => (
                      <th key={p.label} style={{ ...tdStyle(), color: '#6B7280', fontWeight: 500 }}>{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...tdStyle(), textAlign: 'left', color: '#F9FAFB', fontWeight: 500 }}>
                      내 포트폴리오
                    </td>
                    {periodReturns.map(p => (
                      <ReturnCell key={p.label} value={computePeriodReturn(sortedPoints, p.days)}/>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 최근 데이터 포인트 */}
        {accountId && !isLoading && sortedPoints.length > 0 && (
          <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(42,63,85,0.5)' }}>
              <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                최근 데이터
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...tdStyle(), textAlign: 'left', color: '#6B7280', fontWeight: 500 }}>날짜</th>
                    <th style={{ ...tdStyle(), color: '#6B7280', fontWeight: 500 }}>총 자산</th>
                    <th style={{ ...tdStyle(), color: '#6B7280', fontWeight: 500 }}>평가손익</th>
                    <th style={{ ...tdStyle(), color: '#6B7280', fontWeight: 500 }}>수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sortedPoints].reverse().slice(0, 10).map(p => {
                    const isPos = (p.avg_return_pct ?? 0) >= 0;
                    return (
                      <tr key={p.period}>
                        <td style={{ ...tdStyle(), textAlign: 'left', color: '#9CA3AF' }}>
                          {p.period.slice(0, 10)}
                        </td>
                        <td style={tdStyle()}>{fmt(p.total_value_krw)}</td>
                        <td style={tdStyle(isPos ? '#EF4444' : '#60A5FA')}>
                          {isPos ? '+' : ''}{fmt(p.total_profit_loss_krw)}
                        </td>
                        <ReturnCell value={p.avg_return_pct}/>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
