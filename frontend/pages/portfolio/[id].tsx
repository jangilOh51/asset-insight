import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import HoldingsList from '@/components/portfolio/HoldingsList';
import {
  portfolios,
  totalAsset,
  totalProfit,
  totalReturnPct,
} from '@/lib/mockData';

const AssetDonutChart = dynamic(() => import('@/components/portfolio/AssetDonutChart'), {
  ssr: false,
  loading: () => <div className="h-44 bg-gray-800 animate-pulse rounded-xl" />,
});
const AssetBarHistory = dynamic(() => import('@/components/portfolio/AssetBarHistory'), {
  ssr: false,
  loading: () => <div className="h-24 bg-gray-800 animate-pulse rounded-xl" />,
});

export default function PortfolioDetail() {
  const router = useRouter();
  const { id } = router.query;
  const portfolio = portfolios.find(p => p.id === id);

  if (!portfolio && id) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          포트폴리오를 찾을 수 없습니다.
        </div>
      </AppLayout>
    );
  }

  const evalAmount = portfolio?.totalValueKrw ?? totalAsset;
  const purchaseAmount = Math.round(evalAmount / (1 + (portfolio?.returnPct ?? totalReturnPct) / 100));
  const profitKrw = evalAmount - purchaseAmount;
  const returnPct = portfolio?.returnPct ?? totalReturnPct;
  const isProfit = returnPct >= 0;

  return (
    <AppLayout>
      {/* 뒤로 가기 */}
      <div className="border-b border-gray-800 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit">
          <span>←</span>
          <span>포트폴리오 전체보기</span>
        </Link>
      </div>

      {/* 2컬럼 레이아웃 */}
      <div className="flex h-[calc(100vh-100px)] overflow-hidden">

        {/* ── 좌측 패널: 요약 + 차트 ── */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-900/50">
          <div className="p-5 space-y-5">

            {/* 총 자산 */}
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {portfolio?.broker} {portfolio?.name ?? '전체 포트폴리오'}
              </p>
              <p className="text-2xl font-bold text-white">
                ₩{evalAmount.toLocaleString()}
              </p>
              <div className="flex items-center gap-4 mt-1.5">
                <div>
                  <p className="text-xs text-gray-500">수익률</p>
                  <p className={`text-sm font-semibold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                    {isProfit ? '+' : ''}{returnPct.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">수익금</p>
                  <p className={`text-sm font-semibold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                    {isProfit ? '+' : ''}₩{Math.abs(profitKrw).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 총 수익률 요약 */}
            <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>매입금액</span>
                <span className="text-white">₩{purchaseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>평가금액</span>
                <span className="text-white">₩{evalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-1 border-t border-gray-700">
                <span>총 수익</span>
                <span className={isProfit ? 'text-profit' : 'text-loss'}>
                  {isProfit ? '+' : ''}₩{Math.abs(profitKrw).toLocaleString()}
                  <span className="ml-1">({isProfit ? '+' : ''}{returnPct.toFixed(2)}%)</span>
                </span>
              </div>
            </div>

            {/* 도넛 차트: 자산 구성 */}
            <div>
              <p className="text-xs text-gray-500 mb-3">자산 구성</p>
              <AssetDonutChart />
            </div>

            {/* 기간별 자산 바 차트 */}
            <AssetBarHistory />

            {/* 보유 기간 */}
            <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between">
                <span>첫 매수일</span>
                <span className="text-white">2021.11.15</span>
              </div>
              <div className="flex justify-between">
                <span>보유 기간</span>
                <span className="text-white">약 2년 5개월</span>
              </div>
              <div className="flex justify-between">
                <span>마지막 업데이트</span>
                <span className="text-white">2026.04.19 18:00</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── 우측 패널: 종목 목록 ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <HoldingsList />
        </div>

      </div>
    </AppLayout>
  );
}
