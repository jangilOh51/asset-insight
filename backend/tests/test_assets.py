"""수동 자산 API 단위 테스트.

커버 엔드포인트:
  GET    /api/v1/assets
  POST   /api/v1/assets
  PATCH  /api/v1/assets/{id}
  PATCH  /api/v1/assets/{id}/toggle
  DELETE /api/v1/assets/{id}
"""

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.custom_asset import CustomAsset
from tests.conftest import make_db_result


def _make_asset(**kwargs) -> CustomAsset:
    defaults = dict(
        id=str(uuid.uuid4()),
        name="테스트 자산",
        asset_type="deposit",
        current_value_krw=Decimal("10000000"),
        purchase_value_krw=Decimal("9000000"),
        memo="",
        is_active=True,
    )
    defaults.update(kwargs)
    a = MagicMock(spec=CustomAsset)
    for k, v in defaults.items():
        setattr(a, k, v)
    return a


# ── GET /assets ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_assets_empty(client, mock_db):
    mock_db.execute.return_value = make_db_result(rows=[])
    resp = await client.get("/api/v1/assets")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_assets_returns_items(client, mock_db):
    asset = _make_asset()
    mock_db.execute.return_value = make_db_result(rows=[asset])
    resp = await client.get("/api/v1/assets")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "테스트 자산"
    assert data[0]["asset_type"] == "deposit"
    assert data[0]["asset_type_label"] == "예금/적금"
    assert data[0]["emoji"] == "🏦"
    assert data[0]["current_value_krw"] == 10000000.0
    assert data[0]["purchase_value_krw"] == 9000000.0
    assert data[0]["profit_loss_krw"] == 1000000.0
    assert abs(data[0]["return_pct"] - 11.11) < 0.01


# ── POST /assets ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_asset(client, mock_db):
    created = _make_asset(name="부동산", asset_type="real_estate",
                          current_value_krw=Decimal("500000000"),
                          purchase_value_krw=Decimal("400000000"))
    mock_db.refresh = AsyncMock(side_effect=lambda a: None)

    # db.refresh 후 조회되는 객체를 simulate
    async def _refresh(obj):
        for k, v in vars(created).items():
            if not k.startswith("_"):
                setattr(obj, k, v)

    mock_db.refresh.side_effect = _refresh

    resp = await client.post("/api/v1/assets", json={
        "name": "부동산",
        "asset_type": "real_estate",
        "current_value_krw": 500000000,
        "purchase_value_krw": 400000000,
        "memo": "",
    })
    assert resp.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_create_asset_invalid_name(client, mock_db):
    resp = await client.post("/api/v1/assets", json={
        "name": "",
        "asset_type": "other",
        "current_value_krw": 1000000,
        "purchase_value_krw": 0,
        "memo": "",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_asset_negative_value(client, mock_db):
    resp = await client.post("/api/v1/assets", json={
        "name": "테스트",
        "asset_type": "other",
        "current_value_krw": -1,
        "purchase_value_krw": 0,
        "memo": "",
    })
    assert resp.status_code == 422


# ── PATCH /assets/{id} ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_asset(client, mock_db):
    asset = _make_asset()
    mock_db.get.return_value = asset

    async def _refresh(obj):
        pass

    mock_db.refresh.side_effect = _refresh

    resp = await client.patch(f"/api/v1/assets/{asset.id}", json={"name": "수정된 이름"})
    assert resp.status_code == 200
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_update_asset_not_found(client, mock_db):
    mock_db.get.return_value = None
    resp = await client.patch("/api/v1/assets/nonexistent", json={"name": "x"})
    assert resp.status_code == 404


# ── PATCH /assets/{id}/toggle ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_toggle_asset(client, mock_db):
    asset = _make_asset(is_active=True)
    mock_db.get.return_value = asset
    mock_db.refresh.side_effect = AsyncMock()

    resp = await client.patch(f"/api/v1/assets/{asset.id}/toggle")
    assert resp.status_code == 200
    assert asset.is_active is False


@pytest.mark.asyncio
async def test_toggle_asset_not_found(client, mock_db):
    mock_db.get.return_value = None
    resp = await client.patch("/api/v1/assets/nonexistent/toggle")
    assert resp.status_code == 404


# ── DELETE /assets/{id} ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_asset(client, mock_db):
    asset = _make_asset()
    mock_db.get.return_value = asset
    resp = await client.delete(f"/api/v1/assets/{asset.id}")
    assert resp.status_code == 204
    mock_db.delete.assert_called_once_with(asset)
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_delete_asset_not_found(client, mock_db):
    mock_db.get.return_value = None
    resp = await client.delete("/api/v1/assets/nonexistent")
    assert resp.status_code == 404
