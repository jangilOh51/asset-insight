"""계좌 관리 API 단위 테스트.

커버 엔드포인트:
  GET  /api/v1/accounts/brokers
  GET  /api/v1/accounts
  POST /api/v1/accounts
  PATCH /api/v1/accounts/{id}
  POST /api/v1/accounts/{id}/verify
  PATCH /api/v1/accounts/{id}/toggle
  POST /api/v1/accounts/{id}/reorder
  DELETE /api/v1/accounts/{id}
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.broker_account import BrokerAccount
from tests.conftest import make_db_result


def _make_account(**kwargs) -> BrokerAccount:
    defaults = dict(
        id=str(uuid.uuid4()),
        broker="한국투자증권",
        broker_type="KIS",
        account_no="5012345678-01",
        account_name="테스트 계좌",
        app_key="test_key",
        app_secret="test_secret",
        is_mock=True,
        is_active=True,
        is_verified=False,
        display_order=0,
    )
    defaults.update(kwargs)
    acc = BrokerAccount(**defaults)
    return acc


# ── GET /brokers ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_brokers(client):
    resp = await client.get("/api/v1/accounts/brokers")
    assert resp.status_code == 200
    data = resp.json()
    codes = {b["code"] for b in data}
    assert "KIS" in codes
    assert "KIWOOM" in codes


# ── GET /accounts ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_accounts_empty(client):
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.kis_account_no = ""
        mock_settings.kis_app_key = ""
        mock_settings.kiwoom_account_no = ""
        mock_settings.kiwoom_app_key = ""
        resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_accounts_returns_items(client, mock_db):
    acc = _make_account()
    mock_db.execute.return_value = make_db_result(rows=[acc])

    with patch("app.core.config.settings") as mock_settings:
        mock_settings.kis_account_no = ""
        mock_settings.kis_app_key = ""
        mock_settings.kiwoom_account_no = ""
        mock_settings.kiwoom_app_key = ""
        resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["account_no"] == acc.account_no
    assert data[0]["broker_type"] == "KIS"
    assert "app_key" not in data[0]  # 자격증명 노출 금지
    assert data[0]["has_credentials"] is True


# ── POST /accounts ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_add_account_success(client, mock_db):
    # dup check → None, max order → []
    mock_db.execute.side_effect = [
        make_db_result(scalar=None),   # dup check
        make_db_result(rows=[]),       # max display_order
    ]

    with patch("app.api.v1.endpoints.accounts._verify_account", return_value=False):
        resp = await client.post("/api/v1/accounts", json={
            "account_no": "5012345678-01",
            "account_name": "내 계좌",
            "broker_type": "KIS",
            "app_key": "",
            "app_secret": "",
            "is_mock": True,
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["account_no"] == "5012345678-01"
    assert data["broker_type"] == "KIS"
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_add_account_duplicate(client, mock_db):
    existing = _make_account()
    mock_db.execute.return_value = make_db_result(scalar=existing)

    resp = await client.post("/api/v1/accounts", json={
        "account_no": "5012345678-01",
        "broker_type": "KIS",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_add_account_unsupported_broker(client):
    resp = await client.post("/api/v1/accounts", json={
        "account_no": "5012345678-01",
        "broker_type": "UNKNOWN",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_add_account_with_credentials_triggers_verify(client, mock_db):
    mock_db.execute.side_effect = [
        make_db_result(scalar=None),
        make_db_result(rows=[]),
    ]

    with patch("app.api.v1.endpoints.accounts._verify_account", new_callable=AsyncMock, return_value=True) as mock_verify:
        resp = await client.post("/api/v1/accounts", json={
            "account_no": "5012345678-01",
            "broker_type": "KIS",
            "app_key": "mykey",
            "app_secret": "mysecret",
            "is_mock": True,
        })

    assert resp.status_code == 201
    mock_verify.assert_awaited_once()
    assert resp.json()["is_verified"] is True


# ── PATCH /accounts/{id} ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_account_name(client, mock_db):
    acc = _make_account()
    mock_db.get.return_value = acc

    resp = await client.patch(f"/api/v1/accounts/{acc.id}", json={"account_name": "새 이름"})
    assert resp.status_code == 200
    assert acc.account_name == "새 이름"
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_account_key_resets_verified(client, mock_db):
    acc = _make_account(is_verified=True)
    mock_db.get.return_value = acc

    resp = await client.patch(f"/api/v1/accounts/{acc.id}", json={"app_key": "newkey"})
    assert resp.status_code == 200
    assert acc.is_verified is False


@pytest.mark.asyncio
async def test_update_account_not_found(client, mock_db):
    mock_db.get.return_value = None
    resp = await client.patch("/api/v1/accounts/nonexistent", json={"account_name": "x"})
    assert resp.status_code == 404


# ── PATCH /accounts/{id} — app_secret 변경도 is_verified 리셋 ─────────────────

@pytest.mark.asyncio
async def test_update_account_secret_resets_verified(client, mock_db):
    acc = _make_account(is_verified=True)
    mock_db.get.return_value = acc

    resp = await client.patch(f"/api/v1/accounts/{acc.id}", json={"app_secret": "newsecret"})
    assert resp.status_code == 200
    assert acc.is_verified is False


# ── POST /accounts/{id}/verify ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_account_success(client, mock_db):
    acc = _make_account(is_verified=False)
    mock_db.get.return_value = acc

    with patch("app.api.v1.endpoints.accounts._verify_account", new_callable=AsyncMock, return_value=True):
        resp = await client.post(f"/api/v1/accounts/{acc.id}/verify")

    assert resp.status_code == 200
    assert acc.is_verified is True


@pytest.mark.asyncio
async def test_verify_account_no_key(client, mock_db):
    acc = _make_account(app_key="", app_secret="")
    mock_db.get.return_value = acc

    resp = await client.post(f"/api/v1/accounts/{acc.id}/verify")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_verify_account_not_found(client, mock_db):
    mock_db.get.return_value = None
    resp = await client.post("/api/v1/accounts/nonexistent/verify")
    assert resp.status_code == 404


# ── PATCH /accounts/{id}/toggle ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_toggle_account_deactivate(client, mock_db):
    acc = _make_account(is_active=True)
    mock_db.get.return_value = acc

    resp = await client.patch(f"/api/v1/accounts/{acc.id}/toggle")
    assert resp.status_code == 200
    assert acc.is_active is False


@pytest.mark.asyncio
async def test_toggle_account_activate(client, mock_db):
    acc = _make_account(is_active=False)
    mock_db.get.return_value = acc

    resp = await client.patch(f"/api/v1/accounts/{acc.id}/toggle")
    assert resp.status_code == 200
    assert acc.is_active is True


@pytest.mark.asyncio
async def test_toggle_account_not_found(client, mock_db):
    mock_db.get.return_value = None
    resp = await client.patch("/api/v1/accounts/nonexistent/toggle")
    assert resp.status_code == 404


# ── POST /accounts/{id}/reorder ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_reorder_account_up(client, mock_db):
    acc1 = _make_account(id="id-1", account_no="001-01", display_order=0)
    acc2 = _make_account(id="id-2", account_no="002-01", display_order=1)

    mock_db.execute.side_effect = [
        make_db_result(rows=[acc1, acc2]),   # first list fetch
        make_db_result(rows=[acc1, acc2]),   # second list fetch after swap
    ]

    resp = await client.post("/api/v1/accounts/id-2/reorder?direction=up")
    assert resp.status_code == 200
    # 순서가 바뀌었는지 확인
    assert acc2.display_order == 0
    assert acc1.display_order == 1


@pytest.mark.asyncio
async def test_reorder_account_not_found(client, mock_db):
    acc = _make_account(id="id-1", account_no="001-01")
    mock_db.execute.side_effect = [
        make_db_result(rows=[acc]),
        make_db_result(rows=[acc]),
    ]
    resp = await client.post("/api/v1/accounts/nonexistent/reorder?direction=up")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_reorder_account_down(client, mock_db):
    acc1 = _make_account(id="id-1", account_no="001-01", display_order=0)
    acc2 = _make_account(id="id-2", account_no="002-01", display_order=1)

    mock_db.execute.side_effect = [
        make_db_result(rows=[acc1, acc2]),
        make_db_result(rows=[acc1, acc2]),
    ]

    resp = await client.post("/api/v1/accounts/id-1/reorder?direction=down")
    assert resp.status_code == 200
    assert acc1.display_order == 1
    assert acc2.display_order == 0


@pytest.mark.asyncio
async def test_reorder_account_already_at_top_no_op(client, mock_db):
    """이미 첫 번째 계좌를 up으로 이동 → 순서 변경 없음."""
    acc = _make_account(id="id-1", account_no="001-01", display_order=0)

    mock_db.execute.side_effect = [
        make_db_result(rows=[acc]),
        make_db_result(rows=[acc]),
    ]

    resp = await client.post("/api/v1/accounts/id-1/reorder?direction=up")
    assert resp.status_code == 200
    assert acc.display_order == 0  # 변경 없음


@pytest.mark.asyncio
async def test_reorder_account_already_at_bottom_no_op(client, mock_db):
    """이미 마지막 계좌를 down으로 이동 → 순서 변경 없음."""
    acc = _make_account(id="id-1", account_no="001-01", display_order=0)

    mock_db.execute.side_effect = [
        make_db_result(rows=[acc]),
        make_db_result(rows=[acc]),
    ]

    resp = await client.post("/api/v1/accounts/id-1/reorder?direction=down")
    assert resp.status_code == 200
    assert acc.display_order == 0  # 변경 없음


# ── DELETE /accounts/{id} ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_account(client, mock_db):
    resp = await client.delete("/api/v1/accounts/some-id")
    assert resp.status_code == 204
    mock_db.commit.assert_awaited_once()
