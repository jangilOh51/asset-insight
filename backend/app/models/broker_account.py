from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BrokerAccount(Base):
    """등록된 증권 계좌. KIS API로 잔고 조회 시 순회 대상."""

    __tablename__ = "broker_account"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    broker: Mapped[str] = mapped_column(String(20), default="KIS")
    account_no: Mapped[str] = mapped_column(String(25), unique=True)   # XXXXXXXXXX-XX
    account_name: Mapped[str] = mapped_column(String(100), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
