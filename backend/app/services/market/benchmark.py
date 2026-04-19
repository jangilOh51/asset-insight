"""벤치마크 지수 데이터 수집 (Yahoo Finance)."""

import json
import time
from datetime import date, timedelta

import httpx

from app.core.redis import get_redis

SYMBOLS = {
    "KOSPI": "^KS11",
    "SP500": "^GSPC",
    "NASDAQ": "^IXIC",
}
CACHE_TTL = 3600  # 1시간

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; asset-insight/1.0)",
    "Accept": "application/json",
}


async def _fetch_yahoo(symbol: str, from_date: date, to_date: date) -> list[dict]:
    """Yahoo Finance v8 chart API로 일별 종가 조회."""
    period1 = int(time.mktime(from_date.timetuple()))
    period2 = int(time.mktime(to_date.timetuple()))
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?interval=1d&period1={period1}&period2={period2}&events=history"
    )
    async with httpx.AsyncClient(timeout=10, headers=_HEADERS) as client:
        r = await client.get(url)
        r.raise_for_status()

    body = r.json()
    result = body.get("chart", {}).get("result", [])
    if not result:
        return []

    timestamps = result[0].get("timestamp", [])
    closes = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])

    points = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        d = date.fromtimestamp(ts).isoformat()
        points.append({"date": d, "close": close})
    return points


async def _normalize(points: list[dict]) -> list[dict]:
    """시작일 대비 수익률(%)로 정규화."""
    if not points:
        return []
    base = points[0]["close"]
    if base == 0:
        return []
    return [{"date": p["date"], "return_pct": round((p["close"] / base - 1) * 100, 4)} for p in points]


async def get_benchmark_returns(
    from_date: date,
    to_date: date | None = None,
) -> dict[str, list[dict]]:
    """지수별 정규화 수익률 반환. Redis 캐시 사용."""
    if to_date is None:
        to_date = date.today()

    cache_key = f"benchmark:{from_date}:{to_date}"
    redis = await get_redis()

    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    result: dict[str, list[dict]] = {}
    fetch_to = to_date + timedelta(days=1)  # Yahoo는 exclusive end

    for name, symbol in SYMBOLS.items():
        try:
            raw = await _fetch_yahoo(symbol, from_date, fetch_to)
            result[name] = await _normalize(raw)
        except Exception:
            result[name] = []

    await redis.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result
