import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types";

interface Props {
  data: TrendPoint[];
}

export default function AssetTrendChart({ data }: Props) {
  const formatted = [...data].reverse().map((d) => ({
    ...d,
    period: d.period.slice(0, 10),
    total_value_krw: Math.round(d.total_value_krw / 10000),  // 만원 단위
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted}>
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v.toLocaleString()}만`} width={80} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString()}만원`, "총 자산"]} />
        <Line
          type="monotone"
          dataKey="total_value_krw"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
