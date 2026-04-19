"""broker_account에 자격증명 및 순서 컬럼 추가

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("broker_account", sa.Column("broker_type", sa.String(20), nullable=False, server_default="KIS"))
    op.add_column("broker_account", sa.Column("app_key", sa.String(200), nullable=False, server_default=""))
    op.add_column("broker_account", sa.Column("app_secret", sa.String(200), nullable=False, server_default=""))
    op.add_column("broker_account", sa.Column("is_mock", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("broker_account", sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("broker_account", "display_order")
    op.drop_column("broker_account", "is_mock")
    op.drop_column("broker_account", "app_secret")
    op.drop_column("broker_account", "app_key")
    op.drop_column("broker_account", "broker_type")
