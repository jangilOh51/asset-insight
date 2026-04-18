import dynamic from 'next/dynamic';
import { barHistoryData } from '@/lib/mockData';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

export default function AssetBarHistory() {
  const max = Math.max(...barHistoryData.map(d => d.value));
  const last = barHistoryData[barHistoryData.length - 1].value;

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500">기간별 자산 변화</p>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barHistoryData} barSize={18}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {barHistoryData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.value === last ? '#06b6d4' : '#1e3a5f'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
