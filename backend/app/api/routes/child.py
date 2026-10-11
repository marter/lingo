"""A kid's own session. Only ever sees that one child's data."""

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_child
from app.content import get_course
from app.models.child import Child
from app.schemas.course import CourseRead, LessonRead, LessonSummary, UnitRead, WordRead
from app.schemas.family import ChildRead

router = APIRouter(prefix="/api/child", tags=["child"])


@router.get("/me", response_model=ChildRead)
def me(child: Child = Depends(get_child)) -> Child:
    return child


@router.get("/course", response_model=CourseRead)
def course(_: Child = Depends(get_child)) -> CourseRead:
    return CourseRead(
        units=[
            UnitRead(
                id=unit.id,
                title=unit.title,
                emoji=unit.emoji,
                lessons=[
                    LessonSummary(id=lesson.id, title=lesson.title, word_count=len(lesson.words))
                    for lesson in unit.lessons
                ],
            )
            for unit in get_course().units
        ]
    )


@router.get("/lessons/{lesson_id}", response_model=LessonRead)
def lesson(lesson_id: str, _: Child = Depends(get_child)) -> LessonRead:
    found = get_course().lesson(lesson_id)
    if found is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    unit, found_lesson = found
    return LessonRead(
        id=found_lesson.id,
        title=found_lesson.title,
        unit_id=unit.id,
        unit_title=unit.title,
        words=[WordRead(**word.model_dump()) for word in found_lesson.words],
    )
