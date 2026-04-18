import Link from 'next/link';
import { Portfolio } from '@/lib/mockData';

interface Props {
  portfolio: Portfolio;
}

const brokerInitials: Record<string, string> = {
  '삼성증권': '삼',
  '키움증권': '키',
  '대신증권': '대',
  '미래에셋': '미',
  '한국투자': '한',
};

function fmt(n: number) {
  if (n === 0) return '₩0';
  if (n >= 100000000) return `₩${(n / 100000000).toFixed(2)}억`;
  if (n >= 10000) return `₩${Math.round(n / 10000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

export default function PortfolioCard({ portfolio }: Props) {
  const isProfit = portfolio.returnPct > 0;
  const isZero = portfolio.totalValueKrw === 0;

  return (
    <Link href={`/portfolio/${portfolio.id}`}>
      <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-gray-800">
        {/* Broker avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: portfolio.brokerColor }}
        >
          {brokerInitials[portfolio.broker] ?? portfolio.broker[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {portfolio.broker} {portfolio.name}
          </p>
          <p className={`text-sm mt-0.5 ${isZero ? 'text-gray-500' : isProfit ? 'text-profit' : 'text-loss'}`}>
            {fmt(portfolio.totalValueKrw)}
            {!isZero && (
              <span className="ml-2 text-xs">
                ({isProfit ? '+' : ''}{portfolio.returnPct.toFixed(2)}%)
              </span>
            )}
            {isZero && <span className="ml-1 text-xs">(0%)</span>}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={e => e.preventDefault()}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            portfolio.active ? 'bg-cyan-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              portfolio.active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </Link>
  );
}
