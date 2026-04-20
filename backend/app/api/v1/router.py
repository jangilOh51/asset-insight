from fastapi import APIRouter

from app.api.v1.endpoints.accounts import router as accounts_router
from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.goals import router as goals_router
from app.api.v1.endpoints.market import router as market_router
from app.api.v1.endpoints.portfolio import router as portfolio_router
from app.api.v1.endpoints.realtime import router as realtime_router
from app.api.v1.endpoints.report import router as report_router
from app.api.v1.endpoints.snapshot import router as snapshot_router
from app.api.v1.endpoints.tax import router as tax_router
from app.api.v1.endpoints.tax_calendar import router as tax_calendar_router
from app.api.v1.endpoints.trend import router as trend_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(accounts_router)
api_router.include_router(assets_router)
api_router.include_router(goals_router)
api_router.include_router(market_router)
api_router.include_router(portfolio_router)
api_router.include_router(report_router)
api_router.include_router(snapshot_router)
api_router.include_router(tax_router)
api_router.include_router(tax_calendar_router)
api_router.include_router(trend_router)
api_router.include_router(realtime_router)
