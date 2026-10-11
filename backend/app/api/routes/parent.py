"""The parent area: needs a parent token (password login or PIN unlock)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_parent, get_verified_parent
from app.core.config import get_settings
from app.core.db import get_db
from app.models.child import AVATARS, AgeBand, Child
from app.models.parent import Parent
from app.schemas.family import ChildCreate, ChildRead, ChildUpdate, Options, ParentRead, PinRequest
from app.services import pin as pin_service
from app.services import verification

router = APIRouter(prefix="/api/parent", tags=["parent"])


def _own_child(db: Session, parent: Parent, child_id: uuid.UUID) -> Child:
    child = db.get(Child, child_id)
    if child is None or child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    return child


@router.get("/me", response_model=ParentRead)
def me(parent: Parent = Depends(get_parent)) -> Parent:
    return parent


@router.get("/options", response_model=Options)
def options() -> Options:
    return Options(
        avatars=list(AVATARS),
        age_bands=list(AgeBand),
        max_children=get_settings().max_children_per_parent,
    )


@router.put("/pin", status_code=status.HTTP_204_NO_CONTENT)
def set_pin(
    payload: PinRequest, parent: Parent = Depends(get_parent), db: Session = Depends(get_db)
) -> None:
    pin_service.set_pin(parent, payload.pin)
    db.commit()


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
def resend_verification(
    parent: Parent = Depends(get_parent), db: Session = Depends(get_db)
) -> None:
    if parent.email_verified:
        raise HTTPException(status_code=400, detail="Your email is already confirmed")
    try:
        verification.check_rate_limit(db, parent, datetime.now(UTC))
    except verification.TooManyEmails as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    verification.send_verification(db, parent)
    db.commit()


@router.post("/children", response_model=ChildRead, status_code=status.HTTP_201_CREATED)
def add_child(
    payload: ChildCreate,
    parent: Parent = Depends(get_verified_parent),
    db: Session = Depends(get_db),
) -> Child:
    if len(parent.children) >= get_settings().max_children_per_parent:
        raise HTTPException(status_code=400, detail="That's the most profiles a family can have.")
    child = Child(parent_id=parent.id, **payload.model_dump())
    db.add(child)
    db.commit()
    return child


@router.patch("/children/{child_id}", response_model=ChildRead)
def update_child(
    child_id: uuid.UUID,
    payload: ChildUpdate,
    parent: Parent = Depends(get_parent),
    db: Session = Depends(get_db),
) -> Child:
    child = _own_child(db, parent, child_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(child, field, value)
    db.commit()
    return child


@router.delete("/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(
    child_id: uuid.UUID, parent: Parent = Depends(get_parent), db: Session = Depends(get_db)
) -> None:
    """Hard delete. Later steps' per-child data (progress, stars) must cascade from here."""
    db.delete(_own_child(db, parent, child_id))
    db.commit()
