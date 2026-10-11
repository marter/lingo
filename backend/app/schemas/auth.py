from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegistrationStatus(BaseModel):
    open: bool


class LoginResponse(BaseModel):
    """A password login gets both: the device keeps `family_token`, and `parent_token`
    opens the parent area right away without asking for the PIN."""

    family_token: str
    parent_token: str


class TokenResponse(BaseModel):
    token: str


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
