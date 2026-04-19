import dynamic from 'next/dynamic';
import useSWR from 'swr';
import axios from 'axios';
import AppLayout, { TopBar } from '@/components/layout/AppLayout';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import type { AccountOut, PortfolioRealtimeResponse } from '@/types';

const SectorTreemap = dynamic(
  () => import('@/components/dashboard/SectorTreemap'),
  { ssr: false, loading: () => <div style={{ height: 200, background: '#1A2332', borderRadius: 12 }}/> }
);

const fetcher = (url: string) => axios.get(url).then(r => r.data);

function fmt(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

function Skeleton({ w = '100%', h = 20 }: { w?: number | string; h?: number }) {
  return (
    <div style={{
      width: w, height: h, background: '#1E2D3E', borderRadius: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}/>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: string;
  hint?: string;
  loading?: boolean;
}

function StatCard({ label, value, delta, deltaColor, hint, loading }: StatCardProps) {
  return (
    <div style={{
      background: '#1A2332', border: '1px solid #2A3F55',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      {loading ? (
        <Skeleton w={120} h={28}/>
      ) : (
        <>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 22, fontWeight: 700, color: '#F9FAFB',
            letterSpacing: '-0.02em',
          }}>
            {value}
          </div>
          {delta && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginTop: 4, color: deltaColor ?? '#9CA3AF' }}>
              {delta}
            </div>
          )}
          {hint && <div style={{ fontSize: 12, marginTop: 4, color: '#22D3EE' }}>{hint}</div>}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const {
    data: portfolio,
    isLoading: portfolioLoading,
    error: portfolioError,
    mutate: refreshPortfolio,
  } = useSWR<PortfolioRealtimeResponse>('/api/v1/portfolio/realtime', fetcher, { refreshInterval: 60000 });

  const {
    data: accounts = [],
    isLoading: accountsLoading,
  } = useSWR<AccountOut[]>('/api/v1/accounts', fetcher);

  const summary  = portfolio?.summary;
  const holdings = portfolio?.holdings ?? [];
  const totalAsset  = summary?.total_asset_krw ?? 0;
  const totalProfit = summary?.profit_loss_krw ?? 0;
  const returnPct   = summary?.return_pct ?? 0;
  const cashKrw     = summary?.cash_krw ?? 0;
  const isProfit    = totalProfit >= 0;
  const isLoading   = portfolioLoading || accountsLoading;

  const updatedAt = portfolio?.fetched_at
    ? new Date(portfolio.fetched_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : undefined;

  const activeAccounts = accounts.filter(a => a.is_active);

  return (
    <AppLayout>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      <TopBar
        title="포트폴리오"
        updated={updatedAt}
        right={
          <button
            onClick={() => refreshPortfolio()}
            style={{
              fontSize: 12, color: '#22D3EE',
              background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
            }}
          >
            새로고침
          </button>
        }
      />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 오류 배너 */}
        {portfolioError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: '#F87171',
          }}>
            실시간 데이터를 불러오지 못했습니다. API 키 및 계좌 설정을 확인하세요.
          </div>
        )}

        {/* Hero — 총 자산 */}
        <div style={{ padding: '4px 4px 0' }}>
          <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            총 자산
          </p>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w={200} h={44}/>
              <Skeleton w={140} h={20}/>
            </div>
          ) : (
            <>
              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 38, fontWeight: 700, color: '#F9FAFB',
                letterSpacing: '-0.025em', lineHeight: 1,
              }}>
                {totalAsset > 0 ? fmt(totalAsset) : '—'}
              </p>
              {totalAsset > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14, fontWeight: 600,
                    color: isProfit ? '#EF4444' : '#60A5FA',
                  }}>
                    {isProfit ? '+' : ''}{fmt(totalProfit)}
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12, padding: '3px 8px', borderRadius: 6,
                    background: isProfit ? 'rgba(239,68,68,0.12)' : 'rgba(96,165,250,0.12)',
                    color: isProfit ? '#EF4444' : '#60A5FA', fontWeight: 600,
                  }}>
                    {isProfit ? '+' : ''}{returnPct.toFixed(2)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* StatCards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard
            label="예수금"
            value={cashKrw > 0 ? fmt(cashKrw) : '—'}
            hint={cashKrw > 0 ? `총 자산의 ${((cashKrw / (totalAsset || 1)) * 100).toFixed(1)}%` : undefined}
            loading={isLoading}
          />
          <StatCard
            label="평가손익"
            value={totalProfit !== 0 ? `${isProfit ? '+' : ''}${fmt(totalProfit)}` : '—'}
            delta={returnPct !== 0 ? `${isProfit ? '+' : ''}${returnPct.toFixed(2)}%` : undefined}
            deltaColor={isProfit ? '#EF4444' : '#60A5FA'}
            loading={isLoading}
          />
        </div>

        {/* 섹터 현황 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              종목 현황
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF' }}>
                <span style={{ width: 8, height: 8, background: '#EF4444', borderRadius: 2, display: 'inline-block' }}/>상승
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF' }}>
                <span style={{ width: 8, height: 8, background: '#525252', borderRadius: 2, display: 'inline-block' }}/>보합
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF' }}>
                <span style={{ width: 8, height: 8, background: '#22C55E', borderRadius: 2, display: 'inline-block' }}/>하락
              </span>
            </div>
          </div>
          <SectorTreemap holdings={holdings}/>
        </div>

        {/* 포트폴리오 목록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              계좌 {activeAccounts.length > 0 && <span style={{ color: '#F9FAFB' }}>{activeAccounts.length}</span>}
            </p>
            <a href="/accounts" style={{
              background: 'none', border: '1px solid #2A3F55', borderRadius: 6,
              color: '#22D3EE', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
              textDecoration: 'none',
            }}>
              관리
            </a>
          </div>

          {accountsLoading ? (
            <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2].map(i => <Skeleton key={i} h={44}/>)}
            </div>
          ) : activeAccounts.length === 0 ? (
            <div style={{
              background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12,
              padding: '32px 16px', textAlign: 'center',
            }}>
              <p style={{ color: '#6B7280', fontSize: 14 }}>등록된 계좌가 없습니다</p>
              <a href="/accounts" style={{
                display: 'inline-block', marginTop: 10, fontSize: 12,
                color: '#22D3EE', textDecoration: 'none',
              }}>
                계좌 추가하기 →
              </a>
            </div>
          ) : (
            <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
              {activeAccounts.map(acc => <PortfolioCard key={acc.id} account={acc}/>)}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
