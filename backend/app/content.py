"""The course: units, lessons and words, loaded from content/es/*.yaml at startup.

Content lives in the repo (reviewed in PRs), not the database. Progress is stored against
these ids, so they must never be renamed or reused once shipped (see content/README.md).
"""

import re
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content" / "es"
ID_PATTERN = re.compile(r"^[a-z0-9_-]+$")


class Word(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    es: str = Field(min_length=1, max_length=40)
    en: str = Field(min_length=1, max_length=40)
    emoji: str = Field(min_length=1, max_length=16)

    @field_validator("es", "en", "emoji")
    @classmethod
    def _trimmed(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("has leading or trailing spaces")
        return value


class Lesson(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    words: list[Word]


class Unit(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    emoji: str
    words: list[Word]
    lessons: list[Lesson]


class Course(BaseModel):
    model_config = ConfigDict(frozen=True)

    units: list[Unit]

    def lesson(self, lesson_id: str) -> tuple[Unit, Lesson] | None:
        for unit in self.units:
            for lesson in unit.lessons:
                if lesson.id == lesson_id:
                    return unit, lesson
        return None


class ContentError(Exception):
    pass


MIN_LESSON_WORDS = 4  # a picture question shows 4 choices
MAX_LESSON_WORDS = 6


def _check_id(kind: str, value: object, seen: set[str], where: str) -> str:
    if not isinstance(value, str) or not ID_PATTERN.match(value):
        raise ContentError(f"{where}: {kind} id {value!r} must be lowercase a-z, 0-9, _ or -")
    if value in seen:
        raise ContentError(f"{where}: duplicate {kind} id {value!r}")
    seen.add(value)
    return value


def _load_unit(path: Path, seen: dict[str, set[str]]) -> Unit:
    where = path.name
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ContentError(f"{where}: expected a mapping at the top level")
    try:
        unit_id = _check_id("unit", raw.get("id"), seen["unit"], where)
        words: dict[str, Word] = {}
        for key, data in (raw.get("words") or {}).items():
            word_id = _check_id("word", key, seen["word"], where)
            words[word_id] = Word(id=word_id, **data)

        lessons: list[Lesson] = []
        used: set[str] = set()
        for entry in raw.get("lessons") or []:
            lesson_id = _check_id("lesson", entry.get("id"), seen["lesson"], where)
            ids = entry.get("words") or []
            missing = [w for w in ids if w not in words]
            if missing:
                raise ContentError(f"{where}: lesson {lesson_id} uses unknown words {missing}")
            if not MIN_LESSON_WORDS <= len(ids) <= MAX_LESSON_WORDS:
                raise ContentError(
                    f"{where}: lesson {lesson_id} has {len(ids)} words "
                    f"(needs {MIN_LESSON_WORDS}-{MAX_LESSON_WORDS})"
                )
            if len(set(ids)) != len(ids):
                raise ContentError(f"{where}: lesson {lesson_id} lists a word twice")
            emojis = [words[w].emoji for w in ids]
            if len(set(emojis)) != len(emojis):
                raise ContentError(f"{where}: lesson {lesson_id} reuses an emoji")
            used.update(ids)
            lessons.append(
                Lesson(id=lesson_id, title=entry.get("title", ""), words=[words[w] for w in ids])
            )

        unused = sorted(set(words) - used)
        if unused:
            raise ContentError(f"{where}: words not in any lesson: {unused}")
        if not lessons:
            raise ContentError(f"{where}: unit has no lessons")
        return Unit(
            id=unit_id,
            title=raw.get("title", ""),
            emoji=raw.get("emoji", ""),
            words=list(words.values()),
            lessons=lessons,
        )
    except ValidationError as exc:
        raise ContentError(f"{where}: {exc}") from exc


def load_course(directory: Path = CONTENT_DIR) -> Course:
    """Reads and checks every unit file. Raises ContentError on the first problem."""
    seen: dict[str, set[str]] = {"unit": set(), "lesson": set(), "word": set()}
    files = sorted(directory.glob("*.yaml"))
    if not files:
        raise ContentError(f"No unit files in {directory}")
    return Course(units=[_load_unit(path, seen) for path in files])


@lru_cache
def get_course() -> Course:
    return load_course()
