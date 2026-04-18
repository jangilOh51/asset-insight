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
    op.create_table(
        "portfolio",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_no", sa.String(20), unique=True, nullable=False),
        sa.Column("account_name", sa.String(100), nullable=False),
        sa.Column("broker", sa.String(50), nullable=False, server_default="KIS"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS asset_snapshot (
            time            TIMESTAMPTZ     NOT NULL,
            account_id      VARCHAR(20)     NOT NULL,
            symbol          VARCHAR(20)     NOT NULL,
            asset_type      VARCHAR(20)     NOT NULL,
            name            VARCHAR(100)    NOT NULL,
            quantity        NUMERIC(18,6)   NOT NULL,
            avg_price_krw   NUMERIC(18,2)   NOT NULL,
            current_price_krw NUMERIC(18,2) NOT NULL,
            value_krw       NUMERIC(18,2)   NOT NULL,
            profit_loss_krw NUMERIC(18,2)   NOT NULL,
            return_pct      NUMERIC(8,4)    NOT NULL,
            exchange_rate   NUMERIC(10,4),
            PRIMARY KEY (time, account_id, symbol)
        )
    """)

    # TimescaleDB hypertable 생성
    op.execute("SELECT create_hypertable('asset_snapshot', 'time', if_not_exists => TRUE)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_asset_snapshot_time_account ON asset_snapshot (time, account_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS asset_snapshot")
    op.drop_table("portfolio")
