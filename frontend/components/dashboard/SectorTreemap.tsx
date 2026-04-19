import type { HoldingItem } from '@/types';

interface Props {
  holdings?: HoldingItem[];
}

function changeColor(chg: number): string {
  if (chg >= 3)    return '#EF4444';
  if (chg >= 2)    return '#DC2626';
  if (chg >= 1)    return '#B91C1C';
  if (chg >  0.1)  return '#7F1D1D';
  if (chg >= -0.1) return '#525252';
  if (chg >= -1)   return '#166534';
  if (chg >= -2)   return '#15803D';
  if (chg >= -3)   return '#16A34A';
  return '#22C55E';
}

interface FlatItem {
  name: string;
  size: number;
  change: number;
  currency: string;
}

function holdingsToItems(holdings: HoldingItem[]): FlatItem[] {
  return holdings
    .filter(h => h.eval_amount_krw > 0)
    .map(h => ({
      name: h.name.length > 12 ? h.name.slice(0, 11) + '…' : h.name,
      size: h.eval_amount_krw,
      change: h.day_change_pct,
      currency: h.currency,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 20);
}

export default function SectorTreemap({ holdings = [] }: Props) {
  const items: FlatItem[] = holdings.length > 0 ? holdingsToItems(holdings) : [];
  const total = items.reduce((s, d) => s + d.size, 0);

  if (items.length === 0) {
    return (
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#111827', borderRadius: 12,
        color: '#4B5563', fontSize: 13,
      }}>
        보유 종목 없음
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridAutoRows: '58px',
        gap: 3,
        width: '100%',
        background: '#0B111B',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {items.map((d, i) => {
        const ratio = d.size / total;
        const colSpan = ratio > 0.25 ? 3 : ratio > 0.12 ? 2 : 2;
        const rowSpan = ratio > 0.18 ? 2 : 1;

        return (
          <div
            key={i}
            style={{
              gridColumn: `span ${colSpan}`,
              gridRow: `span ${rowSpan}`,
              background: changeColor(d.change),
              borderRadius: 4,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', padding: 4, textAlign: 'center',
              cursor: 'pointer', transition: 'opacity 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{d.name}</div>
            <div style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              marginTop: 3, opacity: 0.9,
              color: d.change > 0.1 ? '#fca5a5' : d.change < -0.1 ? '#86efac' : '#d1d5db',
            }}>
              {d.change > 0 ? '+' : ''}{d.change.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
