from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import Scope, create_token, hash_password, verify_password
from app.models.parent import Parent
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegistrationStatus,
    VerifyEmailRequest,
)
from app.services import verification

router = APIRouter(prefix="/api/auth", tags=["auth"])

REGISTRATION_CLOSED = "Sign-ups are closed. Lingo is limited to a few families for now."


def registration_open(db: Session) -> bool:
    parent_count = db.scalar(select(func.count()).select_from(Parent)) or 0
    return parent_count < get_settings().max_users


def _tokens(parent: Parent) -> LoginResponse:
    subject = str(parent.id)
    return LoginResponse(
        family_token=create_token(subject, Scope.FAMILY),
        parent_token=create_token(subject, Scope.PARENT),
    )


@router.get("/registration", response_model=RegistrationStatus)
def registration_status(db: Session = Depends(get_db)) -> RegistrationStatus:
    verification.purge_stale_unverified(db)
    return RegistrationStatus(open=registration_open(db))


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> LoginResponse:
    # Serialize sign-ups so two at once can't both squeeze under the limit.
    verification.purge_stale_unverified(db)
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext('register'))"))
    if not registration_open(db):
        raise HTTPException(status_code=403, detail=REGISTRATION_CLOSED)

    email = payload.email.lower()
    if db.scalars(select(Parent).where(Parent.email == email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    parent = Parent(email=email, hashed_password=hash_password(payload.password))
    db.add(parent)
    db.flush()
    if get_settings().email_verification_required:
        verification.send_verification(db, parent)
    db.commit()
    return _tokens(parent)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    parent = db.scalars(select(Parent).where(Parent.email == payload.email.lower())).first()
    if parent is None or not verify_password(payload.password, parent.hashed_password):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return _tokens(parent)


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> None:
    """Confirms an email from the emailed link. No login needed: the token is the proof."""
    try:
        verification.verify(db, payload.token)
    except verification.VerificationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
