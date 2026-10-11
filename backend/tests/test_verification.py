import re
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.parent import Parent
from app.models.verification import EmailVerificationToken
from app.services import email
from tests.conftest import register

pytestmark = pytest.mark.usefixtures("verification_on")

CHILD = {"nickname": "Sofi", "avatar": "🦊", "age_band": "7-9"}


def link_token(message: email.Email) -> str:
    match = re.search(r"/verify-email\?token=([\w-]+)", message.text)
    assert match, message.text
    return match.group(1)


def test_kids_need_a_verified_parent(client: TestClient) -> None:
    tokens = register(client)
    assert client.get("/api/parent/me", headers=tokens["parent"]).json()["email_verified"] is False

    assert len(email.outbox) == 1
    message = email.outbox[0]
    assert message.to == "pat@example.com"
    assert get_settings().app_base_url in message.text

    blocked = client.post("/api/parent/children", json=CHILD, headers=tokens["parent"])
    assert blocked.status_code == 403
    assert "confirm your email" in blocked.json()["detail"].lower()

    # The link works without being logged in.
    token = link_token(message)
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 204
    added = client.post("/api/parent/children", json=CHILD, headers=tokens["parent"])
    assert added.status_code == 201

    # Clicking the same link again is harmless.
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 204


def test_bad_and_expired_links(client: TestClient, db: Session) -> None:
    register(client)
    token = link_token(email.outbox[0])

    assert client.post("/api/auth/verify-email", json={"token": "x" * 43}).status_code == 400

    db.execute(
        update(EmailVerificationToken).values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
    )
    db.commit()
    expired = client.post("/api/auth/verify-email", json={"token": token})
    assert expired.status_code == 400
    assert "expired" in expired.json()["detail"]


def test_resend_is_rate_limited(client: TestClient, db: Session) -> None:
    tokens = register(client)
    resend = "/api/parent/resend-verification"
    # Sign-up just sent one, so an immediate resend is too soon.
    assert client.post(resend, headers=tokens["parent"]).status_code == 429

    db.execute(
        update(EmailVerificationToken).values(
            issued_at=EmailVerificationToken.issued_at - timedelta(minutes=2)
        )
    )
    db.commit()
    assert client.post(resend, headers=tokens["parent"]).status_code == 204
    assert len(email.outbox) == 2
    # The family token can't trigger emails.
    assert client.post(resend, headers=tokens["family"]).status_code == 401


def test_stale_unverified_accounts_are_purged(client: TestClient, db: Session) -> None:
    register(client, "old@example.com")
    register(client, "new@example.com")
    db.execute(
        text("UPDATE parents SET created_at = now() - interval '49 hours' WHERE email = :e"),
        {"e": "old@example.com"},
    )
    db.commit()

    client.get("/api/auth/registration")
    emails = db.scalars(select(Parent.email)).all()
    assert emails == ["new@example.com"]
    assert db.scalar(select(func.count()).select_from(EmailVerificationToken)) == 1
