import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

# Kids pick one of these instead of uploading a photo.
AVATARS = ("🦊", "🐼", "🐯", "🐸", "🐙", "🦄", "🐨", "🐵", "🦁", "🐰", "🐢", "🐳")


class AgeBand(StrEnum):
    AGES_7_9 = "7-9"
    AGES_10_12 = "10-12"
    AGES_13_PLUS = "13+"


class Child(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A kid's profile. Deliberately minimal: no name, email, birthday or photo."""

    __tablename__ = "children"

    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("parents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nickname: Mapped[str] = mapped_column(String(20), nullable=False)
    avatar: Mapped[str] = mapped_column(String(8), nullable=False)
    age_band: Mapped[AgeBand] = mapped_column(
        Enum(AgeBand, name="age_band", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
