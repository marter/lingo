from pydantic import BaseModel, Field, model_validator

from app.services.progress import LessonState


class WordRead(BaseModel):
    id: str
    es: str
    en: str
    emoji: str


class LessonSummary(BaseModel):
    id: str
    title: str
    word_count: int
    state: LessonState


class UnitRead(BaseModel):
    id: str
    title: str
    emoji: str
    lessons: list[LessonSummary]


class CourseRead(BaseModel):
    units: list[UnitRead]


class LessonRead(BaseModel):
    id: str
    title: str
    unit_id: str
    unit_title: str
    words: list[WordRead]
    completed: bool


class LessonResult(BaseModel):
    """Sent when a kid finishes a lesson. Wrong answers come back until right, so
    every question is eventually answered; this counts the ones right the first time."""

    first_try_correct: int = Field(ge=0, le=100)
    question_count: int = Field(ge=1, le=100)

    @model_validator(mode="after")
    def _within_count(self) -> "LessonResult":
        if self.first_try_correct > self.question_count:
            raise ValueError("first_try_correct can't be more than question_count")
        return self
