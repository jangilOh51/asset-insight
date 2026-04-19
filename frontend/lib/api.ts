import axios from "axios";
import type { AccountOut, AssetComposition, BenchmarkReturns, PortfolioRealtimeResponse, SnapshotSummary, TrendPoint } from "@/types";

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
