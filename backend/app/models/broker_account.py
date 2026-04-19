from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BrokerAccount(Base):
    """등록된 증권 계좌. 증권사별 API 자격증명을 포함한다."""

    __tablename__ = "broker_account"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    broker: Mapped[str] = mapped_column(String(20), default="KIS")          # 표시용 이름
    broker_type: Mapped[str] = mapped_column(String(20), default="KIS")     # "KIS" | "KIWOOM"
    account_no: Mapped[str] = mapped_column(String(25), unique=True)        # XXXXXXXXXX-XX
    account_name: Mapped[str] = mapped_column(String(100), default="")

    # 계좌별 API 자격증명
    app_key: Mapped[str] = mapped_column(String(200), default="")
    app_secret: Mapped[str] = mapped_column(String(200), default="")
    is_mock: Mapped[bool] = mapped_column(Boolean, default=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
