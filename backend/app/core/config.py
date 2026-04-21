from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/asset_insight"
    redis_url: str = "redis://localhost:6379/0"

    # KIS API
    kis_app_key: str = ""
    kis_app_secret: str = ""
    kis_account_no: str = ""         # XXXXXXXXXX-XX 형식
    kis_mock: bool = False
    kis_overseas_exchanges: list[str] = ["NASD", "NYSE", "AMEX"]  # 조회할 해외 거래소

    # 키움증권 OpenAPI+ REST (전역 설정 — 단일 계좌 편의용)
    kiwoom_app_key: str = ""
    kiwoom_app_secret: str = ""
    kiwoom_account_no: str = ""      # XXXXXXXXXX-XX 형식
    kiwoom_mock: bool = False

    # Scheduler
    snapshot_cron: str = "0 18 * * 1-5"   # 평일 18시 (장 마감 후)
    notification_interval_minutes: int = 30  # 알림 체크 주기 (분)
    realtime_throttle_seconds: int = 600     # 실시간 조회 스냅샷 저장 최소 간격 (초)

    # Notification thresholds
    notif_high_return_pct: float = 20.0   # 이상 수익률 기준 (%)
    notif_high_loss_pct: float = -15.0    # 이상 손실 기준 (%)

    # AI
    anthropic_api_key: str = ""

    # App
    secret_key: str = "change-me-in-production"
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
