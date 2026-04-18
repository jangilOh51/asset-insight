from datetime import datetime

from sqlalchemy import DateTime, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AccountDailySummary(Base):
    """일별 계좌 요약. 국내/해외 전체 합산. TimescaleDB hypertable."""

    __tablename__ = "account_daily_summary"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    account_no: Mapped[str] = mapped_column(String(20), primary_key=True)

    # 매입/평가 합계
    purchase_amount_krw: Mapped[float] = mapped_column(Numeric(18, 2), default=0)   # 총 매입금액
    eval_amount_krw: Mapped[float] = mapped_column(Numeric(18, 2), default=0)       # 총 평가금액 (주식)
    profit_loss_krw: Mapped[float] = mapped_column(Numeric(18, 2), default=0)       # 총 평가손익
    return_pct: Mapped[float] = mapped_column(Numeric(8, 4), default=0)             # 수익률 (%)

    # 현금 / 총자산
    cash_krw: Mapped[float] = mapped_column(Numeric(18, 2), default=0)              # 원화 예수금
    cash_foreign_krw: Mapped[float] = mapped_column(Numeric(18, 2), default=0)      # 외화예수금 KRW 환산
    total_asset_krw: Mapped[float] = mapped_column(Numeric(18, 2), default=0)       # 총 자산 (현금+주식)

    # 보유 종목 수
    position_count: Mapped[int] = mapped_column(default=0)

    __table_args__ = (
        Index("ix_account_daily_summary_account_time", "account_no", "time"),
    )
