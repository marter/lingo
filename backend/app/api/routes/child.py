"""A kid's own session. Only ever sees that one child's data."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_child
from app.content import Course, Lesson, Unit, get_course
from app.core.db import get_db
from app.models.child import Child
from app.schemas.course import (
    CourseRead,
    LessonRead,
    LessonResult,
    LessonSummary,
    UnitRead,
    WordRead,
)
from app.schemas.family import ChildRead
from app.services import progress

router = APIRouter(prefix="/api/child", tags=["child"])

LOCKED_DETAIL = "Finish the earlier lessons first."


@router.get("/me", response_model=ChildRead)
def me(child: Child = Depends(get_child)) -> Child:
    return child


@router.get("/course", response_model=CourseRead)
def course(child: Child = Depends(get_child), db: Session = Depends(get_db)) -> CourseRead:
    full = get_course()
    states = progress.lesson_states(full, progress.completed_ids(db, child))
    return CourseRead(
        units=[
            UnitRead(
                id=unit.id,
                title=unit.title,
                emoji=unit.emoji,
                lessons=[
                    LessonSummary(
                        id=lesson.id,
                        title=lesson.title,
                        word_count=len(lesson.words),
                        state=states[lesson.id],
                    )
                    for lesson in unit.lessons
                ],
            )
            for unit in full.units
        ]
    )


def _find(full: Course, lesson_id: str) -> tuple[Unit, Lesson]:
    found = full.lesson(lesson_id)
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return found


@router.get("/lessons/{lesson_id}", response_model=LessonRead)
def lesson(
    lesson_id: str, child: Child = Depends(get_child), db: Session = Depends(get_db)
) -> LessonRead:
    full = get_course()
    unit, found = _find(full, lesson_id)
    state = progress.lesson_states(full, progress.completed_ids(db, child))[found.id]
    if state is progress.LessonState.LOCKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=LOCKED_DETAIL)
    return LessonRead(
        id=found.id,
        title=found.title,
        unit_id=unit.id,
        unit_title=unit.title,
        words=[WordRead(**word.model_dump()) for word in found.words],
        completed=state is progress.LessonState.DONE,
    )


@router.post("/lessons/{lesson_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
def complete(
    lesson_id: str,
    result: LessonResult,
    child: Child = Depends(get_child),
    db: Session = Depends(get_db),
) -> None:
    full = get_course()
    _, found = _find(full, lesson_id)
    try:
        progress.record_completion(
            db, full, child, found.id, result.first_try_correct, result.question_count
        )
    except progress.LessonLocked as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=LOCKED_DETAIL) from exc
