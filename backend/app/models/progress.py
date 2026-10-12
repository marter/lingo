import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class LessonCompletion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One row per (kid, lesson) once it's been finished. `lesson_id` is a content id.

    created_at is the first finish, updated_at the latest; the score is the latest play's.
    """

    __tablename__ = "lesson_completions"
    __table_args__ = (UniqueConstraint("child_id", "lesson_id"),)

    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[str] = mapped_column(String(64), nullable=False)
    times_completed: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    first_try_correct: Mapped[int] = mapped_column(Integer, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
