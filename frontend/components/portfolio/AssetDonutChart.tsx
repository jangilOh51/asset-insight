import dynamic from 'next/dynamic';
import { donutData } from '@/lib/mockData';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

export default function AssetDonutChart() {
  return (
    <div className="space-y-3">
      {/* 도넛 차트 */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              dataKey="value"
              stroke="none"
            >
              {donutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="space-y-1.5">
        {donutData.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-300 truncate max-w-[120px]">{item.name}</span>
            </div>
            <span className="text-gray-400 font-medium">{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
