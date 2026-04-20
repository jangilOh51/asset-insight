import { useState } from 'react';
import useSWR from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import { fetchPortfolioRealtime, simulateTax } from '@/lib/api';
import { fmt } from '@/lib/format';
import type { HoldingItem, PortfolioRealtimeResponse, TaxAssetType, TaxSimulationResult } from '@/types';

function holdingToAssetType(h: HoldingItem): TaxAssetType {
  if (h.market === 'US') return 'stock_us';
  // 국내 ETF: exchange 필드로 판단 (KIS API에서 ETF는 exchange="ETF"로 내려올 수 있음)
  if (h.market === 'KR' && h.exchange === 'ETF') return 'etf_kr';
  return 'stock_kr';
}

function signColor(value: number): string {
  if (value > 0) return '#EF4444';
  if (value < 0) return '#60A5FA';
  return '#9CA3AF';
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-mono font-medium" style={{ color: highlight ? '#F9FAFB' : '#D1D5DB' }}>
        {value}
      </span>
    </div>
  );
}

function TaxRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-mono" style={{ color: value > 0 ? '#F59E0B' : '#6B7280' }}>
        {value > 0 ? `▲ ${fmt(value)}` : '없음'}
      </span>
    </div>
  );
}

export default function TaxPage() {
  const { data: portfolio } = useSWR<PortfolioRealtimeResponse>(
    '/api/v1/portfolio/realtime',
    () => fetchPortfolioRealtime(),
    { revalidateOnFocus: false },
  );

  const holdings = portfolio?.holdings ?? [];

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [result, setResult] = useState<TaxSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHolding = holdings.find(h => h.symbol === selectedSymbol);

  async function handleCalculate() {
    if (!selectedHolding || !quantity) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await simulateTax({
        symbol: selectedHolding.symbol,
        asset_type: holdingToAssetType(selectedHolding),
        quantity: qty,
        avg_cost_krw: selectedHolding.avg_cost,
        current_price_krw: selectedHolding.current_price,
      });
      setResult(res);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '계산에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    backgroundColor: '#1A2332',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#F9FAFB',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    fontFamily: 'JetBrains Mono, monospace',
  };

  return (
    <AppLayout title="세금 시뮬레이터">
      <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-5">

        {/* 보유 종목 없음 */}
        {portfolio && holdings.length === 0 && (
          <div
            className="rounded-xl p-8 flex flex-col items-center gap-3"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm text-white/40">보유 종목이 없습니다.</p>
          </div>
        )}

        {/* 입력 카드 */}
        {(holdings.length > 0 || !portfolio) && (
          <section
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/40 font-medium">종목 선택</label>
              {!portfolio ? (
                <div className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
              ) : (
                <select
                  value={selectedSymbol}
                  onChange={e => { setSelectedSymbol(e.target.value); setResult(null); }}
                  style={selectStyle}
                >
                  <option value="">— 종목을 선택하세요 —</option>
                  {holdings.map(h => (
                    <option key={h.symbol} value={h.symbol}>
                      {h.name} ({h.symbol}) · {h.quantity.toLocaleString()}주 보유
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedHolding && (
              <div className="text-xs text-white/30 font-mono">
                평균단가 {fmt(selectedHolding.avg_cost)} · 현재가 {fmt(selectedHolding.current_price)}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/40 font-medium">매도 수량</label>
              <input
                type="number"
                min={1}
                max={selectedHolding?.quantity ?? undefined}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
              {selectedHolding && (
                <span className="text-xs text-white/25">최대 {selectedHolding.quantity.toLocaleString()}주</span>
              )}
            </div>

            <button
              onClick={handleCalculate}
              disabled={loading || !selectedSymbol || !quantity}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium self-start transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#06B6D4', color: '#0B111B' }}
            >
              {loading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              )}
              세금 계산
            </button>
          </section>
        )}

        {/* 에러 */}
        {error && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <section
            className="rounded-xl p-5 flex flex-col gap-1"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#06B6D4' }}>
              예상 세금 결과 — {result.symbol}
            </h3>

            <Row label="매도 총액" value={fmt(result.sell_amount_krw)} />
            <Row label="매입 총액" value={fmt(result.purchase_amount_krw)} />
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-sm text-white/50">양도차익</span>
              <span className="text-sm font-mono font-semibold" style={{ color: signColor(result.profit_loss_krw) }}>
                {result.profit_loss_krw >= 0 ? '+' : ''}{fmt(result.profit_loss_krw)}
              </span>
            </div>

            <div className="mt-2 mb-1 text-xs text-white/30">세금 항목</div>
            <TaxRow label="증권거래세" value={result.securities_tax_krw} />
            <TaxRow label="양도소득세" value={result.income_tax_krw} />

            <div className="flex items-center justify-between py-2 mt-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-sm font-semibold text-white/70">총 세금</span>
              <span className="text-sm font-mono font-semibold" style={{ color: result.total_tax_krw > 0 ? '#F59E0B' : '#6B7280' }}>
                {result.total_tax_krw > 0 ? fmt(result.total_tax_krw) : '없음'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-bold" style={{ color: '#F9FAFB' }}>세후 순이익</span>
              <span className="text-base font-mono font-bold" style={{ color: signColor(result.net_profit_krw) }}>
                {result.net_profit_krw >= 0 ? '+' : ''}{fmt(result.net_profit_krw)}
              </span>
            </div>

            {result.effective_tax_rate_pct > 0 && (
              <div className="text-xs text-white/30 text-right font-mono">
                실효세율 {result.effective_tax_rate_pct.toFixed(2)}%
              </div>
            )}

            {result.notes.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {result.notes.map((note, i) => (
                  <p key={i} className="text-xs text-white/30">• {note}</p>
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </AppLayout>
  );
}
