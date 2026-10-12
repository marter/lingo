import threading

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.content import get_course
from app.models.child import Child
from app.models.progress import LessonCompletion
from app.services import progress
from tests.conftest import add_child, bearer, child_headers, finish, register


def states(client: TestClient, headers: dict[str, str]) -> dict[str, str]:
    course = client.get("/api/child/course", headers=headers).json()
    return {lesson["id"]: lesson["state"] for unit in course["units"] for lesson in unit["lessons"]}


def test_lessons_unlock_in_order_across_units(client: TestClient) -> None:
    headers = child_headers(client)
    all_ids = [lesson.id for unit in get_course().units for lesson in unit.lessons]

    before = states(client, headers)
    assert before[all_ids[0]] == "current"
    assert all(before[i] == "locked" for i in all_ids[1:])

    finish(client, headers, "greetings-1")
    finish(client, headers, "greetings-2")  # last lesson of unit 1
    after = states(client, headers)
    assert after["greetings-1"] == after["greetings-2"] == "done"
    assert after["colors-1"] == "current"  # the next unit opens
    assert after["colors-2"] == "locked"


def test_locked_lessons_cant_be_finished(client: TestClient, db: Session) -> None:
    headers = child_headers(client)
    response = client.post(
        "/api/child/lessons/colors-1/complete",
        json={"first_try_correct": 4, "question_count": 4},
        headers=headers,
    )
    assert response.status_code == 403
    assert db.scalars(select(LessonCompletion)).all() == []


def test_replaying_updates_the_same_row(client: TestClient, db: Session) -> None:
    headers = child_headers(client)
    finish(client, headers, "greetings-1", right=5)
    finish(client, headers, "greetings-1", right=9)  # done lessons stay open for replay

    row = db.scalars(select(LessonCompletion)).one()
    assert (row.times_completed, row.first_try_correct, row.question_count) == (2, 9, 10)
    assert row.updated_at >= row.created_at
    assert client.get("/api/child/lessons/greetings-1", headers=headers).json()["completed"]


def test_rejects_bad_results(client: TestClient) -> None:
    headers = child_headers(client)
    for body in (
        {"first_try_correct": 11, "question_count": 10},
        {"first_try_correct": -1, "question_count": 10},
        {"first_try_correct": 0, "question_count": 0},
        {"first_try_correct": 0, "question_count": 500},
    ):
        response = client.post(
            "/api/child/lessons/greetings-1/complete", json=body, headers=headers
        )
        assert response.status_code == 422, body
    unknown = client.post(
        "/api/child/lessons/nope/complete",
        json={"first_try_correct": 1, "question_count": 1},
        headers=headers,
    )
    assert unknown.status_code == 404


def test_progress_is_per_kid(client: TestClient) -> None:
    tokens = register(client)
    sofi = add_child(client, tokens["parent"], nickname="Sofi")
    leo = add_child(client, tokens["parent"], nickname="Leo")

    def session(child_id: str) -> dict[str, str]:
        response = client.post(f"/api/family/children/{child_id}/session", headers=tokens["family"])
        return bearer(response.json()["token"])

    finish(client, session(sofi), "greetings-1")
    assert states(client, session(sofi))["greetings-1"] == "done"
    assert states(client, session(leo))["greetings-1"] == "current"


def test_deleting_a_kid_deletes_their_progress(client: TestClient, db: Session) -> None:
    tokens = register(client)
    child_id = add_child(client, tokens["parent"])
    token = client.post(f"/api/family/children/{child_id}/session", headers=tokens["family"])
    finish(client, bearer(token.json()["token"]), "greetings-1")
    assert len(db.scalars(select(LessonCompletion)).all()) == 1

    deleted = client.delete(f"/api/parent/children/{child_id}", headers=tokens["parent"])
    assert deleted.status_code == 204
    db.expire_all()
    assert db.scalars(select(LessonCompletion)).all() == []


def test_finishing_twice_at_once_keeps_one_row(engine, client: TestClient, db: Session) -> None:
    """A double tap on a slow network sends the same finish twice. Without the upsert,
    the second insert would hit the unique key and the kid would see an error."""
    child_headers(client)
    child_id = db.scalars(select(Child.id)).one()
    Sessions = sessionmaker(bind=engine)
    attempts = 4
    barrier = threading.Barrier(attempts)
    errors: list[Exception] = []

    def tap() -> None:
        with Sessions() as session:
            child = session.get(Child, child_id)
            assert child is not None
            barrier.wait()
            try:
                progress.record_completion(session, get_course(), child, "greetings-1", 3, 4)
            except Exception as exc:  # noqa: BLE001 (collected and asserted below)
                errors.append(exc)

    threads = [threading.Thread(target=tap) for _ in range(attempts)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    row = db.scalars(select(LessonCompletion)).one()
    assert row.times_completed == attempts
