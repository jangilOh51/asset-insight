import dynamic from 'next/dynamic';
import AppLayout, { TopBar } from '@/components/layout/AppLayout';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import {
  portfolios, totalAsset, totalProfit, totalReturnPct, monthlyDividend,
} from '@/lib/mockData';

const SectorTreemap = dynamic(
  () => import('@/components/dashboard/SectorTreemap'),
  { ssr: false, loading: () => <div style={{ height: 240, background: '#1A2332', borderRadius: 12 }}/> }
);

function fmt(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: string;
  hint?: string;
}

function StatCard({ label, value, delta, deltaColor, hint }: StatCardProps) {
  return (
    <div style={{
      background: '#1A2332', border: '1px solid #2A3F55',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 22, fontWeight: 700, color: '#F9FAFB',
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {delta && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, marginTop: 4,
          color: deltaColor ?? '#9CA3AF',
        }}>
          {delta}
        </div>
      )}
      {hint && (
        <div style={{ fontSize: 12, marginTop: 4, color: '#22D3EE' }}>{hint}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const isProfit = totalProfit >= 0;

  return (
    <AppLayout>
      <TopBar title="포트폴리오" updated="2026.04.19 18:00"/>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Hero — 총 자산 */}
        <div style={{ padding: '4px 4px 0' }}>
          <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            총 자산
          </p>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 38, fontWeight: 700, color: '#F9FAFB',
            letterSpacing: '-0.025em', lineHeight: 1,
          }}>
            {fmt(totalAsset)}
          </p>
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
              color: isProfit ? '#EF4444' : '#60A5FA',
              fontWeight: 600,
            }}>
              {isProfit ? '+' : ''}{totalReturnPct}%
            </span>
          </div>
        </div>

        {/* StatCards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard
            label="이번달 배당"
            value={`₩${monthlyDividend.toLocaleString()}`}
            hint="04월 예상"
          />
          <StatCard
            label="총 수익"
            value={fmt(totalProfit)}
            delta={`+${totalReturnPct}%`}
            deltaColor="#EF4444"
          />
        </div>

        {/* 섹터 트리맵 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              섹터 현황
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
          <SectorTreemap/>
        </div>

        {/* 포트폴리오 목록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              포트폴리오
            </p>
            <button style={{
              background: 'none', border: '1px solid #2A3F55', borderRadius: 6,
              color: '#22D3EE', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
            }}>
              편집
            </button>
          </div>
          <div style={{ background: '#1A2332', border: '1px solid #2A3F55', borderRadius: 12, overflow: 'hidden' }}>
            {portfolios.map(p => <PortfolioCard key={p.id} portfolio={p}/>)}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
