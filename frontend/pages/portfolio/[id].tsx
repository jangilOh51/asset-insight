import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import axios from 'axios';
import AppLayout from '@/components/layout/AppLayout';
import HoldingsList from '@/components/portfolio/HoldingsList';
import { fetchPortfolioRealtime } from '@/lib/api';
import type { AccountOut, PortfolioRealtimeResponse } from '@/types';

const AssetDonutChart = dynamic(() => import('@/components/portfolio/AssetDonutChart'), {
  ssr: false,
  loading: () => <div style={{ height: 192, background: '#1E2D3E', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }}/>,
});
const AssetBarHistory = dynamic(() => import('@/components/portfolio/AssetBarHistory'), {
  ssr: false,
  loading: () => <div style={{ height: 88, background: '#1E2D3E', borderRadius: 8 }}/>,
});

const fetcher = (url: string) => axios.get(url).then(r => r.data);

function fmt(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid rgba(42,63,85,0.4)',
    }}>
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12, fontWeight: 500,
        color: valueColor ?? '#D1D5DB',
      }}>
        {value}
      </span>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={spinning ? { animation: 'spin 1s linear infinite' } : undefined}
    >
      <path d="M23 4v6h-6"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}

export default function PortfolioDetail() {
  const router = useRouter();
  const { id } = router.query;
  const accountId = typeof id === 'string' ? id : undefined;

  const { data: account } = useSWR<AccountOut>(
    accountId ? `/api/v1/accounts` : null,
    fetcher,
    {
      // accounts API returns array; pick the right one
      use: [],
    }
  );

  // Fetch account list to find account_no
  const { data: accounts = [] } = useSWR<AccountOut[]>('/api/v1/accounts', fetcher);
  const currentAccount = accounts.find(a => a.id === accountId);

  const [data,        setData]        = useState<PortfolioRealtimeResponse | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isRefreshing,setIsRefreshing]= useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchPortfolioRealtime(accountId);
      setData(result);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const summary  = data?.summary;
  const holdings = data?.holdings ?? [];
  const isProfit = (summary?.return_pct ?? 0) >= 0;

  const evalAmount  = summary?.total_asset_krw ?? 0;
  const returnPct   = summary?.return_pct ?? 0;
  const profitKrw   = summary?.profit_loss_krw ?? 0;
  const purchaseKrw = summary?.purchase_amount_krw ?? 0;

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-';

  const brokerLabel = currentAccount
    ? `${currentAccount.broker} · ${currentAccount.broker_type}${currentAccount.is_mock ? ' (모의)' : ''}`
    : '한국투자증권 · KIS';

  return (
    <AppLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* TopBar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid #1f2937',
        background: '#111827', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#22D3EE', textDecoration: 'none', fontWeight: 500,
        }}>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          포트폴리오
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
              {updatedLabel} 업데이트
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: '#22D3EE',
              background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              opacity: isRefreshing ? 0.5 : 1,
            }}
          >
            <RefreshIcon spinning={isRefreshing}/>
            새로고침
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
          <p style={{ color: '#EF4444', fontSize: 14 }}>{error}</p>
          <button onClick={() => load()} style={{ color: '#22D3EE', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            다시 시도
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>

          {/* ── 좌측 패널 ── */}
          <div style={{
            width: 272, flexShrink: 0,
            borderRight: '1px solid #1f2937',
            overflowY: 'auto', background: '#0B111B',
          }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* 헤더 */}
              <div>
                <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{brokerLabel}</p>
                {currentAccount?.account_name && (
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{currentAccount.account_name}</p>
                )}
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 36, background: '#1E2D3E', borderRadius: 6, width: 160 }}/>
                    <div style={{ height: 18, background: '#1E2D3E', borderRadius: 6, width: 120 }}/>
                  </div>
                ) : (
                  <>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 30, fontWeight: 700, color: '#F9FAFB',
                      letterSpacing: '-0.025em', lineHeight: 1,
                    }}>
                      {fmt(evalAmount)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 14, fontWeight: 600,
                        color: isProfit ? '#EF4444' : '#60A5FA',
                      }}>
                        {isProfit ? '+' : ''}{returnPct.toFixed(2)}%
                      </span>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 11, padding: '2px 7px', borderRadius: 5,
                        background: isProfit ? 'rgba(239,68,68,0.12)' : 'rgba(96,165,250,0.12)',
                        color: isProfit ? '#EF4444' : '#60A5FA',
                      }}>
                        {isProfit ? '+' : ''}{fmt(Math.abs(profitKrw))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* 수익 요약 */}
              {!isLoading && summary && (
                <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 10, padding: '4px 14px' }}>
                  <StatRow label="매입금액"   value={fmt(purchaseKrw)}/>
                  <StatRow label="평가금액"   value={fmt(summary.eval_amount_krw)}/>
                  <StatRow
                    label="총 수익"
                    value={`${isProfit ? '+' : ''}${fmt(Math.abs(profitKrw))}`}
                    valueColor={isProfit ? '#EF4444' : '#60A5FA'}
                  />
                  <StatRow label="예수금"     value={fmt(summary.cash_krw)}/>
                  <div style={{ paddingBottom: 4 }}>
                    <StatRow label="USD/KRW" value={`₩${(data?.usd_krw ?? 0).toFixed(0)}`} valueColor="#6B7280"/>
                  </div>
                </div>
              )}

              {/* 자산 구성 도넛 */}
              {!isLoading && (
                <div>
                  <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                    자산 구성
                  </p>
                  <AssetDonutChart holdings={holdings} cashKrw={summary?.cash_krw ?? 0}/>
                </div>
              )}

              {/* 기간별 자산 */}
              <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 10, padding: '14px' }}>
                <AssetBarHistory accountNo={currentAccount?.account_no}/>
              </div>

              {/* 보유 정보 */}
              {!isLoading && (
                <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 10, padding: '4px 14px' }}>
                  <StatRow label="총 종목수" value={`${holdings.length}종목`}/>
                  <StatRow label="국내"      value={`${holdings.filter(h => h.market === 'KR').length}종목`}/>
                  <StatRow label="해외"      value={`${holdings.filter(h => h.market === 'US').length}종목`}/>
                  <div style={{ paddingBottom: 4 }}>
                    <StatRow label="마지막 업데이트" value={updatedLabel}/>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── 우측: 종목 목록 ── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <HoldingsList holdings={holdings} isLoading={isLoading}/>
          </div>

        </div>
      )}
    </AppLayout>
  );
}
