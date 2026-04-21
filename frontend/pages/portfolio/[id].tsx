import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import axios from 'axios';
import AppLayout from '@/components/layout/AppLayout';
import HoldingsList from '@/components/portfolio/HoldingsList';
import { fetchPortfolioRealtime } from '@/lib/api';
import { fmt } from '@/lib/format';
import type { AccountOut, PortfolioRealtimeResponse } from '@/types';

const AssetDonutChart = dynamic(() => import('@/components/portfolio/AssetDonutChart'), {
  ssr: false,
  loading: () => <div style={{ height: 180, background: '#1E2D3E', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }}/>,
});
const AssetBarHistory = dynamic(() => import('@/components/portfolio/AssetBarHistory'), {
  ssr: false,
  loading: () => <div style={{ height: 180, background: '#1E2D3E', borderRadius: 8 }}/>,
});

const fetcher = (url: string) => axios.get(url).then(r => r.data);

function Skeleton({ w = '100%', h = 20 }: { w?: number | string; h?: number }) {
  return (
    <div style={{
      width: w, height: h, background: '#1E2D3E', borderRadius: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}/>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={spinning ? { animation: 'spin 1s linear infinite' } : undefined}
    >
      <path d="M23 4v6h-6"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  loading?: boolean;
}

function SummaryCard({ label, value, sub, subColor, loading }: SummaryCardProps) {
  return (
    <div style={{
      background: '#1A2332', border: '1px solid #2A3F55',
      borderRadius: 10, padding: '14px 18px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {loading ? (
        <Skeleton w={100} h={24}/>
      ) : (
        <>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 18, fontWeight: 700, color: '#F9FAFB',
            letterSpacing: '-0.02em',
          }}>
            {value}
          </span>
          {sub && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, color: subColor ?? '#9CA3AF',
            }}>
              {sub}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default function PortfolioDetail() {
  const router    = useRouter();
  const { id }    = router.query;
  const accountId = typeof id === 'string' ? id : undefined;

  const { data: accounts = [] } = useSWR<AccountOut[]>('/api/v1/accounts', fetcher);
  const currentAccount = accounts.find(a => a.id === accountId);

  const [data,         setData]         = useState<PortfolioRealtimeResponse | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);

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
  useEffect(() => {
    const timer = setInterval(() => load(true), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const summary     = data?.summary;
  const holdings    = data?.holdings ?? [];
  const isProfit    = (summary?.return_pct ?? 0) >= 0;
  const evalAmount  = summary?.total_asset_krw  ?? 0;
  const returnPct   = summary?.return_pct        ?? 0;
  const profitKrw   = summary?.profit_loss_krw   ?? 0;
  const purchaseKrw = summary?.purchase_amount_krw ?? 0;
  const cashKrw     = summary?.cash_krw           ?? 0;
  const usdKrw      = data?.usd_krw               ?? 0;

  const profitColor = isProfit ? '#EF4444' : '#60A5FA';

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const brokerLabel = currentAccount
    ? `${currentAccount.broker} · ${currentAccount.broker_type}${currentAccount.is_mock ? ' (모의)' : ''}`
    : '한국투자증권';

  const accountTitle = currentAccount?.account_name || currentAccount?.account_no || '포트폴리오 상세';

  const todayChangePct = holdings.length > 0
    ? holdings.reduce((sum, h) => sum + h.day_change_pct * (h.weight_pct / 100), 0)
    : 0;
  const todayChangeKrw = evalAmount * (todayChangePct / 100);
  const isTodayUp = todayChangePct >= 0;

  return (
    <AppLayout>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* ── TopBar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid #1f2937',
        background: '#111827', position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 13, color: '#22D3EE', textDecoration: 'none', fontWeight: 500,
          }}>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            포트폴리오
          </Link>
          <div style={{ width: 1, height: 16, background: '#2A3F55' }}/>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB' }}>{accountTitle}</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: '#6B7280' }}>{brokerLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {updatedLabel && (
            <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
              {updatedLabel} 업데이트
            </span>
          )}
          {usdKrw > 0 && (
            <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
              USD ₩{usdKrw.toFixed(0)}
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

      {/* ── 에러 ── */}
      {error && (
        <div style={{
          margin: '16px 24px 0',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#F87171' }}>{error}</span>
          <button onClick={() => load()} style={{ color: '#22D3EE', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            다시 시도
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 요약 카드 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <SummaryCard
            label="총 자산"
            value={evalAmount > 0 ? fmt(evalAmount) : '—'}
            loading={isLoading}
          />
          <SummaryCard
            label="투자원금"
            value={purchaseKrw > 0 ? fmt(purchaseKrw) : '—'}
            loading={isLoading}
          />
          <SummaryCard
            label="평가손익"
            value={profitKrw !== 0 ? `${isProfit ? '+' : ''}${fmt(Math.abs(profitKrw))}` : '—'}
            sub={returnPct !== 0 ? `${isProfit ? '+' : ''}${returnPct.toFixed(2)}%` : undefined}
            subColor={profitColor}
            loading={isLoading}
          />
          <SummaryCard
            label="예수금"
            value={cashKrw > 0 ? fmt(cashKrw) : '—'}
            sub={cashKrw > 0 ? `총 자산의 ${((cashKrw / (evalAmount || 1)) * 100).toFixed(1)}%` : undefined}
            loading={isLoading}
          />
          <SummaryCard
            label="당일 등락"
            value={todayChangePct !== 0 ? `${isTodayUp ? '+' : ''}${todayChangePct.toFixed(2)}%` : '—'}
            sub={todayChangeKrw !== 0 ? `${isTodayUp ? '+' : ''}${fmt(Math.round(Math.abs(todayChangeKrw)))}` : undefined}
            subColor={isTodayUp ? '#EF4444' : '#60A5FA'}
            loading={isLoading}
          />
        </div>

        {/* ── 차트 섹션 ── */}
        {!isLoading && holdings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 자산 구성 도넛 */}
            <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, padding: '18px 20px' }}>
              <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                자산 구성
              </p>
              <AssetDonutChart holdings={holdings} cashKrw={cashKrw}/>
            </div>

            {/* 월별 자산 변화 */}
            <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, padding: '18px 20px' }}>
              <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                월별 자산 변화
              </p>
              <AssetBarHistory accountNo={currentAccount?.account_no}/>
            </div>
          </div>
        )}

        {/* ── 보유 종목 테이블 ── */}
        <div style={{ background: '#111827', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
          <HoldingsList holdings={holdings} isLoading={isLoading}/>
        </div>

      </div>
    </AppLayout>
  );
}
