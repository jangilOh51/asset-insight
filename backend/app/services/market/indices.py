"""주요 지수 현재가 + 등락률 조회 (Yahoo Finance)."""

import json
import time
from datetime import date, timedelta

import httpx

from app.core.redis import get_redis

SYMBOLS: dict[str, tuple[str, str]] = {
    "KOSPI":   ("^KS11",  "KOSPI"),
    "SP500":   ("^GSPC",  "S&P 500"),
    "NASDAQ":  ("^IXIC",  "NASDAQ"),
    "USD_KRW": ("KRW=X",  "USD/KRW"),
}

CACHE_KEY = "market:indices"
CACHE_TTL = 300  # 5분

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; asset-insight/1.0)",
    "Accept": "application/json",
}


async def _fetch_quote(symbol: str) -> dict:
    """Yahoo Finance v8 chart API로 최근 2일 일봉 조회 → 전일 대비 등락 계산."""
    today = date.today()
    from_ts = int(time.mktime((today - timedelta(days=7)).timetuple()))
    to_ts   = int(time.mktime((today + timedelta(days=1)).timetuple()))

    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?interval=1d&period1={from_ts}&period2={to_ts}&events=history"
    )
    async with httpx.AsyncClient(timeout=10, headers=_HEADERS) as client:
        r = await client.get(url)
        r.raise_for_status()

    body = r.json()
    result = body.get("chart", {}).get("result", [])
    if not result:
        return {}

    meta = result[0].get("meta", {})
    closes = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
    closes = [c for c in closes if c is not None]

    if len(closes) < 1:
        return {}

    current = closes[-1]
    prev = closes[-2] if len(closes) >= 2 else meta.get("previousClose", current)

    change = round(current - prev, 4)
    change_pct = round((current / prev - 1) * 100, 4) if prev else 0.0

    return {"value": round(current, 4), "change": change, "change_pct": change_pct}


async def get_market_indices() -> dict[str, dict]:
    """지수 4종 반환. Redis 캐시 우선."""
    redis = await get_redis()
    cached = await redis.get(CACHE_KEY)
    if cached:
        return json.loads(cached)

    results: dict[str, dict] = {}
    for key, (symbol, name) in SYMBOLS.items():
        try:
            data = await _fetch_quote(symbol)
            results[key] = {"name": name, **data}
        except Exception:
            results[key] = {"name": name, "value": None, "change": None, "change_pct": None}

    await redis.setex(CACHE_KEY, CACHE_TTL, json.dumps(results))
    return results
