from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "GitHub Engineering Assistant"
    debug: bool = True

    database_url: str = "sqlite+aiosqlite:///./dev.db"
    github_token: str | None = None
    redis_url: str = "redis://localhost:6379"


settings = Settings()