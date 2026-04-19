import useSWR from 'swr';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import { fetchMarketIndices, fetchPortfolioRealtime } from '@/lib/api';
import { fmtPct } from '@/lib/format';
import type { IndexQuote, MarketIndices, PortfolioRealtimeResponse } from '@/types';

const SectorTreemap = dynamic(() => import('@/components/dashboard/SectorTreemap'), { ssr: false });

const INDEX_ORDER: (keyof MarketIndices)[] = ['KOSPI', 'SP500', 'NASDAQ', 'USD_KRW'];

function changeColor(pct: number | null): string {
  if (pct === null) return '#6B7280';
  if (pct > 0) return '#EF4444';
  if (pct < 0) return '#60A5FA';
  return '#6B7280';
}

function formatValue(key: keyof MarketIndices, value: number | null): string {
  if (value === null) return '—';
  if (key === 'USD_KRW') return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndexCard({ indexKey, quote }: { indexKey: keyof MarketIndices; quote: IndexQuote }) {
  const color = changeColor(quote.change_pct);
  const isUp = (quote.change_pct ?? 0) > 0;
  const sign = isUp ? '+' : '';

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50 font-medium">{quote.name}</span>
        {quote.change_pct !== null && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: color + '18', color }}
          >
            {sign}{fmtPct(quote.change_pct, false)}
          </span>
        )}
      </div>
      <p
        className="text-xl font-semibold font-mono"
        style={{ color: quote.value !== null ? '#F9FAFB' : '#6B7280' }}
      >
        {formatValue(indexKey, quote.value)}
      </p>
      {quote.change !== null && (
        <p className="text-xs font-mono" style={{ color }}>
          {sign}{quote.change.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {' '}
          <span className="opacity-70">전일 대비</span>
        </p>
      )}
      {quote.value === null && (
        <p className="text-xs text-white/30">데이터 없음</p>
      )}
    </div>
  );
}

function IndexCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 animate-pulse"
      style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="h-3 w-16 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <div className="h-6 w-28 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <div className="h-3 w-20 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

export default function MarketPage() {
  const { data: indices, error: indicesError, isLoading: indicesLoading } = useSWR<MarketIndices>(
    '/api/v1/market/indices',
    fetchMarketIndices,
    { refreshInterval: 300_000 }
  );

  const { data: portfolio } = useSWR<PortfolioRealtimeResponse>(
    '/api/v1/portfolio/realtime',
    () => fetchPortfolioRealtime(),
    { revalidateOnFocus: false }
  );

  const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AppLayout title="시황" updated={now}>
      <div className="max-w-4xl mx-auto py-4 px-4 flex flex-col gap-6">

        {/* 주요 지수 */}
        <section>
          <h2 className="text-sm font-medium text-white/50 mb-3">주요 지수</h2>

          {indicesError && (
            <div
              className="rounded-xl p-4 text-center text-sm text-white/40"
              style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              지수 데이터를 불러오지 못했습니다.
            </div>
          )}

          {indicesLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0,1,2,3].map(i => <IndexCardSkeleton key={i} />)}
            </div>
          )}

          {indices && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INDEX_ORDER.map(key => (
                <IndexCard key={key} indexKey={key} quote={indices[key]} />
              ))}
            </div>
          )}
        </section>

        {/* 보유 종목 트리맵 */}
        <section>
          <h2 className="text-sm font-medium text-white/50 mb-3">보유 종목 현황</h2>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {!portfolio && (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              </div>
            )}
            {portfolio && (
              <SectorTreemap holdings={portfolio.holdings} />
            )}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
