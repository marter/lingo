import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.child import Child
from tests.conftest import add_child, bearer, register


def test_add_edit_and_list_children(client: TestClient) -> None:
    tokens = register(client)
    child_id = add_child(client, tokens["parent"], nickname="  Sofi  ")
    add_child(client, tokens["parent"], nickname="Leo")

    edited = client.patch(
        f"/api/parent/children/{child_id}",
        json={"avatar": "🐼", "age_band": "10-12"},
        headers=tokens["parent"],
    )
    assert edited.status_code == 200
    assert edited.json()["nickname"] == "Sofi"  # trimmed, and untouched by the edit
    assert edited.json()["avatar"] == "🐼"

    family = client.get("/api/family", headers=tokens["family"]).json()
    assert [c["nickname"] for c in family["children"]] == ["Sofi", "Leo"]


@pytest.mark.parametrize(
    "payload",
    [
        {"nickname": "", "avatar": "🦊", "age_band": "7-9"},
        {"nickname": "x" * 21, "avatar": "🦊", "age_band": "7-9"},
        {"nickname": "Sofi", "avatar": "💩", "age_band": "7-9"},
        {"nickname": "Sofi", "avatar": "🦊", "age_band": "4-6"},
    ],
)
def test_rejects_bad_profiles(client: TestClient, payload: dict[str, str]) -> None:
    tokens = register(client)
    response = client.post("/api/parent/children", json=payload, headers=tokens["parent"])
    assert response.status_code == 422


def test_profile_limit(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "max_children_per_parent", 2)
    tokens = register(client)
    add_child(client, tokens["parent"], "A")
    add_child(client, tokens["parent"], "B")
    response = client.post(
        "/api/parent/children",
        json={"nickname": "C", "avatar": "🦊", "age_band": "7-9"},
        headers=tokens["parent"],
    )
    assert response.status_code == 400


def test_families_cant_touch_each_others_kids(client: TestClient) -> None:
    mine = register(client, "me@example.com")
    theirs = register(client, "them@example.com")
    child_id = add_child(client, mine["parent"])

    url = f"/api/parent/children/{child_id}"
    assert client.patch(url, json={"nickname": "X"}, headers=theirs["parent"]).status_code == 404
    assert client.delete(url, headers=theirs["parent"]).status_code == 404
    session = client.post(f"/api/family/children/{child_id}/session", headers=theirs["family"])
    assert session.status_code == 404


def test_delete_child_ends_their_session(client: TestClient, db: Session) -> None:
    tokens = register(client)
    child_id = add_child(client, tokens["parent"])
    session = client.post(f"/api/family/children/{child_id}/session", headers=tokens["family"])
    child = bearer(session.json()["token"])

    deleted = client.delete(f"/api/parent/children/{child_id}", headers=tokens["parent"])
    assert deleted.status_code == 204
    assert db.scalar(select(func.count()).select_from(Child)) == 0
    assert client.get("/api/child/me", headers=child).status_code == 401
