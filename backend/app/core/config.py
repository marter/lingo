from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: str = "local"
    database_url: str = "postgresql+psycopg://lingo:lingo@localhost:5434/lingo"
    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 30
    cors_origins: list[str] = ["http://localhost:5175"]
    app_base_url: str = "http://localhost:5175"  # used to build links in emails

    # Sign-ups close once this many parent accounts exist. Keeps the site to friends and
    # family; kids never sign up themselves (they're profiles under a parent).
    max_users: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
