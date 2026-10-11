from pydantic import BaseModel


class WordRead(BaseModel):
    id: str
    es: str
    en: str
    emoji: str


class LessonSummary(BaseModel):
    id: str
    title: str
    word_count: int


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
