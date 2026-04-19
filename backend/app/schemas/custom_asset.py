"""수동 자산 API 스키마."""

from typing import Literal
from pydantic import BaseModel, Field

AssetType = Literal["real_estate", "deposit", "crypto", "private_equity", "pension", "other"]

ASSET_TYPE_LABELS: dict[str, str] = {
    "real_estate":    "부동산",
    "deposit":        "예금/적금",
    "crypto":         "가상화폐",
    "private_equity": "비상장주식",
    "pension":        "연금/퇴직금",
    "other":          "기타",
}

ASSET_TYPE_EMOJI: dict[str, str] = {
    "real_estate":    "🏠",
    "deposit":        "🏦",
    "crypto":         "₿",
    "private_equity": "📈",
    "pension":        "🏛️",
    "other":          "💼",
}


class CustomAssetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    asset_type: AssetType = "other"
    current_value_krw: float = Field(..., ge=0)
    purchase_value_krw: float = Field(0, ge=0)
    memo: str = Field("", max_length=200)


class CustomAssetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    asset_type: AssetType | None = None
    current_value_krw: float | None = Field(None, ge=0)
    purchase_value_krw: float | None = Field(None, ge=0)
    memo: str | None = Field(None, max_length=200)


class CustomAssetOut(BaseModel):
    id: str
    name: str
    asset_type: str
    asset_type_label: str
    emoji: str
    current_value_krw: float
    purchase_value_krw: float
    profit_loss_krw: float
    return_pct: float
    memo: str
    is_active: bool

    model_config = {"from_attributes": True}
