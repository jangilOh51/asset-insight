import type { TrendPoint } from "@/types";

interface Props {
  latest?: TrendPoint;
}

export default function AssetSummary({ latest }: Props) {
  if (!latest) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl" />;

  const isProfit = latest.total_profit_loss_krw >= 0;
  const valueKrw = Math.round(latest.total_value_krw / 10000).toLocaleString();
  const plKrw = Math.round(Math.abs(latest.total_profit_loss_krw) / 10000).toLocaleString();

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-1">
      <p className="text-sm text-gray-500">총 평가금액</p>
      <p className="text-3xl font-bold">{valueKrw}만원</p>
      <p className={`text-sm font-medium ${isProfit ? "text-profit" : "text-loss"}`}>
        {isProfit ? "+" : "-"}{plKrw}만원 ({latest.avg_return_pct?.toFixed(2)}%)
      </p>
    </div>
  );
}
