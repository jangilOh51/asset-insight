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
