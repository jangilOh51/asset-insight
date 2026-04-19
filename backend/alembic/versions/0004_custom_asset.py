"""custom_asset 테이블 추가

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_asset",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("asset_type", sa.String(30), nullable=False, server_default="other"),
        sa.Column("current_value_krw", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("purchase_value_krw", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("memo", sa.Text, nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("custom_asset")
