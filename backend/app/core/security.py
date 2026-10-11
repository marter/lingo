"""Passwords, PINs and tokens.

Every token carries a `scope`:

- "family": what a shared device keeps after a parent logs in. It can list the family's kid
  profiles, start a kid's session and try the parent PIN, nothing else.
- "parent": the parent area (manage profiles, PIN, account). Issued by the password or PIN
  and short-lived, so a kid who picks up the device can't wander in.
- "child": one kid's learning session. `sub` is the child's id, not the parent's.
"""

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import get_settings

settings = get_settings()


class Scope(StrEnum):
    FAMILY = "family"
    PARENT = "parent"
    CHILD = "child"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def _lifetime(scope: Scope) -> timedelta:
    match scope:
        case Scope.FAMILY:
            return timedelta(days=settings.family_token_days)
        case Scope.PARENT:
            return timedelta(minutes=settings.parent_token_minutes)
        case Scope.CHILD:
            return timedelta(hours=settings.child_token_hours)


def create_token(subject: str, scope: Scope) -> str:
    expire = datetime.now(UTC) + _lifetime(scope)
    to_encode: dict[str, Any] = {"sub": subject, "scope": scope.value, "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
