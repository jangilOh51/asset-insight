import axios from "axios";
import type { AssetComposition, PortfolioRealtimeResponse, TrendPoint } from "@/types";

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

export async function fetchPortfolioRealtime(): Promise<PortfolioRealtimeResponse> {
  const { data } = await api.get("/portfolio/realtime");
  return data;
}
