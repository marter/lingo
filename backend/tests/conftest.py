from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.db import Base, get_db
from app.main import app
from app.models import *  # noqa: F401,F403 (registers all models on Base.metadata)

# Tests run against a separate database on the same Postgres server as local dev.
TEST_DATABASE_URL = make_url(get_settings().database_url).set(database="lingo_test")


@pytest.fixture(scope="session")
def engine():
    admin = create_engine(TEST_DATABASE_URL.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DATABASE_URL.database},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{TEST_DATABASE_URL.database}"'))
    admin.dispose()

    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine) -> Generator[Session, None, None]:
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestSession()
    yield session
    session.close()
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def email_settings(monkeypatch: pytest.MonkeyPatch):
    """No real email in tests, and verification off unless a test opts in (`verification_on`)."""
    from app.services import email

    settings = get_settings()
    monkeypatch.setattr(settings, "email_backend", "memory")
    monkeypatch.setattr(settings, "email_verification_required", False)
    email.outbox.clear()
    yield
    email.outbox.clear()


@pytest.fixture
def verification_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "email_verification_required", True)


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register(client: TestClient, email: str = "pat@example.com") -> dict[str, str]:
    """Signs a parent up; returns {"family": headers, "parent": headers}."""
    response = client.post("/api/auth/register", json={"email": email, "password": "hunter22!"})
    assert response.status_code == 201, response.text
    body = response.json()
    return {"family": bearer(body["family_token"]), "parent": bearer(body["parent_token"])}


def add_child(client: TestClient, parent_headers: dict[str, str], nickname: str = "Sofi") -> str:
    response = client.post(
        "/api/parent/children",
        json={"nickname": nickname, "avatar": "🦊", "age_band": "7-9"},
        headers=parent_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]
