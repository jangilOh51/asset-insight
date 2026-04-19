import { useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import AppLayout, { TopBar } from '@/components/layout/AppLayout';
import { fmt, fmtPct } from '@/lib/format';
import type { AccountOut, SnapshotSummary } from '@/types';

const fetcher = (url: string) => axios.get(url).then(r => r.data);

interface PositionRow {
  date: string;
  symbol: string;
  name: string;
  market: string;
  currency: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  purchase_amount_krw: number;
  eval_amount_krw: number;
  profit_loss_krw: number;
  return_pct: number;
}

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: number | string }) {
  return (
    <div style={{
      height: h, width: w, background: '#1E2D3E', borderRadius: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}/>
  );
}

function tdS(color?: string, align: 'left' | 'right' = 'right') {
  return {
    padding: '10px 14px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    color: color ?? '#D1D5DB',
    borderBottom: '1px solid rgba(42,63,85,0.4)',
    textAlign: align as 'left' | 'right',
    whiteSpace: 'nowrap' as const,
  };
}

function thS(align: 'left' | 'right' = 'right') {
  return {
    ...tdS('#6B7280', align),
    fontWeight: 500,
    background: 'rgba(17,24,39,0.6)',
    fontSize: 10,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  };
}

export default function HistoryPage() {
  const { data: accounts = [], isLoading: accLoading } = useSWR<AccountOut[]>('/api/v1/accounts', fetcher);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const activeAccounts = accounts.filter(a => a.is_active);
  const currentAccount = activeAccounts.find(a => a.id === selectedId) ?? activeAccounts[0];

  const { data: summaries = [], isLoading: sumLoading } = useSWR<SnapshotSummary[]>(
    currentAccount?.account_no
      ? `/api/v1/snapshot/summary/${currentAccount.account_no}?limit=365`
      : null,
    fetcher,
  );

  const sortedSummaries = [...summaries].sort((a, b) => b.date.localeCompare(a.date));
  const displayDate = selectedDate || sortedSummaries[0]?.date;

  const { data: positions = [], isLoading: posLoading } = useSWR<PositionRow[]>(
    currentAccount?.account_no && displayDate
      ? `/api/v1/snapshot/positions/${currentAccount.account_no}?date=${displayDate}`
      : null,
    fetcher,
  );

  const isLoading = accLoading || sumLoading;

  return (
    <AppLayout>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      <TopBar title="자산 히스토리"/>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 계좌 없음 */}
        {!isLoading && activeAccounts.length === 0 && (
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

        {activeAccounts.length > 0 && (
          <>
            {/* 컨트롤 바 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select
                value={currentAccount?.id ?? ''}
                onChange={e => { setSelectedId(e.target.value); setSelectedDate(''); }}
                style={{
                  background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 8,
                  padding: '7px 12px', color: '#D1D5DB', fontSize: 12, cursor: 'pointer',
                }}
              >
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_name || a.account_no} ({a.broker_type})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: '#4B5563' }}>
                {summaries.length > 0 ? `${summaries.length}일 데이터 저장됨` : '저장된 데이터 없음'}
              </p>
            </div>

            {/* 일별 요약 테이블 */}
            <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(42,63,85,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  일별 자산 내역
                </p>
                <p style={{ fontSize: 11, color: '#4B5563' }}>날짜 클릭 → 종목 내역 조회</p>
              </div>

              {isLoading ? (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={36}/>)}
                </div>
              ) : sortedSummaries.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ color: '#6B7280', fontSize: 14 }}>저장된 스냅샷이 없습니다</p>
                  <p style={{ color: '#4B5563', fontSize: 12, marginTop: 6 }}>
                    매일 18:00 자동 저장 또는{' '}
                    <a href="/api/v1/snapshot/run" style={{ color: '#22D3EE', textDecoration: 'none' }}>
                      수동 저장
                    </a>
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thS('left')}>날짜</th>
                        <th style={thS()}>총 자산</th>
                        <th style={thS()}>매입금액</th>
                        <th style={thS()}>평가금액</th>
                        <th style={thS()}>평가손익</th>
                        <th style={thS()}>수익률</th>
                        <th style={thS()}>예수금</th>
                        <th style={thS()}>종목수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSummaries.map(s => {
                        const isSelected = s.date === displayDate;
                        const isPos = s.return_pct >= 0;
                        return (
                          <tr
                            key={s.date}
                            onClick={() => setSelectedDate(s.date)}
                            style={{ cursor: 'pointer', background: isSelected ? 'rgba(6,182,212,0.08)' : 'transparent' }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                            onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <td style={{ ...tdS('#22D3EE', 'left'), fontWeight: isSelected ? 600 : 400 }}>
                              {s.date}
                              {isSelected && <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(6,182,212,0.2)', color: '#22D3EE', padding: '1px 5px', borderRadius: 3 }}>선택</span>}
                            </td>
                            <td style={tdS()}>{fmt(s.total_asset_krw)}</td>
                            <td style={tdS()}>{fmt(s.purchase_amount_krw)}</td>
                            <td style={tdS()}>{fmt(s.eval_amount_krw)}</td>
                            <td style={tdS(isPos ? '#EF4444' : '#60A5FA')}>
                              {isPos ? '+' : ''}{fmt(s.profit_loss_krw)}
                            </td>
                            <td style={tdS(isPos ? '#EF4444' : '#60A5FA')}>
                              {fmtPct(s.return_pct)}
                            </td>
                            <td style={tdS()}>{fmt(s.cash_krw)}</td>
                            <td style={{ ...tdS(), textAlign: 'center' }}>{s.position_count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 선택 날짜 종목 내역 */}
            {displayDate && (
              <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(42,63,85,0.5)' }}>
                  <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {displayDate} 종목 내역
                  </p>
                </div>

                {posLoading ? (
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} h={36}/>)}
                  </div>
                ) : positions.length === 0 ? (
                  <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                    <p style={{ color: '#6B7280', fontSize: 13 }}>해당 날짜 종목 데이터가 없습니다</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thS('left')}>종목명</th>
                          <th style={thS('left')}>심볼</th>
                          <th style={thS('left')}>시장</th>
                          <th style={thS()}>수량</th>
                          <th style={thS()}>매입금액</th>
                          <th style={thS()}>평가금액</th>
                          <th style={thS()}>평가손익</th>
                          <th style={thS()}>수익률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((p, i) => {
                          const isPos = p.return_pct >= 0;
                          return (
                            <tr key={i}>
                              <td style={tdS('#F9FAFB', 'left')}>{p.name}</td>
                              <td style={{ ...tdS('#9CA3AF', 'left') }}>{p.symbol}</td>
                              <td style={{ ...tdS('left') }}>
                                <span style={{
                                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                  background: p.market === 'KR' ? 'rgba(239,68,68,0.12)' : 'rgba(96,165,250,0.12)',
                                  color: p.market === 'KR' ? '#EF4444' : '#60A5FA',
                                }}>
                                  {p.market}
                                </span>
                              </td>
                              <td style={tdS()}>{p.quantity.toLocaleString()}</td>
                              <td style={tdS()}>{fmt(p.purchase_amount_krw)}</td>
                              <td style={tdS()}>{fmt(p.eval_amount_krw)}</td>
                              <td style={tdS(isPos ? '#EF4444' : '#60A5FA')}>
                                {isPos ? '+' : ''}{fmt(p.profit_loss_krw)}
                              </td>
                              <td style={tdS(isPos ? '#EF4444' : '#60A5FA')}>
                                {fmtPct(p.return_pct)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
