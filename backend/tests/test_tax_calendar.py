"""절세 캘린더 API 단위 테스트.

커버 엔드포인트:
  GET /api/v1/tax/calendar
"""

import pytest


@pytest.mark.asyncio
async def test_calendar_returns_events(client, mock_db):
    """이벤트 목록 반환 + 필수 필드 포함."""
    resp = await client.get("/api/v1/tax/calendar")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 7  # AC-03: 7가지 이상

    first = data[0]
    for field in ["id", "title", "description", "month", "category", "is_annual"]:
        assert field in first


@pytest.mark.asyncio
async def test_calendar_month_range(client, mock_db):
    """모든 이벤트의 month가 1~12 범위 내."""
    resp = await client.get("/api/v1/tax/calendar")
    assert resp.status_code == 200
    for event in resp.json():
        assert 1 <= event["month"] <= 12


@pytest.mark.asyncio
async def test_calendar_categories_valid(client, mock_db):
    """category 값이 허용된 목록 내."""
    allowed = {"report", "payment", "deadline", "strategy", "check"}
    resp = await client.get("/api/v1/tax/calendar")
    assert resp.status_code == 200
    for event in resp.json():
        assert event["category"] in allowed


@pytest.mark.asyncio
async def test_calendar_has_overseas_capital_gains(client, mock_db):
    """해외 주식 양도소득세 마감 이벤트(5월) 포함."""
    resp = await client.get("/api/v1/tax/calendar")
    assert resp.status_code == 200
    may_events = [e for e in resp.json() if e["month"] == 5]
    assert len(may_events) > 0


@pytest.mark.asyncio
async def test_calendar_accepts_year_param(client, mock_db):
    """year 파라미터 전달 시에도 정상 응답."""
    resp = await client.get("/api/v1/tax/calendar?year=2025")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
