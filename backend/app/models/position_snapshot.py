import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetType(str, enum.Enum):
    stock_kr = "stock_kr"
    stock_us = "stock_us"
    stock_hk = "stock_hk"
    stock_cn = "stock_cn"
    stock_jp = "stock_jp"
    etf_kr = "etf_kr"
    etf_us = "etf_us"
    fund = "fund"
    cash_krw = "cash_krw"
    cash_usd = "cash_usd"
    bond = "bond"
    other = "other"


# 해외거래소코드 → (market, asset_type) 매핑
EXCHANGE_TO_MARKET: dict[str, tuple[str, AssetType]] = {
    "NASD": ("US", AssetType.stock_us),
    "NYSE": ("US", AssetType.stock_us),
    "AMEX": ("US", AssetType.stock_us),
    "SEHK": ("HK", AssetType.stock_hk),
    "SHAA": ("CN", AssetType.stock_cn),
    "SZAA": ("CN", AssetType.stock_cn),
    "TKSE": ("JP", AssetType.stock_jp),
}


class PositionSnapshot(Base):
    """일별 종목별 보유 현황 스냅샷. TimescaleDB hypertable."""

    __tablename__ = "position_snapshot"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    account_no: Mapped[str] = mapped_column(String(20), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), primary_key=True)
    market: Mapped[str] = mapped_column(String(5), primary_key=True)  # KR, US, HK, CN, JP

    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType, name="asset_type"))
    name: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[float] = mapped_column(Numeric(18, 6))
    available_qty: Mapped[float] = mapped_column(Numeric(18, 6))         # 매도가능수량
    currency: Mapped[str] = mapped_column(String(3), default="KRW")      # KRW, USD, HKD, ...
    avg_cost: Mapped[float] = mapped_column(Numeric(18, 6))              # 매입평균가 (원화 or 외화)
    current_price: Mapped[float] = mapped_column(Numeric(18, 6))         # 현재가 (원화 or 외화)
    purchase_amount_krw: Mapped[float] = mapped_column(Numeric(18, 2))   # 매입금액 (KRW 환산)
    eval_amount_krw: Mapped[float] = mapped_column(Numeric(18, 2))       # 평가금액 (KRW 환산)
    profit_loss_krw: Mapped[float] = mapped_column(Numeric(18, 2))       # 평가손익 (KRW 환산)
    return_pct: Mapped[float] = mapped_column(Numeric(8, 4))             # 수익률 (%)
    exchange_rate: Mapped[float | None] = mapped_column(Numeric(10, 4))  # 환율 (해외자산 KRW/외화)
    exchange_code: Mapped[str | None] = mapped_column(String(10))        # NASD, NYSE, ...

    __table_args__ = (
        Index("ix_position_snapshot_account_time", "account_no", "time"),
    )
