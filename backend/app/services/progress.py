"""Which lessons a kid has finished, and which one they can play next.

Lessons unlock in course order: everything finished stays open for replay, the first
unfinished lesson is "current", and everything after it is locked.
"""

from enum import StrEnum

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.content import Course
from app.models.child import Child
from app.models.progress import LessonCompletion


class LessonState(StrEnum):
    DONE = "done"
    CURRENT = "current"
    LOCKED = "locked"


class LessonLocked(Exception):
    pass


def completed_ids(db: Session, child: Child) -> set[str]:
    return set(
        db.scalars(select(LessonCompletion.lesson_id).where(LessonCompletion.child_id == child.id))
    )


def lesson_states(course: Course, done: set[str]) -> dict[str, LessonState]:
    states: dict[str, LessonState] = {}
    current_found = False
    for unit in course.units:
        for lesson in unit.lessons:
            if lesson.id in done:
                states[lesson.id] = LessonState.DONE
            elif not current_found:
                states[lesson.id] = LessonState.CURRENT
                current_found = True
            else:
                states[lesson.id] = LessonState.LOCKED
    return states


def record_completion(
    db: Session,
    course: Course,
    child: Child,
    lesson_id: str,
    first_try_correct: int,
    question_count: int,
) -> None:
    """Upserts the kid's row for this lesson. Raises LessonLocked if it isn't open yet."""
    if lesson_states(course, completed_ids(db, child))[lesson_id] is LessonState.LOCKED:
        raise LessonLocked
    stmt = insert(LessonCompletion).values(
        child_id=child.id,
        lesson_id=lesson_id,
        first_try_correct=first_try_correct,
        question_count=question_count,
    )
    db.execute(
        stmt.on_conflict_do_update(
            index_elements=[LessonCompletion.child_id, LessonCompletion.lesson_id],
            set_={
                "times_completed": LessonCompletion.times_completed + 1,
                "first_try_correct": stmt.excluded.first_try_correct,
                "question_count": stmt.excluded.question_count,
                "updated_at": func.now(),
            },
        )
    )
    db.commit()
