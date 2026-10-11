import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import Scope, decode_token
from app.models.child import Child
from app.models.parent import Parent
from app.services import verification

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def _claims(token: str, allowed: set[Scope]) -> uuid.UUID:
    try:
        payload = decode_token(token)
        scope = Scope(payload["scope"])
        subject = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise CREDENTIALS_ERROR from exc
    if scope not in allowed:
        raise CREDENTIALS_ERROR
    return subject


def _active_parent(db: Session, parent_id: uuid.UUID) -> Parent:
    parent = db.get(Parent, parent_id)
    if parent is None or not parent.is_active:
        raise CREDENTIALS_ERROR
    return parent


def get_family(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Parent:
    """The account behind a shared device. A parent token works here too."""
    return _active_parent(db, _claims(token, {Scope.FAMILY, Scope.PARENT}))


def get_parent(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Parent:
    """Only an unlocked parent session (password or PIN)."""
    return _active_parent(db, _claims(token, {Scope.PARENT}))


def get_verified_parent(parent: Parent = Depends(get_parent)) -> Parent:
    if not verification.is_verified(parent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please confirm your email before setting up kids' profiles.",
        )
    return parent


def get_child(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Child:
    child = db.get(Child, _claims(token, {Scope.CHILD}))
    if child is None:
        raise CREDENTIALS_ERROR
    _active_parent(db, child.parent_id)
    return child
