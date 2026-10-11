"""What a shared family device can do with its long-lived family token."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_family
from app.core.db import get_db
from app.core.security import Scope, create_token
from app.models.child import Child
from app.models.parent import Parent
from app.schemas.auth import TokenResponse
from app.schemas.family import FamilyRead, PinRequest
from app.services import pin as pin_service

router = APIRouter(prefix="/api/family", tags=["family"])


@router.get("", response_model=FamilyRead)
def family(parent: Parent = Depends(get_family)) -> Parent:
    return parent


@router.post("/children/{child_id}/session", response_model=TokenResponse)
def start_child_session(
    child_id: uuid.UUID, parent: Parent = Depends(get_family), db: Session = Depends(get_db)
) -> TokenResponse:
    child = db.get(Child, child_id)
    if child is None or child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    return TokenResponse(token=create_token(str(child.id), Scope.CHILD))


@router.post("/unlock", response_model=TokenResponse)
def unlock(
    payload: PinRequest, parent: Parent = Depends(get_family), db: Session = Depends(get_db)
) -> TokenResponse:
    """Trades the PIN for a short-lived parent token."""
    try:
        ok = pin_service.check_pin(db, parent, payload.pin)
    except pin_service.PinNotSet as exc:
        raise HTTPException(
            status_code=409, detail="No PIN yet. Log in with your password instead."
        ) from exc
    except pin_service.PinLocked as exc:
        raise HTTPException(
            status_code=429,
            detail="Too many wrong tries. Wait a few minutes, or log in with your password.",
        ) from exc
    if not ok:
        raise HTTPException(status_code=401, detail="That's not the right PIN.")
    return TokenResponse(token=create_token(str(parent.id), Scope.PARENT))
