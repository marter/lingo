from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.child import Child


class Parent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """The only kind of account. Kids are `Child` profiles owned by a parent."""

    __tablename__ = "parents"

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Null until the parent clicks the link in their verification email.
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # 4-digit PIN guarding the parent area on shared devices (bcrypt, like passwords).
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pin_failed_attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    pin_locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    children: Mapped[list[Child]] = relationship(
        order_by=Child.created_at, cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def has_pin(self) -> bool:
        return self.pin_hash is not None
