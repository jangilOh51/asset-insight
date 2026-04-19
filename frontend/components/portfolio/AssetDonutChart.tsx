import type { HoldingItem } from '@/types';

const MARKET_COLORS = {
  KR:   '#1A56DB',
  US:   '#EF4444',
  현금: '#374151',
};

interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  holdings: HoldingItem[];
  cashKrw: number;
}

function arc(cx: number, cy: number, r: number, inner: number, startPct: number, endPct: number): string {
  const a0 = startPct * Math.PI * 2 - Math.PI / 2;
  const a1 = endPct   * Math.PI * 2 - Math.PI / 2;
  const large = endPct - startPct > 0.5 ? 1 : 0;
  const x0 = cx + Math.cos(a0) * r,  y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r,  y1 = cy + Math.sin(a1) * r;
  const xi0 = cx + Math.cos(a0) * inner, yi0 = cy + Math.sin(a0) * inner;
  const xi1 = cx + Math.cos(a1) * inner, yi1 = cy + Math.sin(a1) * inner;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

export default function AssetDonutChart({ holdings, cashKrw }: Props) {
  const krEval  = holdings.filter(h => h.market === 'KR').reduce((s, h) => s + h.eval_amount_krw, 0);
  const usEval  = holdings.filter(h => h.market === 'US').reduce((s, h) => s + h.eval_amount_krw, 0);
  const total   = krEval + usEval + cashKrw;

  const slices: DonutSlice[] = [
    { name: '국내 주식', value: total > 0 ? krEval / total * 100  : 0, color: MARKET_COLORS.KR },
    { name: '해외 주식', value: total > 0 ? usEval / total * 100  : 0, color: MARKET_COLORS.US },
    { name: '현금',      value: total > 0 ? cashKrw / total * 100 : 0, color: MARKET_COLORS.현금 },
  ].filter(s => s.value > 0.1);

  const SIZE = 160, CX = SIZE / 2, CY = SIZE / 2, R = 58, INNER = 38;
  let accum = 0;
  const totalPct = slices.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      {/* SVG 도넛 */}
      <div style={{ position: 'relative', width: SIZE, margin: '0 auto' }}>
        <svg width={SIZE} height={SIZE} style={{ display: 'block' }}>
          {slices.map((d, i) => {
            const start = accum / 100;
            accum += d.value;
            const end = accum / 100;
            return (
              <path
                key={i}
                d={arc(CX, CY, R, INNER, start, end)}
                fill={d.color}
                style={{ transition: 'opacity 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              />
            );
          })}
        </svg>
        {/* 중앙 레이블 */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1 }}>총 비중</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 18, fontWeight: 700, color: '#F9FAFB',
            lineHeight: 1.2, marginTop: 2,
          }}>
            {totalPct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((item, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: item.color, display: 'inline-block' }}/>
                <span style={{ fontSize: 12, color: '#D1D5DB' }}>{item.name}</span>
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, color: '#9CA3AF',
              }}>
                {item.value.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 2, background: '#1E2D3E', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: item.color, width: `${item.value}%`, borderRadius: 9999 }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
