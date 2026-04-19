from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CustomAsset(Base):
    """사용자가 수동으로 등록한 자산 (부동산, 예금, 가상화폐 등)."""

    __tablename__ = "custom_asset"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    asset_type: Mapped[str] = mapped_column(String(30))   # real_estate | deposit | crypto | private_equity | pension | other
    current_value_krw: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    purchase_value_krw: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    memo: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
