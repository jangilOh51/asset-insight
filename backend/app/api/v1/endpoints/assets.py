"""수동 자산 CRUD API."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.custom_asset import CustomAsset
from app.schemas.custom_asset import (
    ASSET_TYPE_EMOJI,
    ASSET_TYPE_LABELS,
    CustomAssetCreate,
    CustomAssetOut,
    CustomAssetUpdate,
)

router = APIRouter(prefix="/assets", tags=["assets"])


def _to_out(a: CustomAsset) -> CustomAssetOut:
    current = float(a.current_value_krw)
    purchase = float(a.purchase_value_krw)
    pnl = current - purchase
    pct = round(pnl / purchase * 100, 2) if purchase > 0 else 0.0
    return CustomAssetOut(
        id=a.id,
        name=a.name,
        asset_type=a.asset_type,
        asset_type_label=ASSET_TYPE_LABELS.get(a.asset_type, a.asset_type),
        emoji=ASSET_TYPE_EMOJI.get(a.asset_type, "💼"),
        current_value_krw=current,
        purchase_value_krw=purchase,
        profit_loss_krw=pnl,
        return_pct=pct,
        memo=a.memo,
        is_active=a.is_active,
    )


@router.get("", response_model=list[CustomAssetOut])
async def list_assets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CustomAsset).order_by(CustomAsset.created_at))
    return [_to_out(a) for a in result.scalars().all()]


@router.post("", response_model=CustomAssetOut, status_code=201)
async def create_asset(body: CustomAssetCreate, db: AsyncSession = Depends(get_db)):
    asset = CustomAsset(
        id=str(uuid.uuid4()),
        name=body.name,
        asset_type=body.asset_type,
        current_value_krw=body.current_value_krw,
        purchase_value_krw=body.purchase_value_krw,
        memo=body.memo,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return _to_out(asset)


@router.patch("/{asset_id}", response_model=CustomAssetOut)
async def update_asset(asset_id: str, body: CustomAssetUpdate, db: AsyncSession = Depends(get_db)):
    asset = await db.get(CustomAsset, asset_id)
    if not asset:
        raise HTTPException(404, "자산을 찾을 수 없습니다")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(asset, field, value)
    await db.commit()
    await db.refresh(asset)
    return _to_out(asset)


@router.patch("/{asset_id}/toggle", response_model=CustomAssetOut)
async def toggle_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    asset = await db.get(CustomAsset, asset_id)
    if not asset:
        raise HTTPException(404, "자산을 찾을 수 없습니다")
    asset.is_active = not asset.is_active
    await db.commit()
    await db.refresh(asset)
    return _to_out(asset)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    asset = await db.get(CustomAsset, asset_id)
    if not asset:
        raise HTTPException(404, "자산을 찾을 수 없습니다")
    await db.delete(asset)
    await db.commit()
