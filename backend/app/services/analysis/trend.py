"""일/주/월 자산 트렌드 분석."""

from datetime import date
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_asset_trend(
    db: AsyncSession,
    account_id: str,
    bucket: str = "1 day",   # '1 day' | '1 week' | '1 month'
    limit: int = 90,
) -> list[dict[str, Any]]:
    """TimescaleDB time_bucket으로 자산 트렌드 집계."""
    sql = text("""
        SELECT
            time_bucket(:bucket, time) AS period,
            SUM(value_krw) AS total_value_krw,
            SUM(profit_loss_krw) AS total_profit_loss_krw,
            AVG(return_pct) AS avg_return_pct
        FROM asset_snapshot
        WHERE account_id = :account_id
        GROUP BY period
        ORDER BY period DESC
        LIMIT :limit
    """)
    result = await db.execute(sql, {"bucket": bucket, "account_id": account_id, "limit": limit})
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def get_asset_composition(
    db: AsyncSession,
    account_id: str,
    as_of: date | None = None,
) -> list[dict[str, Any]]:
    """특정 시점의 자산 유형별 구성 비율."""
    sql = text("""
        WITH latest AS (
            SELECT MAX(time) AS max_time
            FROM asset_snapshot
            WHERE account_id = :account_id
              AND (:as_of IS NULL OR DATE(time) <= :as_of)
        )
        SELECT
            asset_type,
            SUM(value_krw) AS value_krw,
            ROUND(SUM(value_krw) * 100.0 / SUM(SUM(value_krw)) OVER (), 2) AS weight_pct
        FROM asset_snapshot, latest
        WHERE account_id = :account_id AND time = max_time
        GROUP BY asset_type
        ORDER BY value_krw DESC
    """)
    result = await db.execute(sql, {"account_id": account_id, "as_of": as_of})
    return [dict(r) for r in result.mappings().all()]
