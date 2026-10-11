import uuid
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.models.child import AVATARS, AgeBand


def _known_avatar(value: str) -> str:
    if value not in AVATARS:
        raise ValueError("Pick one of the avatars")
    return value


Nickname = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
Avatar = Annotated[str, AfterValidator(_known_avatar)]
Pin = Annotated[str, Field(pattern=r"^\d{4}$")]


class ChildRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nickname: str
    avatar: str
    age_band: AgeBand


class ChildCreate(BaseModel):
    nickname: Nickname
    avatar: Avatar
    age_band: AgeBand


class ChildUpdate(BaseModel):
    nickname: Nickname | None = None
    avatar: Avatar | None = None
    age_band: AgeBand | None = None


class FamilyRead(BaseModel):
    """What the shared device sees: enough for the profile picker, and nothing private."""

    model_config = ConfigDict(from_attributes=True)

    has_pin: bool
    email_verified: bool
    children: list[ChildRead]


class ParentRead(FamilyRead):
    email: EmailStr


class PinRequest(BaseModel):
    pin: Pin


class Options(BaseModel):
    avatars: list[str]
    age_bands: list[AgeBand]
    max_children: int
