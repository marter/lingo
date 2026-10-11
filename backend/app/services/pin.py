"""The 4-digit parent PIN, with a lockout so a kid can't just try all 10,000."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.models.parent import Parent


class PinLocked(Exception):
    pass


class PinNotSet(Exception):
    pass


def set_pin(parent: Parent, pin: str) -> None:
    """Caller commits."""
    parent.pin_hash = hash_password(pin)
    parent.pin_failed_attempts = 0
    parent.pin_locked_until = None


def check_pin(db: Session, parent: Parent, pin: str) -> bool:
    """Returns whether the PIN is right, counting failures. Commits. Raises PinLocked while
    locked out (even for the right PIN) and PinNotSet if the parent hasn't chosen one."""
    settings = get_settings()
    now = datetime.now(UTC)
    # Lock the row so parallel guesses can't each see a stale failure count.
    # populate_existing: the request already loaded this parent, and without it the ORM would
    # keep that (possibly stale) copy's attributes instead of the freshly locked row's.
    locked = db.scalars(
        select(Parent)
        .where(Parent.id == parent.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one()
    if locked.pin_hash is None:
        raise PinNotSet
    if locked.pin_locked_until is not None and locked.pin_locked_until > now:
        db.commit()
        raise PinLocked(locked.pin_locked_until)

    ok = verify_password(pin, locked.pin_hash)
    if ok:
        locked.pin_failed_attempts = 0
        locked.pin_locked_until = None
    else:
        locked.pin_failed_attempts += 1
        if locked.pin_failed_attempts >= settings.pin_max_attempts:
            locked.pin_failed_attempts = 0
            locked.pin_locked_until = now + timedelta(minutes=settings.pin_lockout_minutes)
    db.commit()
    return ok
