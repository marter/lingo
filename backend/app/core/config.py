from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: str = "local"
    database_url: str = "postgresql+psycopg://lingo:lingo@localhost:5434/lingo"
    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    cors_origins: list[str] = ["http://localhost:5175"]
    app_base_url: str = "http://localhost:5175"  # used to build links in emails

    # Token lifetimes (see app/core/security.py for what each scope may do).
    # family: stays on a shared device so kids can pick their profile.
    family_token_days: int = 90
    # parent: unlocks the parent area after the password or PIN; short on purpose.
    parent_token_minutes: int = 30
    # child: one kid's session; the profile picker renews it.
    child_token_hours: int = 24

    # Sign-ups close once this many parent accounts exist. Keeps the site to friends and
    # family; kids never sign up themselves (they're profiles under a parent).
    max_users: int = 10
    max_children_per_parent: int = 4

    # Parent PIN: this many wrong guesses in a row locks it for `pin_lockout_minutes`.
    pin_max_attempts: int = 5
    pin_lockout_minutes: int = 15

    # Email verification. A parent must verify before adding kids (that's the consent step);
    # unverified accounts are deleted after `unverified_account_ttl_hours`.
    email_verification_required: bool = True
    email_backend: str = "console"  # "console" (logs the email), "resend", or "memory" (tests)
    resend_api_key: str = ""
    email_from: str = "Lingo <no-reply@martinteran.me>"
    verification_token_ttl_hours: int = 24
    unverified_account_ttl_hours: int = 48


@lru_cache
def get_settings() -> Settings:
    return Settings()
