import { barHistoryData } from '@/lib/mockData';

export default function AssetBarHistory() {
  const max  = Math.max(...barHistoryData.map(d => d.value));
  const last = barHistoryData[barHistoryData.length - 1].value;

  return (
    <div>
      <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, letterSpacing: '0.04em' }}>
        기간별 자산 변화
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72 }}>
        {barHistoryData.map((d, i) => {
          const h = Math.round(d.value / max * 60);
          const isLast = d.value === last;
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <div
                style={{
                  width: '100%', height: h,
                  background: isLast ? '#06B6D4' : '#1E3A5F',
                  borderRadius: '3px 3px 0 0',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              />
              <div style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                color: isLast ? '#22D3EE' : '#6B7280',
              }}>
                {d.date}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
