import axios from "axios";
import type { AccountOut, AssetComposition, BenchmarkReturns, CustomAsset, InvestmentGoal, MarketIndices, PortfolioRealtimeResponse, SnapshotSummary, TrendPoint } from "@/types";

const api = axios.create({ baseURL: "/api/v1" });

export async function fetchTrend(
  accountId: string,
  period: "daily" | "weekly" | "monthly" = "daily",
  limit = 90
): Promise<TrendPoint[]> {
  const { data } = await api.get(`/trend/${accountId}`, { params: { period, limit } });
  return data;
}

export async function fetchComposition(accountId: string): Promise<AssetComposition[]> {
  const { data } = await api.get(`/trend/${accountId}/composition`);
  return data;
}

export async function fetchDomesticBalance() {
  const { data } = await api.get("/realtime/balance/domestic");
  return data;
}

export async function fetchOverseasBalance(exchange = "NASD") {
  const { data } = await api.get("/realtime/balance/overseas", { params: { exchange } });
  return data;
}

export async function fetchPortfolioRealtime(accountId?: string): Promise<PortfolioRealtimeResponse> {
  const { data } = await api.get("/portfolio/realtime", accountId ? { params: { account_id: accountId } } : undefined);
  return data;
}

export async function fetchAccounts(): Promise<AccountOut[]> {
  const { data } = await api.get("/accounts");
  return data;
}

export async function fetchSnapshotSummary(accountNo: string, limit = 180): Promise<SnapshotSummary[]> {
  const { data } = await api.get(`/snapshot/summary/${accountNo}`, { params: { limit } });
  return data;
}

export async function fetchBenchmarkReturns(fromDate: string, toDate?: string): Promise<BenchmarkReturns> {
  const { data } = await api.get("/trend/benchmark/returns", {
    params: { from: fromDate, ...(toDate ? { to: toDate } : {}) },
  });
  return data;
}

export async function fetchCustomAssets(): Promise<CustomAsset[]> {
  const { data } = await api.get("/assets");
  return data;
}

export async function createCustomAsset(body: {
  name: string; asset_type: string; current_value_krw: number;
  purchase_value_krw: number; memo: string;
}): Promise<CustomAsset> {
  const { data } = await api.post("/assets", body);
  return data;
}

export async function updateCustomAsset(id: string, body: Partial<{
  name: string; asset_type: string; current_value_krw: number;
  purchase_value_krw: number; memo: string;
}>): Promise<CustomAsset> {
  const { data } = await api.patch(`/assets/${id}`, body);
  return data;
}

export async function toggleCustomAsset(id: string): Promise<CustomAsset> {
  const { data } = await api.patch(`/assets/${id}/toggle`);
  return data;
}

export async function deleteCustomAsset(id: string): Promise<void> {
  await api.delete(`/assets/${id}`);
}

export async function fetchMarketIndices(): Promise<MarketIndices> {
  const { data } = await api.get("/market/indices");
  return data;
}

export async function fetchActiveGoal(): Promise<InvestmentGoal | null> {
  const { data } = await api.get("/goals/active");
  return data;
}

export async function upsertActiveGoal(body: { name: string; target_amount_krw: number }): Promise<InvestmentGoal> {
  const { data } = await api.put("/goals/active", body);
  return data;
}

export async function deleteActiveGoal(): Promise<void> {
  await api.delete("/goals/active");
}
