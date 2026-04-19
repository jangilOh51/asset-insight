import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types";

interface Props {
  points: TrendPoint[];
}

function fmt(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

interface TooltipPayloadItem {
  value: number;
  name: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value * 10000;
  const isPos = (payload[1]?.value ?? 0) >= 0;
  return (
    <div style={{
      background: '#1A2332', border: '1px solid #2A3F55',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <p style={{ color: '#6B7280', marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#F9FAFB', fontWeight: 600 }}>₩{fmt(v)}</p>
      {payload[1] && (
        <p style={{ color: isPos ? '#EF4444' : '#60A5FA', marginTop: 2 }}>
          {isPos ? '+' : ''}{(payload[1].value as number).toFixed(2)}%
        </p>
      )}
    </div>
  );
}

export default function AssetTrendChart({ points }: Props) {
  const formatted = [...points]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(d => ({
      period: d.period.slice(0, 10),
      value_man: Math.round(d.total_value_krw / 10_000),
      return_pct: d.avg_return_pct ?? 0,
    }));

  const values = formatted.map(d => d.value_man);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = Math.max(Math.round((maxV - minV) * 0.1), 100);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.25}/>
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}
          tickLine={false} axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={v => `${v.toLocaleString()}만`}
          tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}
          tickLine={false} axisLine={false}
          width={72}
          domain={[minV - pad, maxV + pad]}
        />
        <Tooltip content={<CustomTooltip/>}/>
        <Area
          type="monotone"
          dataKey="value_man"
          stroke="#06B6D4"
          strokeWidth={2}
          fill="url(#grad)"
          dot={false}
          activeDot={{ r: 4, fill: '#06B6D4', strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="return_pct"
          stroke="transparent"
          fill="transparent"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
