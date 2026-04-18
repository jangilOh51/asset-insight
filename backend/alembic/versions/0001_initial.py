"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 계좌 정보 ──────────────────────────────────────────────
    op.create_table(
        "portfolio",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_no", sa.String(20), unique=True, nullable=False),
        sa.Column("account_name", sa.String(100), nullable=False),
        sa.Column("broker", sa.String(50), nullable=False, server_default="KIS"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── 일별 종목별 보유 현황 (TimescaleDB hypertable) ────────────
    op.execute("""
        CREATE TYPE asset_type AS ENUM (
            'stock_kr','stock_us','stock_hk','stock_cn','stock_jp',
            'etf_kr','etf_us','fund','cash_krw','cash_usd','bond','other'
        )
    """)

    op.execute("""
        CREATE TABLE position_snapshot (
            time                 TIMESTAMPTZ   NOT NULL,
            account_no           VARCHAR(20)   NOT NULL,
            symbol               VARCHAR(20)   NOT NULL,
            market               VARCHAR(5)    NOT NULL,
            asset_type           asset_type    NOT NULL,
            name                 VARCHAR(100)  NOT NULL,
            quantity             NUMERIC(18,6) NOT NULL,
            available_qty        NUMERIC(18,6) NOT NULL DEFAULT 0,
            currency             VARCHAR(3)    NOT NULL DEFAULT 'KRW',
            avg_cost             NUMERIC(18,6) NOT NULL DEFAULT 0,
            current_price        NUMERIC(18,6) NOT NULL DEFAULT 0,
            purchase_amount_krw  NUMERIC(18,2) NOT NULL DEFAULT 0,
            eval_amount_krw      NUMERIC(18,2) NOT NULL DEFAULT 0,
            profit_loss_krw      NUMERIC(18,2) NOT NULL DEFAULT 0,
            return_pct           NUMERIC(8,4)  NOT NULL DEFAULT 0,
            exchange_rate        NUMERIC(10,4),
            exchange_code        VARCHAR(10),
            PRIMARY KEY (time, account_no, symbol, market)
        )
    """)
    op.execute("SELECT create_hypertable('position_snapshot', 'time', if_not_exists => TRUE)")
    op.execute("""
        CREATE INDEX ix_position_snapshot_account_time
        ON position_snapshot (account_no, time DESC)
    """)

    # ── 일별 계좌 요약 (TimescaleDB hypertable) ──────────────────
    op.execute("""
        CREATE TABLE account_daily_summary (
            time                  TIMESTAMPTZ   NOT NULL,
            account_no            VARCHAR(20)   NOT NULL,
            purchase_amount_krw   NUMERIC(18,2) NOT NULL DEFAULT 0,
            eval_amount_krw       NUMERIC(18,2) NOT NULL DEFAULT 0,
            profit_loss_krw       NUMERIC(18,2) NOT NULL DEFAULT 0,
            return_pct            NUMERIC(8,4)  NOT NULL DEFAULT 0,
            cash_krw              NUMERIC(18,2) NOT NULL DEFAULT 0,
            cash_foreign_krw      NUMERIC(18,2) NOT NULL DEFAULT 0,
            total_asset_krw       NUMERIC(18,2) NOT NULL DEFAULT 0,
            position_count        INTEGER       NOT NULL DEFAULT 0,
            PRIMARY KEY (time, account_no)
        )
    """)
    op.execute("SELECT create_hypertable('account_daily_summary', 'time', if_not_exists => TRUE)")
    op.execute("""
        CREATE INDEX ix_account_daily_summary_account_time
        ON account_daily_summary (account_no, time DESC)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS account_daily_summary")
    op.execute("DROP TABLE IF EXISTS position_snapshot")
    op.execute("DROP TYPE IF EXISTS asset_type")
    op.drop_table("portfolio")
