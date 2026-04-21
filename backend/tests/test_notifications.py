"""알림 API 단위 테스트.

커버 엔드포인트:
  GET    /api/v1/notifications
  GET    /api/v1/notifications/unread-count
  POST   /api/v1/notifications/read-all
  DELETE /api/v1/notifications
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.notification import Notification
from tests.conftest import make_db_result


def _make_notif(
    id: int = 1,
    type_: str = "goal_achieved",
    title: str = "목표 달성!",
    message: str = "축하합니다",
    is_read: bool = False,
) -> Notification:
    n = MagicMock(spec=Notification)
    n.id = id
    n.type = type_
    n.title = title
    n.message = message
    n.is_read = is_read
    n.created_at = datetime(2026, 4, 21, 9, 0, tzinfo=timezone.utc)
    return n


# ── GET /notifications ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_notifications_empty(client, mock_db):
    """알림 없음 → 빈 목록 + unread_count=0."""
    mock_db.execute.return_value = make_db_result(rows=[])
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["unread_count"] == 0


@pytest.mark.asyncio
async def test_list_notifications_with_unread(client, mock_db):
    """미읽음 알림 포함 → unread_count 정확히 반환."""
    notifications = [
        _make_notif(id=1, is_read=False),
        _make_notif(id=2, is_read=True, type_="high_return", title="이상 수익"),
        _make_notif(id=3, is_read=False, type_="goal_milestone", title="50% 달성"),
    ]
    mock_db.execute.return_value = make_db_result(rows=notifications)
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 3
    assert data["unread_count"] == 2


@pytest.mark.asyncio
async def test_list_notifications_fields(client, mock_db):
    """알림 항목에 필수 필드가 모두 포함된다."""
    n = _make_notif()
    mock_db.execute.return_value = make_db_result(rows=[n])
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 200
    item = resp.json()["items"][0]
    for field in ("id", "type", "title", "message", "is_read", "created_at"):
        assert field in item


# ── GET /notifications/unread-count ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_unread_count_zero(client, mock_db):
    """미읽음 없음 → 0 반환."""
    mock_db.execute.return_value = make_db_result(rows=[])
    resp = await client.get("/api/v1/notifications/unread-count")
    assert resp.status_code == 200
    assert resp.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_unread_count_non_zero(client, mock_db):
    """미읽음 2개 → 2 반환."""
    mock_db.execute.return_value = make_db_result(rows=[
        _make_notif(id=1, is_read=False),
        _make_notif(id=2, is_read=False),
    ])
    resp = await client.get("/api/v1/notifications/unread-count")
    assert resp.status_code == 200
    assert resp.json()["unread_count"] == 2


# ── POST /notifications/read-all ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mark_all_read(client, mock_db):
    """read-all 호출 → 204 + commit."""
    resp = await client.post("/api/v1/notifications/read-all")
    assert resp.status_code == 204
    mock_db.commit.assert_called_once()


# ── DELETE /notifications ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_all_notifications(client, mock_db):
    """전체 삭제 → 204 + commit."""
    resp = await client.delete("/api/v1/notifications")
    assert resp.status_code == 204
    mock_db.commit.assert_called_once()


# ── check_and_create_notifications (서비스 유닛) ──────────────────────────────

@pytest.mark.asyncio
async def test_notification_service_goal_achieved():
    """목표 달성 조건 충족 시 알림 생성."""
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.services.notification import check_and_create_notifications

    goal = MagicMock()
    goal.id = 1
    goal.target_amount_krw = 100_000_000
    goal.is_active = True

    db_result = MagicMock()
    db_result.scalars.return_value.first.return_value = goal

    db = AsyncMock()
    db.execute.return_value = db_result
    db.add = MagicMock()
    db.commit = AsyncMock()

    redis = AsyncMock()
    redis.exists.return_value = 0  # 중복 알림 없음

    with patch("app.services.notification.get_redis", return_value=redis):
        count = await check_and_create_notifications(db, 110_000_000.0, [])

    assert count == 1
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_notification_service_high_loss():
    """이상 손실 종목 → 알림 생성."""
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.services.notification import check_and_create_notifications

    db_result = MagicMock()
    db_result.scalars.return_value.first.return_value = None  # 목표 없음

    db = AsyncMock()
    db.execute.return_value = db_result
    db.add = MagicMock()
    db.commit = AsyncMock()

    redis = AsyncMock()
    redis.exists.return_value = 0

    pos = MagicMock()
    pos.symbol = "005930"
    pos.name = "삼성전자"
    pos.return_pct = -20.0  # -15% 이하

    with patch("app.services.notification.get_redis", return_value=redis):
        count = await check_and_create_notifications(db, 0.0, [pos])

    assert count == 1
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_notification_service_dedup():
    """동일 조건 중복 알림 방지 — Redis 키 존재 시 생성 안 함."""
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.services.notification import check_and_create_notifications

    goal = MagicMock()
    goal.id = 1
    goal.target_amount_krw = 100_000_000

    db_result = MagicMock()
    db_result.scalars.return_value.first.return_value = goal

    db = AsyncMock()
    db.execute.return_value = db_result
    db.add = MagicMock()
    db.commit = AsyncMock()

    redis = AsyncMock()
    redis.exists.return_value = 1  # 이미 발송됨

    with patch("app.services.notification.get_redis", return_value=redis):
        count = await check_and_create_notifications(db, 110_000_000.0, [])

    assert count == 0
    db.add.assert_not_called()
