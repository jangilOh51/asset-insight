import { useState } from 'react';
import Link from 'next/link';
import { Portfolio } from '@/lib/mockData';

interface Props {
  portfolio: Portfolio;
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 40, height: 22, borderRadius: 9999,
      background: on ? '#06B6D4' : '#374151',
      position: 'relative', flexShrink: 0,
      transition: 'background 150ms',
    }}>
      <span style={{
        position: 'absolute', top: 3, width: 16, height: 16,
        background: '#fff', borderRadius: 9999,
        transform: `translateX(${on ? 21 : 3}px)`,
        transition: 'transform 150ms',
        display: 'block',
      }}/>
    </div>
  );
}

const BROKER_INITIALS: Record<string, string> = {
  '삼성증권': '삼', '키움증권': '키', '대신증권': '대',
  '미래에셋': '미', '한국투자': '한', 'KIS': 'K',
};

function fmt(n: number) {
  if (n === 0) return '₩0';
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

export default function PortfolioCard({ portfolio: p }: Props) {
  const [active, setActive] = useState(p.active);
  const isProfit = p.returnPct > 0;
  const isZero = p.totalValueKrw === 0;
  const initial = BROKER_INITIALS[p.broker] ?? p.broker[0];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(42,63,85,0.5)', transition: 'background 150ms', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,41,55,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Link href={`/portfolio/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textDecoration: 'none', minWidth: 0 }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 9999,
          background: p.brokerColor, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: '#F9FAFB',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: '1.4',
          }}>
            <span style={{ color: '#D1D5DB' }}>{p.broker}</span>
            <span style={{ color: '#9CA3AF', marginLeft: 4, fontSize: 12 }}>{p.name}</span>
          </div>
          <div style={{
            fontSize: 13, marginTop: 1,
            fontFamily: 'JetBrains Mono, monospace',
            color: isZero ? '#6B7280' : (isProfit ? '#EF4444' : '#60A5FA'),
          }}>
            {fmt(p.totalValueKrw)}
            {!isZero && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                {isProfit ? '+' : ''}{p.returnPct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Toggle */}
      <div onClick={e => { e.preventDefault(); setActive(v => !v); }}>
        <Toggle on={active} />
      </div>
    </div>
  );
}
