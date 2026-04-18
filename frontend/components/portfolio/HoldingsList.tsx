import { useState } from 'react';
import { holdingsKR, holdingsUS, Holding } from '@/lib/mockData';

type Tab = '국내' | '해외' | '배당' | 'Buylist';

function HoldingRow({ h }: { h: Holding }) {
  const isProfit = h.returnPct >= 0;
  const isTodayProfit = h.changeToday >= 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800/50 border-b border-gray-800/50 transition-colors">
      {/* Sector color bar */}
      <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: h.sectorColor }} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{h.name}</span>
          <span className="text-xs text-gray-500">#{h.code}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">
            {h.quantity.toLocaleString()}{h.currency === 'KRW' ? '좌' : '주'}
          </span>
          <span className={`text-xs ${isTodayProfit ? 'text-profit' : 'text-loss'}`}>
            {isTodayProfit ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Price & return */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-white">
          {h.currency === 'KRW'
            ? `₩${h.currentPrice.toLocaleString()}`
            : `$${h.currentPrice.toFixed(2)}`}
        </p>
        <p className={`text-xs mt-0.5 ${isProfit ? 'text-profit' : 'text-loss'}`}>
          {isProfit ? '+' : ''}{h.returnPct.toFixed(2)}%
        </p>
      </div>

      {/* Weight & PnL */}
      <div className="text-right flex-shrink-0 w-20">
        <p className="text-xs text-gray-400">비중 {h.weightPct.toFixed(1)}%</p>
        <p className={`text-xs mt-0.5 ${isProfit ? 'text-profit' : 'text-loss'}`}>
          {isProfit ? '+' : ''}₩{Math.abs(h.profitKrw).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function HoldingsList() {
  const [tab, setTab] = useState<Tab>('국내');

  const tabs: Tab[] = ['국내', '해외', '배당', 'Buylist'];
  const holdings: Record<Tab, Holding[]> = {
    국내: holdingsKR,
    해외: holdingsUS,
    배당: holdingsKR.filter(h => h.returnPct > 5),
    Buylist: [],
  };
  const list = holdings[tab];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              tab === t
                ? 'text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t" />
            )}
          </button>
        ))}

        {/* Sort */}
        <div className="ml-auto flex items-center">
          <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2">
            수익률순 ▾
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            종목이 없습니다
          </div>
        ) : (
          list.map((h, i) => <HoldingRow key={i} h={h} />)
        )}
      </div>
    </div>
  );
}
