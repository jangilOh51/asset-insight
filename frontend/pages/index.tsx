import useSWR from "swr";
import { fetchTrend, fetchComposition } from "@/lib/api";
import AssetSummary from "@/components/dashboard/AssetSummary";
import AssetTrendChart from "@/components/charts/AssetTrendChart";

const ACCOUNT_ID = process.env.NEXT_PUBLIC_ACCOUNT_ID || "default";

export default function Dashboard() {
  const { data: trend } = useSWR(["trend", ACCOUNT_ID, "daily"], () =>
    fetchTrend(ACCOUNT_ID, "daily", 90)
  );
  const { data: composition } = useSWR(["composition", ACCOUNT_ID], () =>
    fetchComposition(ACCOUNT_ID)
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">자산 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <AssetSummary latest={trend?.[0]} />
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">자산 트렌드 (90일)</h2>
        {trend && <AssetTrendChart data={trend} />}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">자산 구성</h2>
        {composition && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">자산 유형</th>
                <th className="pb-2 text-right">평가금액</th>
                <th className="pb-2 text-right">비중</th>
              </tr>
            </thead>
            <tbody>
              {composition.map((item) => (
                <tr key={item.asset_type} className="border-b last:border-0">
                  <td className="py-2">{item.asset_type}</td>
                  <td className="py-2 text-right">
                    {Math.round(item.value_krw / 10000).toLocaleString()}만원
                  </td>
                  <td className="py-2 text-right">{item.weight_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
