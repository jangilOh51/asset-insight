import { Fragment, useEffect, useState } from 'react';
import type { HoldingItem, StockReport } from '@/types';
import { fetchStockReport } from '@/lib/api';

type Tab = '전체' | '국내' | '해외' | '자산유형';
type SortKey = 'eval_amount_krw' | 'day_change_pct' | 'weight_pct' | 'profit_loss_krw' | 'return_pct' | 'purchase_amount_krw';
type SortDir = 'asc' | 'desc';
type AssetGroup = '국내 주식' | '국내 ETF' | '해외 주식' | '해외 ETF';

const MARKET_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  KR:   { label: 'KR',   bg: 'rgba(26,86,219,0.15)',  color: '#60A5FA' },
  NASD: { label: 'NASD', bg: 'rgba(239,68,68,0.12)',  color: '#F87171' },
  NYSE: { label: 'NYSE', bg: 'rgba(245,158,11,0.12)', color: '#FCD34D' },
  AMEX: { label: 'AMEX', bg: 'rgba(34,197,94,0.12)',  color: '#86EFAC' },
};

const GROUP_COLORS: Record<AssetGroup, string> = {
  '국내 주식': '#60A5FA',
  '국내 ETF':  '#34D399',
  '해외 주식': '#F59E0B',
  '해외 ETF':  '#A78BFA',
};

const ETF_PREFIXES_KR = ['TIGER', 'KODEX', 'ARIRANG', 'KBSTAR', 'ACE', 'HANARO', 'SOL', 'KOSEF'];

function isEtf(h: HoldingItem): boolean {
  const name = h.name.toUpperCase();
  if (h.market === 'KR') return ETF_PREFIXES_KR.some(p => name.startsWith(p)) || name.includes('ETF');
  return name.includes('ETF');
}

function getAssetGroup(h: HoldingItem): AssetGroup {
  const kr  = h.market === 'KR';
  const etf = isEtf(h);
  if (kr && etf)  return '국내 ETF';
  if (kr)         return '국내 주식';
  if (etf)        return '해외 ETF';
  return '해외 주식';
}

interface GroupData {
  label: AssetGroup;
  color: string;
  items: HoldingItem[];
  totalEval: number;
  totalPurchase: number;
  totalProfit: number;
  totalWeight: number;
  returnPct: number;
}

function buildGroups(holdings: HoldingItem[]): GroupData[] {
  const map = new Map<AssetGroup, HoldingItem[]>();
  for (const h of holdings) {
    const g = getAssetGroup(h);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(h);
  }
  const groups: GroupData[] = [];
  for (const [label, items] of map.entries()) {
    const totalEval     = items.reduce((s, h) => s + h.eval_amount_krw, 0);
    const totalPurchase = items.reduce((s, h) => s + h.purchase_amount_krw, 0);
    const totalProfit   = totalEval - totalPurchase;
    const totalWeight   = items.reduce((s, h) => s + h.weight_pct, 0);
    const returnPct     = totalPurchase > 0 ? (totalProfit / totalPurchase) * 100 : 0;
    groups.push({ label, color: GROUP_COLORS[label], items, totalEval, totalPurchase, totalProfit, totalWeight, returnPct });
  }
  return groups.sort((a, b) => b.totalEval - a.totalEval);
}

function fmtKrw(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(2)}억`;
  if (abs >= 1_0000)      return `${Math.round(n / 1_0000).toLocaleString()}만`;
  return `₩${n.toLocaleString()}`;
}

function fmtPrice(price: number, currency: 'KRW' | 'USD') {
  if (currency === 'USD') return `$${price.toFixed(2)}`;
  return `₩${price.toLocaleString()}`;
}

function SkeletonRow() {
  const cell = (w: number | string) => (
    <td style={{ padding: '12px 12px' }}>
      <div style={{ height: 13, background: '#1E2D3E', borderRadius: 4, width: w, animation: 'pulse 1.5s ease-in-out infinite' }}/>
    </td>
  );
  return (
    <tr style={{ borderBottom: '1px solid rgba(42,63,85,0.4)' }}>
      <td style={{ padding: '12px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ height: 13, background: '#1E2D3E', borderRadius: 4, width: 100, animation: 'pulse 1.5s ease-in-out infinite' }}/>
          <div style={{ height: 11, background: '#1E2D3E', borderRadius: 4, width: 60, animation: 'pulse 1.5s ease-in-out infinite' }}/>
        </div>
      </td>
      {cell(60)}{cell(40)}{cell(70)}{cell(80)}{cell(80)}{cell(72)}{cell(48)}{cell(56)}{cell(40)}
    </tr>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  align?: 'left' | 'right';
  onClick: (k: SortKey) => void;
}

function SortHeader({ label, sortKey, current, dir, align = 'right', onClick }: SortHeaderProps) {
  const active = sortKey === current;
  return (
    <th
      onClick={() => onClick(sortKey)}
      style={{
        padding: '10px 12px',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
        color: active ? '#22D3EE' : '#6B7280',
        textTransform: 'uppercase',
        textAlign: align,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        background: '#111827',
        position: 'sticky', top: 0, zIndex: 5,
        borderBottom: '1px solid #2A3F55',
        transition: 'color 150ms',
      }}
    >
      {label}
      {active && (
        <span style={{ marginLeft: 4, fontSize: 9 }}>
          {dir === 'desc' ? '▼' : '▲'}
        </span>
      )}
    </th>
  );
}

function HoldingRow({ h, onReport }: { h: HoldingItem; onReport: (symbol: string, name: string) => void }) {
  const badge = MARKET_BADGE[h.exchange] ?? MARKET_BADGE[h.market === 'KR' ? 'KR' : 'NASD'];
  const isProfit    = h.profit_loss_krw >= 0;
  const isDayUp     = h.day_change_pct >= 0;
  const profitColor = isProfit ? '#EF4444' : '#60A5FA';
  const dayColor    = isDayUp  ? '#EF4444' : '#60A5FA';

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(42,63,85,0.3)', cursor: 'pointer', transition: 'background 120ms' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,41,55,0.6)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* 종목명 */}
      <td style={{ padding: '12px 12px', minWidth: 140 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>{h.name}</span>
            <span style={{
              fontSize: 10, padding: '1px 5px', borderRadius: 3,
              background: badge.bg, color: badge.color,
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
            }}>
              {h.exchange}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>{h.symbol}</span>
        </div>
      </td>

      {/* 현재가 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#D1D5DB' }}>
          {fmtPrice(h.current_price_native, h.currency)}
        </span>
      </td>

      {/* 수량 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#D1D5DB' }}>
          {h.quantity.toLocaleString()}
        </span>
      </td>

      {/* 평균단가 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9CA3AF' }}>
          {fmtPrice(h.avg_cost_native, h.currency)}
        </span>
      </td>

      {/* 매입금액 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9CA3AF' }}>
          {fmtKrw(h.purchase_amount_krw)}
        </span>
      </td>

      {/* 평가금액 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#D1D5DB', fontWeight: 600 }}>
          {fmtKrw(h.eval_amount_krw)}
        </span>
      </td>

      {/* 평가손익 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: profitColor, fontWeight: 600 }}>
          {isProfit ? '+' : ''}{fmtKrw(h.profit_loss_krw)}
        </span>
      </td>

      {/* 수익률 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <span style={{
          display: 'inline-block',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          padding: '2px 6px', borderRadius: 4,
          background: isProfit ? 'rgba(239,68,68,0.1)' : 'rgba(96,165,250,0.1)',
          color: profitColor, fontWeight: 600,
        }}>
          {isProfit ? '+' : ''}{h.return_pct.toFixed(2)}%
        </span>
      </td>

      {/* 당일 등락 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: dayColor }}>
            {isDayUp ? '+' : ''}{h.day_change_pct.toFixed(2)}%
          </span>
          {h.day_change_source === 'snapshot' && (
            <span style={{
              fontSize: 9, padding: '1px 4px', borderRadius: 3,
              background: 'rgba(107,114,128,0.2)', color: '#6B7280',
            }}>
              전일
            </span>
          )}
        </div>
      </td>

      {/* 비중 */}
      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>
            {h.weight_pct.toFixed(1)}%
          </span>
          <div style={{ width: 40, height: 3, background: 'rgba(42,63,85,0.6)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(h.weight_pct, 100)}%`,
              height: '100%', background: '#06B6D4', borderRadius: 9999,
            }}/>
          </div>
        </div>
      </td>

      {/* AI 분석 */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onReport(h.symbol, h.name); }}
          title="AI 종목 분석"
          style={{
            background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
            fontSize: 11, color: '#22D3EE', whiteSpace: 'nowrap',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(6,182,212,0.16)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(6,182,212,0.08)')}
        >
          AI 분석
        </button>
      </td>
    </tr>
  );
}

function GroupHeaderRow({
  group,
  collapsed,
  onToggle,
}: {
  group: GroupData;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const isProfit    = group.totalProfit >= 0;
  const profitColor = isProfit ? '#EF4444' : '#60A5FA';

  return (
    <tr
      onClick={onToggle}
      style={{
        background: 'rgba(17,24,39,0.95)',
        borderTop: `1px solid ${group.color}22`,
        borderBottom: '1px solid #2A3F55',
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,41,55,0.95)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(17,24,39,0.95)')}
    >
      {/* 종목명 셀 — 그룹 레이블 */}
      <td style={{ padding: '9px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 18, background: group.color, borderRadius: 2, flexShrink: 0 }}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#E5E7EB', letterSpacing: '0.02em' }}>
            {group.label}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: `${group.color}20`, color: group.color,
            fontWeight: 600,
          }}>
            {group.items.length}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4B5563' }}>
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </td>

      {/* 현재가, 수량, 평균단가 — 비워둠 */}
      <td/><td/><td/>

      {/* 매입금액 */}
      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280' }}>
          {fmtKrw(group.totalPurchase)}
        </span>
      </td>

      {/* 평가금액 */}
      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#D1D5DB', fontWeight: 700 }}>
          {fmtKrw(group.totalEval)}
        </span>
      </td>

      {/* 평가손익 */}
      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: profitColor, fontWeight: 600 }}>
          {isProfit ? '+' : ''}{fmtKrw(group.totalProfit)}
        </span>
      </td>

      {/* 수익률 */}
      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
        <span style={{
          display: 'inline-block',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          padding: '2px 6px', borderRadius: 4,
          background: isProfit ? 'rgba(239,68,68,0.1)' : 'rgba(96,165,250,0.1)',
          color: profitColor, fontWeight: 600,
        }}>
          {isProfit ? '+' : ''}{group.returnPct.toFixed(2)}%
        </span>
      </td>

      {/* 당일등락 — 비워둠 */}
      <td/>

      {/* 비중 */}
      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: group.color, fontWeight: 600 }}>
          {group.totalWeight.toFixed(1)}%
        </span>
      </td>

      {/* AI — 비워둠 */}
      <td/>
    </tr>
  );
}

// ── AI 종목 리포트 모달 ────────────────────────────────────────────────────────

interface ReportModalProps {
  symbol: string;
  name: string;
  onClose: () => void;
}

function ReportModal({ symbol, name, onClose }: ReportModalProps) {
  const [report, setReport]   = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetchStockReport(symbol)
      .then(r => { setReport(r); setLoading(false); })
      .catch((e: { response?: { data?: { detail?: string } } }) => {
        setError(e?.response?.data?.detail ?? '리포트 생성에 실패했습니다.');
        setLoading(false);
      });
  }, [symbol]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#111827', border: '1px solid #2A3F55',
        borderRadius: 16, width: '100%', maxWidth: 640,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #2A3F55',
        }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F9FAFB' }}>AI 종목 분석</span>
            <span style={{ marginLeft: 8, fontSize: 13, color: '#6B7280' }}>{name} ({symbol})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {report?.cached && (
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(6,182,212,0.1)', color: '#22D3EE' }}>
                캐시
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'rgba(42,63,85,0.4)', border: 'none', cursor: 'pointer',
                color: '#9CA3AF', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 바디 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', paddingTop: 40 }}>
              <div style={{
                width: 36, height: 36, border: '3px solid #2A3F55',
                borderTopColor: '#06B6D4', borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}/>
              <p style={{ fontSize: 13, color: '#6B7280' }}>AI가 분석 중입니다…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '12px 16px', color: '#F87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}
          {report && (
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#D1D5DB' }}>
              {report.content.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={i} style={{
                      fontSize: 14, fontWeight: 700, color: '#F9FAFB',
                      margin: '20px 0 8px', paddingBottom: 6,
                      borderBottom: '1px solid rgba(42,63,85,0.6)',
                    }}>
                      {line.replace(/^## /, '')}
                    </h3>
                  );
                }
                if (line.startsWith('# ')) {
                  return (
                    <h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: '#22D3EE', margin: '0 0 16px' }}>
                      {line.replace(/^# /, '')}
                    </h2>
                  );
                }
                if (line === '') return <br key={i}/>;
                return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  holdings: HoldingItem[];
  isLoading?: boolean;
}

export default function HoldingsList({ holdings, isLoading }: Props) {
  const [tab,             setTab]             = useState<Tab>('전체');
  const [sortKey,         setSortKey]         = useState<SortKey>('eval_amount_krw');
  const [sortDir,         setSortDir]         = useState<SortDir>('desc');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [reportSymbol,    setReportSymbol]    = useState<{ symbol: string; name: string } | null>(null);

  const TABS: Tab[] = ['전체', '국내', '해외', '자산유형'];
  const krCount = holdings.filter(h => h.market === 'KR').length;
  const usCount = holdings.filter(h => h.market === 'US').length;

  const filtered = holdings.filter(h => {
    if (tab === '국내') return h.market === 'KR';
    if (tab === '해외') return h.market === 'US';
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === 'desc' ? -diff : diff;
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const groups = buildGroups(holdings);
  const headerProps = { current: sortKey, dir: sortDir, onClick: handleSort };

  const tabBadge = (t: Tab) => {
    if (t === '국내') return krCount;
    if (t === '해외') return usCount;
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── 탭 바 ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid #2A3F55',
        background: '#0B111B',
        paddingLeft: 4,
      }}>
        {TABS.map(t => {
          const active = tab === t;
          const count  = tabBadge(t);
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 16px', fontSize: 13, fontWeight: 500,
                color: active ? '#22D3EE' : '#6B7280',
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'color 150ms',
              }}
            >
              {t}
              {count !== null && (
                <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>{count}</span>
              )}
              {active && (
                <div style={{
                  position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
                  background: '#22D3EE', borderRadius: '2px 2px 0 0',
                }}/>
              )}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', paddingRight: 16, fontSize: 11, color: '#6B7280' }}>
          {tab === '자산유형'
            ? `${holdings.length}종목 · ${groups.length}그룹`
            : `${sorted.length}종목`}
        </span>
      </div>

      {/* ── 테이블 ── */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{
                padding: '10px 12px', textAlign: 'left', fontSize: 11,
                fontWeight: 600, color: '#6B7280', letterSpacing: '0.04em',
                textTransform: 'uppercase', background: '#111827',
                position: 'sticky', top: 0, zIndex: 5,
                borderBottom: '1px solid #2A3F55', whiteSpace: 'nowrap',
              }}>
                종목명
              </th>
              {(['현재가', '수량', '평균단가'] as const).map(label => (
                <th key={label} style={{
                  padding: '10px 12px', textAlign: 'right', fontSize: 11,
                  fontWeight: 600, color: '#6B7280', letterSpacing: '0.04em',
                  textTransform: 'uppercase', background: '#111827',
                  position: 'sticky', top: 0, zIndex: 5,
                  borderBottom: '1px solid #2A3F55', whiteSpace: 'nowrap',
                }}>{label}</th>
              ))}
              <SortHeader label="매입금액"  sortKey="purchase_amount_krw" {...headerProps}/>
              <SortHeader label="평가금액"  sortKey="eval_amount_krw"     {...headerProps}/>
              <SortHeader label="평가손익"  sortKey="profit_loss_krw"     {...headerProps}/>
              <SortHeader label="수익률"    sortKey="return_pct"          {...headerProps}/>
              <SortHeader label="당일등락"  sortKey="day_change_pct"      {...headerProps}/>
              <SortHeader label="비중"      sortKey="weight_pct"          {...headerProps}/>
              <th style={{
                padding: '10px 12px', textAlign: 'center', fontSize: 11,
                fontWeight: 600, color: '#6B7280', letterSpacing: '0.04em',
                textTransform: 'uppercase', background: '#111827',
                position: 'sticky', top: 0, zIndex: 5,
                borderBottom: '1px solid #2A3F55', whiteSpace: 'nowrap',
              }}>AI</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i}/>)
            ) : holdings.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(42,63,85,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
                    </svg>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>보유 종목이 없습니다</p>
                  </div>
                </td>
              </tr>
            ) : tab === '자산유형' ? (
              groups.map(group => (
                <Fragment key={group.label}>
                  <GroupHeaderRow
                    group={group}
                    collapsed={collapsedGroups.has(group.label)}
                    onToggle={() => toggleGroup(group.label)}
                  />
                  {!collapsedGroups.has(group.label) &&
                    [...group.items]
                      .sort((a, b) => b.eval_amount_krw - a.eval_amount_krw)
                      .map((h, i) => (
                        <HoldingRow
                          key={`${h.symbol}-${i}`}
                          h={h}
                          onReport={(symbol, name) => setReportSymbol({ symbol, name })}
                        />
                      ))
                  }
                </Fragment>
              ))
            ) : (
              sorted.map((h, i) => (
                <HoldingRow
                  key={`${h.symbol}-${i}`}
                  h={h}
                  onReport={(symbol, name) => setReportSymbol({ symbol, name })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* AI 종목 분석 모달 */}
      {reportSymbol && (
        <ReportModal
          symbol={reportSymbol.symbol}
          name={reportSymbol.name}
          onClose={() => setReportSymbol(null)}
        />
      )}
    </div>
  );
}
