"""투자 목표 API 단위 테스트.

커버 엔드포인트:
  GET    /api/v1/goals/active
  PUT    /api/v1/goals/active
  DELETE /api/v1/goals/active
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.investment_goal import InvestmentGoal
from tests.conftest import make_db_result


def _make_goal(**kwargs) -> InvestmentGoal:
    defaults = dict(id=1, name="1억 달성", target_amount_krw=Decimal("100000000"), is_active=True)
    defaults.update(kwargs)
    g = MagicMock(spec=InvestmentGoal)
    for k, v in defaults.items():
        setattr(g, k, v)
    return g


# ── GET /goals/active ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_active_goal_none(client, mock_db):
    """활성 목표 없음 → null 반환."""
    mock_db.execute.return_value = make_db_result(rows=[])
    resp = await client.get("/api/v1/goals/active")
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_get_active_goal_exists(client, mock_db):
    """활성 목표 있음 → GoalOut 반환."""
    goal = _make_goal()
    mock_db.execute.return_value = make_db_result(rows=[goal])
    resp = await client.get("/api/v1/goals/active")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == 1
    assert data["name"] == "1억 달성"
    assert data["target_amount_krw"] == 100000000.0


# ── PUT /goals/active ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upsert_goal_creates_new(client, mock_db):
    """기존 목표 없음 → 새 목표 생성."""
    mock_db.execute.return_value = make_db_result(rows=[])

    new_goal = _make_goal(id=2, name="2억 목표", target_amount_krw=Decimal("200000000"))

    async def _refresh(obj):
        obj.id = new_goal.id
        obj.name = new_goal.name
        obj.target_amount_krw = new_goal.target_amount_krw

    mock_db.refresh.side_effect = _refresh

    resp = await client.put("/api/v1/goals/active", json={
        "name": "2억 목표",
        "target_amount_krw": 200000000,
    })
    assert resp.status_code == 200
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_upsert_goal_replaces_existing(client, mock_db):
    """기존 목표 있음 → 기존 비활성화 후 새 목표 생성."""
    existing = _make_goal(is_active=True)
    mock_db.execute.return_value = make_db_result(rows=[existing])

    async def _refresh(obj):
        obj.id = 2
        obj.name = "새 목표"
        obj.target_amount_krw = Decimal("50000000")

    mock_db.refresh.side_effect = _refresh

    resp = await client.put("/api/v1/goals/active", json={
        "name": "새 목표",
        "target_amount_krw": 50000000,
    })
    assert resp.status_code == 200
    assert existing.is_active is False
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_upsert_goal_invalid_amount(client, mock_db):
    """목표 금액 0 이하 → 422."""
    resp = await client.put("/api/v1/goals/active", json={
        "name": "목표",
        "target_amount_krw": 0,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upsert_goal_empty_name(client, mock_db):
    """목표명 빈 문자열 → 422."""
    resp = await client.put("/api/v1/goals/active", json={
        "name": "",
        "target_amount_krw": 100000000,
    })
    assert resp.status_code == 422


# ── DELETE /goals/active ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_active_goal(client, mock_db):
    """활성 목표 삭제."""
    goal = _make_goal()
    mock_db.execute.return_value = make_db_result(rows=[goal])
    resp = await client.delete("/api/v1/goals/active")
    assert resp.status_code == 204
    mock_db.delete.assert_called_once_with(goal)
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_delete_active_goal_not_found(client, mock_db):
    """활성 목표 없음 → 404."""
    mock_db.execute.return_value = make_db_result(rows=[])
    resp = await client.delete("/api/v1/goals/active")
    assert resp.status_code == 404
