import useSWR from 'swr';
import axios from 'axios';
import { fmt } from '@/lib/format';
import type { SnapshotSummary } from '@/types';

interface Props {
  accountNo?: string;
}

const fetcher = (url: string) => axios.get(url).then(r => r.data);

function toMonthlyBuckets(snapshots: SnapshotSummary[]): { date: string; value: number }[] {
  const byMonth = new Map<string, number>();
  for (const s of snapshots) {
    const [y, m] = s.date.split('-');
    const key = `${y.slice(2)}/${m}`;
    // keep the latest value per month (snapshots are ordered desc)
    if (!byMonth.has(key)) byMonth.set(key, s.total_asset_krw);
  }
  return Array.from(byMonth.entries())
    .map(([date, value]) => ({ date, value }))
    .reverse()
    .slice(-6);
}

export default function AssetBarHistory({ accountNo }: Props) {
  const { data: snapshots, isLoading } = useSWR<SnapshotSummary[]>(
    accountNo ? `/api/v1/snapshot/summary/${accountNo}?limit=180` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div>
        <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, letterSpacing: '0.04em' }}>기간별 자산 변화</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 40, background: '#1E2D3E', borderRadius: '3px 3px 0 0', opacity: 0.5 }}/>
          ))}
        </div>
      </div>
    );
  }

  const buckets = snapshots && snapshots.length > 0 ? toMonthlyBuckets(snapshots) : [];

  if (buckets.length === 0) {
    return (
      <div>
        <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, letterSpacing: '0.04em' }}>기간별 자산 변화</p>
        <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, color: '#4B5563', textAlign: 'center', lineHeight: 1.5 }}>
            스냅샷 데이터 수집 중<br/>
            <span style={{ fontSize: 10, color: '#374151' }}>매일 18:00 자동 저장됩니다</span>
          </p>
        </div>
      </div>
    );
  }

  const max = Math.max(...buckets.map(d => d.value));

  return (
    <div>
      <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, letterSpacing: '0.04em' }}>
        기간별 자산 변화
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72 }}>
        {buckets.map((d, i) => {
          const h = Math.max(8, Math.round(d.value / max * 60));
          const isLast = i === buckets.length - 1;
          return (
            <div
              key={i}
              title={fmt(d.value)}
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
                fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
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
