import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetType(str, enum.Enum):
    stock_kr = "stock_kr"      # 국내 주식
    stock_us = "stock_us"      # 해외 주식 (미국)
    etf_kr = "etf_kr"          # 국내 ETF
    etf_us = "etf_us"          # 해외 ETF
    fund = "fund"              # 펀드
    cash_krw = "cash_krw"      # 원화 현금
    cash_usd = "cash_usd"      # 달러 현금
    bond = "bond"              # 채권
    other = "other"


class AssetSnapshot(Base):
    """일별 자산 스냅샷. TimescaleDB hypertable로 관리."""

    __tablename__ = "asset_snapshot"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), primary_key=True)

    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType))
    name: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[float] = mapped_column(Numeric(18, 6))
    avg_price_krw: Mapped[float] = mapped_column(Numeric(18, 2))   # 평균 매입가 (KRW)
    current_price_krw: Mapped[float] = mapped_column(Numeric(18, 2))  # 현재가 (KRW)
    value_krw: Mapped[float] = mapped_column(Numeric(18, 2))          # 평가금액 (KRW)
    profit_loss_krw: Mapped[float] = mapped_column(Numeric(18, 2))    # 평가손익 (KRW)
    return_pct: Mapped[float] = mapped_column(Numeric(8, 4))          # 수익률 (%)
    exchange_rate: Mapped[float | None] = mapped_column(Numeric(10, 4))  # 환율 (해외자산)

    __table_args__ = (
        Index("ix_asset_snapshot_time_account", "time", "account_id"),
    )
