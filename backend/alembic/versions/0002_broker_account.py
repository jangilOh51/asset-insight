"""broker_account 테이블 추가

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "broker_account",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("broker", sa.String(20), nullable=False, server_default="KIS"),
        sa.Column("account_no", sa.String(25), nullable=False, unique=True),
        sa.Column("account_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("broker_account")
