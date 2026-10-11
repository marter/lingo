from fastapi.testclient import TestClient

from app.core.config import get_settings
from tests.conftest import add_child, bearer, register


def test_register_returns_family_and_parent_tokens(client: TestClient) -> None:
    tokens = register(client)
    me = client.get("/api/parent/me", headers=tokens["parent"])
    assert me.status_code == 200
    assert me.json() == {
        "email": "pat@example.com",
        "has_pin": False,
        "email_verified": False,
        "children": [],
    }
    family = client.get("/api/family", headers=tokens["family"])
    assert family.status_code == 200
    assert "email" not in family.json()  # the shared device doesn't need it


def test_register_rejects_duplicate_email_case_insensitively(client: TestClient) -> None:
    register(client, "pat@example.com")
    response = client.post(
        "/api/auth/register", json={"email": "PAT@example.com", "password": "hunter22!"}
    )
    assert response.status_code == 400


def test_login(client: TestClient) -> None:
    register(client)
    ok = client.post("/api/auth/login", json={"email": "Pat@example.com", "password": "hunter22!"})
    assert ok.status_code == 200
    assert set(ok.json()) == {"family_token", "parent_token"}

    bad = client.post("/api/auth/login", json={"email": "pat@example.com", "password": "nope"})
    assert bad.status_code == 401


def test_registration_closes_at_max_users(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "max_users", 2)
    assert client.get("/api/auth/registration").json() == {"open": True}
    register(client, "one@example.com")
    register(client, "two@example.com")
    assert client.get("/api/auth/registration").json() == {"open": False}

    response = client.post(
        "/api/auth/register", json={"email": "three@example.com", "password": "hunter22!"}
    )
    assert response.status_code == 403
    assert "closed" in response.json()["detail"]


def test_each_scope_only_opens_its_own_doors(client: TestClient) -> None:
    tokens = register(client)
    child_id = add_child(client, tokens["parent"])
    session = client.post(f"/api/family/children/{child_id}/session", headers=tokens["family"])
    child = bearer(session.json()["token"])

    # The family token (left on a shared device) can't reach the parent area.
    assert client.get("/api/parent/me", headers=tokens["family"]).status_code == 401
    assert (
        client.put("/api/parent/pin", json={"pin": "1234"}, headers=tokens["family"]).status_code
        == 401
    )
    assert (
        client.delete(f"/api/parent/children/{child_id}", headers=tokens["family"]).status_code
        == 401
    )

    # A kid's token can't act as the family or the parent.
    assert client.get("/api/family", headers=child).status_code == 401
    assert client.get("/api/parent/me", headers=child).status_code == 401
    assert client.get("/api/child/me", headers=child).json()["nickname"] == "Sofi"

    # Parent and family tokens aren't kid sessions.
    assert client.get("/api/child/me", headers=tokens["parent"]).status_code == 401
    assert client.get("/api/child/me", headers=tokens["family"]).status_code == 401


def test_garbage_token_is_rejected(client: TestClient) -> None:
    assert client.get("/api/family", headers=bearer("not-a-jwt")).status_code == 401
    assert client.get("/api/family").status_code == 401
