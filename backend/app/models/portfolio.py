from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Portfolio(Base):
    """증권 계좌 정보."""

    __tablename__ = "portfolio"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    account_no: Mapped[str] = mapped_column(String(20), unique=True)
    account_name: Mapped[str] = mapped_column(String(100))
    broker: Mapped[str] = mapped_column(String(50), default="KIS")  # 증권사
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
