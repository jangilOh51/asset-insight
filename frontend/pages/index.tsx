import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import {
  portfolios,
  totalAsset,
  totalProfit,
  totalReturnPct,
  monthlyDividend,
} from '@/lib/mockData';

const SectorTreemap = dynamic(
  () => import('@/components/dashboard/SectorTreemap'),
  { ssr: false, loading: () => <div className="h-72 bg-gray-800 rounded-xl animate-pulse" /> }
);

export default function Dashboard() {
  const isProfit = totalProfit >= 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* 안내 배너 */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-300">
          <span>📢</span>
          <span>OCR 포트폴리오 기능 업데이트 안내</span>
        </div>

        {/* 은퇴까지 */}
        <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-400">
            은퇴까지 <span className="text-white font-semibold">???</span>일
          </span>
          <span className="text-sm text-gray-300 font-medium">7 %</span>
        </div>

        {/* 총 자산 헤더 */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-gray-400">🔓</span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-white">
                  ₩{totalAsset.toLocaleString()}
                </span>
                <span className="text-gray-400 text-sm">›</span>
                <button className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded px-2 py-0.5">
                  <span>₩</span><span>▾</span>
                </button>
              </div>
              <p className={`text-sm mt-0.5 ${isProfit ? 'text-profit' : 'text-loss'}`}>
                총 수익 {isProfit ? '+' : ''}₩{totalProfit.toLocaleString()}
                <span className="ml-1">({isProfit ? '+' : ''}{totalReturnPct}%)</span>
              </p>
            </div>
          </div>
        </div>

        {/* 트리맵 */}
        <SectorTreemap />

        {/* 월 배당금 */}
        <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300 font-medium">04월 예상 배당금</span>
            <span className="text-xs text-cyan-400 bg-cyan-400/10 rounded px-2 py-0.5">세금 0% 적용 ›</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold">₩{monthlyDividend.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">›</span>
          </div>
        </div>

        {/* 포트폴리오 목록 */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-medium text-gray-400">포트폴리오 목록</span>
            <button className="text-xs text-gray-400 bg-gray-800 rounded px-3 py-1 hover:bg-gray-700 transition-colors">
              편집
            </button>
          </div>
          {portfolios.map(p => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
