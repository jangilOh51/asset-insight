export type AssetType =
  | "stock_kr"
  | "stock_us"
  | "etf_kr"
  | "etf_us"
  | "fund"
  | "cash_krw"
  | "cash_usd"
  | "bond"
  | "other";

export interface AssetSnapshot {
  time: string;
  account_id: string;
  symbol: string;
  asset_type: AssetType;
  name: string;
  quantity: number;
  avg_price_krw: number;
  current_price_krw: number;
  value_krw: number;
  profit_loss_krw: number;
  return_pct: number;
  exchange_rate?: number;
}

export interface TrendPoint {
  period: string;
  total_value_krw: number;
  total_profit_loss_krw: number;
  avg_return_pct: number;
}

export interface AssetComposition {
  asset_type: AssetType;
  value_krw: number;
  weight_pct: number;
}

export interface HoldingItem {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  exchange: string;
  currency: 'KRW' | 'USD';
  quantity: number;
  avg_cost: number;
  current_price: number;
  avg_cost_native: number;
  current_price_native: number;
  purchase_amount_krw: number;
  eval_amount_krw: number;
  profit_loss_krw: number;
  return_pct: number;
  day_change_pct: number;
  weight_pct: number;
}

export interface PortfolioSummary {
  purchase_amount_krw: number;
  eval_amount_krw: number;
  profit_loss_krw: number;
  return_pct: number;
  cash_krw: number;
  total_asset_krw: number;
  custom_asset_krw: number;
}

export interface InvestmentGoal {
  id: number;
  name: string;
  target_amount_krw: number;
}

export interface IndexQuote {
  name: string;
  value: number | null;
  change: number | null;
  change_pct: number | null;
}

export interface MarketIndices {
  KOSPI: IndexQuote;
  SP500: IndexQuote;
  NASDAQ: IndexQuote;
  USD_KRW: IndexQuote;
}

export type CustomAssetType = 'real_estate' | 'deposit' | 'crypto' | 'private_equity' | 'pension' | 'other';

export interface CustomAsset {
  id: string;
  name: string;
  asset_type: CustomAssetType;
  asset_type_label: string;
  emoji: string;
  current_value_krw: number;
  purchase_value_krw: number;
  profit_loss_krw: number;
  return_pct: number;
  memo: string;
  is_active: boolean;
}

export interface PortfolioRealtimeResponse {
  summary: PortfolioSummary;
  holdings: HoldingItem[];
  usd_krw: number;
  fetched_at: string;
}

export interface AccountOut {
  id: string;
  broker: string;
  broker_type: string;
  account_no: string;
  account_name: string;
  is_mock: boolean;
  is_active: boolean;
  is_verified: boolean;
  display_order: number;
  has_credentials: boolean;
}

export interface SnapshotSummary {
  date: string;
  purchase_amount_krw: number;
  eval_amount_krw: number;
  profit_loss_krw: number;
  return_pct: number;
  cash_krw: number;
  total_asset_krw: number;
  position_count: number;
}

export interface BenchmarkPoint {
  date: string;
  return_pct: number;
}

export interface BenchmarkReturns {
  KOSPI: BenchmarkPoint[];
  SP500: BenchmarkPoint[];
  NASDAQ: BenchmarkPoint[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  content: string;
  cached: boolean;
}

export type TaxAssetType = 'stock_kr' | 'stock_us' | 'etf_kr';

export interface TaxSimulationRequest {
  symbol: string;
  asset_type: TaxAssetType;
  quantity: number;
  avg_cost_krw: number;
  current_price_krw: number;
}

export interface TaxSimulationResult {
  symbol: string;
  asset_type: string;
  quantity: number;
  sell_amount_krw: number;
  purchase_amount_krw: number;
  profit_loss_krw: number;
  securities_tax_krw: number;
  income_tax_krw: number;
  total_tax_krw: number;
  net_profit_krw: number;
  effective_tax_rate_pct: number;
  notes: string[];
}

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

export interface StrategyReport {
  risk_level: RiskLevel;
  horizon_years: number;
  content: string;
  cached: boolean;
}

export type TaxEventCategory = 'report' | 'payment' | 'deadline' | 'strategy' | 'check';

export interface TaxEvent {
  id: string;
  title: string;
  description: string;
  month: number;
  day: number | null;
  category: TaxEventCategory;
  is_annual: boolean;
}
