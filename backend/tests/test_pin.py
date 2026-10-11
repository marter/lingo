import threading
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.models.parent import Parent
from app.services import pin as pin_service
from tests.conftest import bearer, register


def unlock(client: TestClient, family: dict[str, str], pin: str):
    return client.post("/api/family/unlock", json={"pin": pin}, headers=family)


def test_unlock_with_pin(client: TestClient) -> None:
    tokens = register(client)
    assert unlock(client, tokens["family"], "1234").status_code == 409  # no PIN yet

    assert (
        client.put("/api/parent/pin", json={"pin": "1234"}, headers=tokens["parent"]).status_code
        == 204
    )
    assert client.get("/api/family", headers=tokens["family"]).json()["has_pin"] is True

    assert unlock(client, tokens["family"], "9999").status_code == 401
    ok = unlock(client, tokens["family"], "1234")
    assert ok.status_code == 200
    assert client.get("/api/parent/me", headers=bearer(ok.json()["token"])).status_code == 200


@pytest.mark.parametrize("pin", ["123", "12345", "abcd", " 1234"])
def test_pin_must_be_four_digits(client: TestClient, pin: str) -> None:
    tokens = register(client)
    assert (
        client.put("/api/parent/pin", json={"pin": pin}, headers=tokens["parent"]).status_code
        == 422
    )


def test_lockout_after_too_many_wrong_pins(client: TestClient, db: Session) -> None:
    tokens = register(client)
    client.put("/api/parent/pin", json={"pin": "1234"}, headers=tokens["parent"])

    for _ in range(get_settings().pin_max_attempts):
        assert unlock(client, tokens["family"], "0000").status_code == 401
    # Locked: even the right PIN is refused.
    assert unlock(client, tokens["family"], "1234").status_code == 429

    # The lock wears off.
    db.execute(update(Parent).values(pin_locked_until=datetime.now(UTC) - timedelta(seconds=1)))
    db.commit()
    assert unlock(client, tokens["family"], "1234").status_code == 200


def test_right_pin_resets_the_failure_count(client: TestClient) -> None:
    tokens = register(client)
    client.put("/api/parent/pin", json={"pin": "1234"}, headers=tokens["parent"])
    for _ in range(get_settings().pin_max_attempts - 1):
        unlock(client, tokens["family"], "0000")
    assert unlock(client, tokens["family"], "1234").status_code == 200
    assert unlock(client, tokens["family"], "0000").status_code == 401  # not locked


def test_parallel_guesses_are_all_counted(engine, client: TestClient, db: Session) -> None:
    """Without the row lock, guesses running at the same time each read the same failure
    count, so a kid could get far more than `pin_max_attempts` tries. bcrypt is slow
    enough (~0.2s) that these really overlap."""
    tokens = register(client)
    client.put("/api/parent/pin", json={"pin": "1234"}, headers=tokens["parent"])
    parent_id = db.scalars(select(Parent.id)).one()
    attempts = get_settings().pin_max_attempts
    Sessions = sessionmaker(bind=engine)
    barrier = threading.Barrier(attempts)

    def guess(id_: uuid.UUID) -> None:
        with Sessions() as session:
            parent = session.get(Parent, id_)
            assert parent is not None
            barrier.wait()
            pin_service.check_pin(session, parent, "0000")

    threads = [threading.Thread(target=guess, args=(parent_id,)) for _ in range(attempts)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    db.expire_all()
    parent = db.get(Parent, parent_id)
    assert parent is not None
    assert parent.pin_locked_until is not None
