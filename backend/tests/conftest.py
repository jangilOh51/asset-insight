"""공통 테스트 픽스처.

모든 외부 의존성(DB, Redis, 증권사 API)을 Mock으로 대체한다.
실제 네트워크/DB 연결 없이 단위 테스트가 실행된다.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.database import get_db
from app.main import app


# ── DB mock ───────────────────────────────────────────────────────────────────

def make_db_result(rows=None, scalar=None):
    """db.execute() 반환값 mock 생성 헬퍼."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows or []
    result.scalars.return_value.first.return_value = (rows or [None])[0]
    result.scalar_one_or_none.return_value = scalar
    result.scalar.return_value = scalar
    return result


@pytest.fixture
def mock_db():
    """기본 빈 결과를 반환하는 AsyncSession mock."""
    session = AsyncMock()
    session.execute.return_value = make_db_result()
    session.get.return_value = None
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
async def client(mock_db):
    """mock_db를 get_db에 주입한 TestClient."""
    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()
