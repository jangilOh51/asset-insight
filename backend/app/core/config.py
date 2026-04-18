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
    kis_mock: bool = True
    kis_overseas_exchanges: list[str] = ["NASD", "NYSE", "AMEX"]  # 조회할 해외 거래소

    # Scheduler
    snapshot_cron: str = "0 18 * * 1-5"   # 평일 18시 (장 마감 후)

    # App
    secret_key: str = "change-me-in-production"
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
