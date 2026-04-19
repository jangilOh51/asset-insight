import { useState } from 'react';
import type { HoldingItem } from '@/types';

type Tab = '전체' | '국내' | '해외';
type SortKey = 'eval_amount_krw' | 'return_pct' | 'weight_pct';

const EXCHANGE_COLORS: Record<string, string> = {
  KR:   '#1A56DB',
  NASD: '#EF4444',
  NYSE: '#F59E0B',
  AMEX: '#22C55E',
};

const SORT_LABELS: Record<SortKey, string> = {
  eval_amount_krw: '평가금액순',
  return_pct:      '수익률순',
  weight_pct:      '비중순',
};
const SORT_KEYS: SortKey[] = ['eval_amount_krw', 'return_pct', 'weight_pct'];

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(42,63,85,0.5)' }}>
      <div style={{ width: 4, height: 44, borderRadius: 9999, background: '#1E2D3E' }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 13, background: '#1E2D3E', borderRadius: 4, width: '55%', animation: 'pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ height: 11, background: '#1E2D3E', borderRadius: 4, width: '35%', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <div style={{ height: 13, background: '#1E2D3E', borderRadius: 4, width: 64, animation: 'pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ height: 11, background: '#1E2D3E', borderRadius: 4, width: 48, animation: 'pulse 1.5s ease-in-out infinite' }}/>
      </div>
    </div>
  );
}

function HoldingRow({ h }: { h: HoldingItem }) {
  const isProfit = h.return_pct >= 0;
  const color    = EXCHANGE_COLORS[h.exchange] ?? '#525252';

  const priceLabel =
    h.currency === 'KRW'
      ? `₩${h.current_price_native.toLocaleString()}`
      : `$${h.current_price_native.toFixed(2)}`;

  const profitAbs = Math.abs(h.profit_loss_krw);
  const profitLabel =
    profitAbs >= 10_000
      ? `${isProfit ? '+' : '-'}₩${Math.round(profitAbs / 10_000).toLocaleString()}만`
      : `${isProfit ? '+' : '-'}₩${profitAbs.toLocaleString()}`;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: '1px solid rgba(42,63,85,0.4)',
        cursor: 'pointer', transition: 'background 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,41,55,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Sector bar */}
      <div style={{ width: 4, height: 44, borderRadius: 9999, background: color, flexShrink: 0 }}/>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#F9FAFB',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {h.name}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
            {h.symbol}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
          {h.quantity.toLocaleString()}주
          {' · '}
          <span style={{ color: '#6B7280' }}>{h.exchange}</span>
        </div>
      </div>

      {/* Price + return */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', fontFamily: 'JetBrains Mono, monospace' }}>
          {priceLabel}
        </div>
        <div style={{
          fontSize: 11, marginTop: 2,
          fontFamily: 'JetBrains Mono, monospace',
          color: isProfit ? '#EF4444' : '#60A5FA',
        }}>
          {isProfit ? '+' : ''}{h.return_pct.toFixed(2)}%
        </div>
      </div>

      {/* Weight + PnL */}
      <div style={{ textAlign: 'right', width: 72, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
          {h.weight_pct.toFixed(1)}%
        </div>
        <div style={{
          fontSize: 11, marginTop: 2,
          fontFamily: 'JetBrains Mono, monospace',
          color: isProfit ? '#EF4444' : '#60A5FA',
        }}>
          {profitLabel}
        </div>
      </div>
    </div>
  );
}

interface Props {
  holdings: HoldingItem[];
  isLoading?: boolean;
}

export default function HoldingsList({ holdings, isLoading }: Props) {
  const [tab, setTab]       = useState<Tab>('전체');
  const [sortKey, setSortKey] = useState<SortKey>('eval_amount_krw');

  const TABS: Tab[] = ['전체', '국내', '해외'];
  const krCount = holdings.filter(h => h.market === 'KR').length;
  const usCount = holdings.filter(h => h.market === 'US').length;

  const filtered = holdings.filter(h => {
    if (tab === '국내') return h.market === 'KR';
    if (tab === '해외') return h.market === 'US';
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b[sortKey] - a[sortKey]);

  function nextSort() {
    const idx = SORT_KEYS.indexOf(sortKey);
    setSortKey(SORT_KEYS[(idx + 1) % SORT_KEYS.length]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #2A3F55',
        background: 'rgba(11,17,27,0.6)',
        backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => {
            const active = tab === t;
            const count = t === '국내' ? krCount : t === '해외' ? usCount : null;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '12px 16px',
                  fontSize: 13, fontWeight: 500,
                  color: active ? '#22D3EE' : '#6B7280',
                  background: 'none', border: 'none', cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 150ms',
                }}
              >
                {t}
                {count !== null && (
                  <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>
                    {count}
                  </span>
                )}
                {active && (
                  <div style={{
                    position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
                    background: '#22D3EE', borderRadius: '2px 2px 0 0',
                  }}/>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={nextSort}
          style={{
            marginRight: 12, padding: '6px 10px',
            fontSize: 11, color: '#9CA3AF',
            background: 'none', border: '1px solid #2A3F55',
            borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {SORT_LABELS[sortKey]}
          <svg width="9" height="5" viewBox="0 0 9 5" fill="none">
            <path d="M1 1l3.5 3L8 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i}/>)
          : sorted.length === 0
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(42,63,85,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
              </svg>
              <p style={{ fontSize: 13, color: '#6B7280' }}>종목이 없습니다</p>
            </div>
          )
          : sorted.map((h, i) => <HoldingRow key={`${h.symbol}-${i}`} h={h}/>)
        }
      </div>
    </div>
  );
}
