from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.content import ContentError, get_course, load_course
from tests.conftest import add_child, bearer, register


def child_headers(client: TestClient) -> dict[str, str]:
    tokens = register(client)
    child_id = add_child(client, tokens["parent"])
    session = client.post(f"/api/family/children/{child_id}/session", headers=tokens["family"])
    return bearer(session.json()["token"])


def test_shipped_content_loads() -> None:
    course = get_course()
    assert [u.id for u in course.units] == ["greetings", "colors", "animals"]
    words = {w.id: w for u in course.units for w in u.words}
    # YAML 1.1 would turn an unquoted `no` into False; make sure it stayed a word.
    assert words["no"].es == "no"
    assert words["si"].en == "yes"
    assert words["adios"].es == "adiós"


def test_course_and_lesson_endpoints(client: TestClient) -> None:
    headers = child_headers(client)
    course = client.get("/api/child/course", headers=headers)
    assert course.status_code == 200
    first = course.json()["units"][0]
    assert first["id"] == "greetings"
    assert first["lessons"][0] == {
        "id": "greetings-1",
        "title": "Hello and goodbye",
        "word_count": 4,
    }

    lesson = client.get("/api/child/lessons/animals-1", headers=headers)
    assert lesson.status_code == 200
    body = lesson.json()
    assert body["unit_title"] == "Animals"
    assert body["words"][0] == {"id": "perro", "es": "el perro", "en": "the dog", "emoji": "🐶"}

    assert client.get("/api/child/lessons/nope", headers=headers).status_code == 404


def test_course_needs_a_kid_session(client: TestClient) -> None:
    tokens = register(client)
    assert client.get("/api/child/course", headers=tokens["family"]).status_code == 401
    assert client.get("/api/child/course").status_code == 401


GOOD_UNIT = """
id: pets
title: Pets
emoji: 🐾
words:
  perro: { es: el perro, en: the dog, emoji: 🐶 }
  gato: { es: el gato, en: the cat, emoji: 🐱 }
  pez: { es: el pez, en: the fish, emoji: 🐟 }
  pato: { es: el pato, en: the duck, emoji: 🦆 }
lessons:
  - id: pets-1
    title: Pets
    words: [perro, gato, pez, pato]
"""


def write(tmp_path: Path, *units: str) -> Path:
    for i, text in enumerate(units, start=1):
        (tmp_path / f"{i:02d}.yaml").write_text(text, encoding="utf-8")
    return tmp_path


def test_good_unit_loads(tmp_path: Path) -> None:
    course = load_course(write(tmp_path, GOOD_UNIT))
    assert course.units[0].lessons[0].words[3].en == "the duck"


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (("[perro, gato, pez, pato]", "[perro, gato, pez, loro]"), "unknown words"),
        (("[perro, gato, pez, pato]", "[perro, gato, pez]"), "has 3 words"),
        (("[perro, gato, pez, pato]", "[perro, gato, pez, perro]"), "twice"),
        (("emoji: 🦆", "emoji: 🐶"), "reuses an emoji"),
        (("id: pets\n", "id: Pets!\n"), "must be lowercase"),
        (("en: the duck", 'en: " the duck"'), "spaces"),
        (("en: the duck", "en: no"), "valid string"),  # YAML 1.1 boolean
        (
            (
                "  pato: { es: el pato",
                "  ganso: { es: el ganso, en: the goose, emoji: 🪿 }\n  pato: { es: el pato",
            ),
            "not in any lesson",
        ),
    ],
)
def test_bad_content_is_rejected(tmp_path: Path, change: tuple[str, str], message: str) -> None:
    old, new = change
    assert old in GOOD_UNIT
    with pytest.raises(ContentError, match=message):
        load_course(write(tmp_path, GOOD_UNIT.replace(old, new, 1)))


def test_ids_are_unique_across_units(tmp_path: Path) -> None:
    other = GOOD_UNIT.replace("id: pets\n", "id: pets2\n").replace("pets-1", "pets2-1")
    with pytest.raises(ContentError, match="duplicate word id 'perro'"):
        load_course(write(tmp_path, GOOD_UNIT, other))
