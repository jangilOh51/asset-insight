import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";
import { fmt } from "@/lib/format";
import type { BenchmarkReturns, TrendPoint } from "@/types";

interface Props {
  points: TrendPoint[];
  benchmark?: BenchmarkReturns | null;
  showBenchmark?: boolean;
}

const COLORS = {
  portfolio: "#06B6D4",
  KOSPI:     "#F59E0B",
  SP500:     "#10B981",
  NASDAQ:    "#8B5CF6",
};

const LABELS = {
  portfolio: "내 포트폴리오",
  KOSPI:     "KOSPI",
  SP500:     "S&P500",
  NASDAQ:    "NASDAQ",
};

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1A2332", border: "1px solid #2A3F55",
      borderRadius: 8, padding: "10px 14px", fontSize: 11,
      fontFamily: "JetBrains Mono, monospace",
    }}>
      <p style={{ color: "#6B7280", marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, lineHeight: 1.8 }}>
          {LABELS[p.dataKey as keyof typeof LABELS] ?? p.dataKey}:{" "}
          {p.value > 0 ? "+" : ""}{p.value.toFixed(2)}%
        </p>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: { payload?: { dataKey: string; color: string }[] }) {
  if (!payload) return null;
  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
      {payload.map(p => (
        <span key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
          <span style={{ width: 16, height: 2, background: p.color, display: "inline-block", borderRadius: 1 }}/>
          {LABELS[p.dataKey as keyof typeof LABELS] ?? p.dataKey}
        </span>
      ))}
    </div>
  );
}

function normalizePortfolio(points: TrendPoint[]): { date: string; portfolio: number }[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const base = sorted[0].total_value_krw;
  if (base === 0) return [];
  return sorted.map(p => ({
    date: p.period.slice(0, 10),
    portfolio: parseFloat(((p.total_value_krw / base - 1) * 100).toFixed(4)),
  }));
}

export default function AssetTrendChart({ points, benchmark, showBenchmark = true }: Props) {
  const portfolioData = normalizePortfolio(points);

  // 포트폴리오 날짜 집합
  const dateSet = new Set(portfolioData.map(d => d.date));

  // 벤치마크 데이터를 날짜별 map으로 변환
  const bMap: Record<string, Record<string, number>> = {};
  if (showBenchmark && benchmark) {
    for (const [key, series] of Object.entries(benchmark) as [keyof BenchmarkReturns, { date: string; return_pct: number }[]][]) {
      for (const pt of series) {
        if (!bMap[pt.date]) bMap[pt.date] = {};
        bMap[pt.date][key] = pt.return_pct;
      }
    }
  }

  // 포트폴리오 날짜 기준으로 merge
  const merged = portfolioData.map(d => ({
    date: d.date,
    portfolio: d.portfolio,
    ...(showBenchmark && benchmark ? {
      KOSPI:  bMap[d.date]?.["KOSPI"]  ?? null,
      SP500:  bMap[d.date]?.["SP500"]  ?? null,
      NASDAQ: bMap[d.date]?.["NASDAQ"] ?? null,
    } : {}),
  }));

  // 벤치마크만 있는 날짜 중 포트폴리오 날짜 범위 내 것도 추가
  if (showBenchmark && benchmark && portfolioData.length > 0) {
    const startDate = portfolioData[0].date;
    const endDate = portfolioData[portfolioData.length - 1].date;
    for (const d of Object.keys(bMap).sort()) {
      if (!dateSet.has(d) && d >= startDate && d <= endDate) {
        merged.push({
          date: d,
          portfolio: null as unknown as number,
          KOSPI:  bMap[d]?.["KOSPI"]  ?? null,
          SP500:  bMap[d]?.["SP500"]  ?? null,
          NASDAQ: bMap[d]?.["NASDAQ"] ?? null,
        });
      }
    }
    merged.sort((a, b) => a.date.localeCompare(b.date));
  }

  const hasBenchmark = showBenchmark && benchmark &&
    (benchmark.KOSPI.length > 0 || benchmark.SP500.length > 0 || benchmark.NASDAQ.length > 0);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={merged} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#6B7280", fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false} axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={v => `${v > 0 ? "+" : ""}${(v as number).toFixed(1)}%`}
          tick={{ fontSize: 10, fill: "#6B7280", fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false} axisLine={false}
          width={56}
        />
        <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3"/>
        <Tooltip content={<CustomTooltip/>}/>
        {hasBenchmark && <Legend content={<CustomLegend/>}/>}
        <Line
          type="monotone" dataKey="portfolio"
          stroke={COLORS.portfolio} strokeWidth={2}
          dot={false} connectNulls
          activeDot={{ r: 4, fill: COLORS.portfolio, strokeWidth: 0 }}
        />
        {hasBenchmark && (
          <>
            <Line type="monotone" dataKey="KOSPI"
              stroke={COLORS.KOSPI} strokeWidth={1.5} strokeDasharray="4 2"
              dot={false} connectNulls activeDot={{ r: 3, fill: COLORS.KOSPI, strokeWidth: 0 }}
            />
            <Line type="monotone" dataKey="SP500"
              stroke={COLORS.SP500} strokeWidth={1.5} strokeDasharray="4 2"
              dot={false} connectNulls activeDot={{ r: 3, fill: COLORS.SP500, strokeWidth: 0 }}
            />
            <Line type="monotone" dataKey="NASDAQ"
              stroke={COLORS.NASDAQ} strokeWidth={1.5} strokeDasharray="4 2"
              dot={false} connectNulls activeDot={{ r: 3, fill: COLORS.NASDAQ, strokeWidth: 0 }}
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
