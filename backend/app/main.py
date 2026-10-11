import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, child, family, parent
from app.content import get_course
from app.core.config import get_settings

# httpx logs full request URLs at INFO; keep them out of the logs.
for name in ("httpx", "httpcore"):
    logging.getLogger(name).setLevel(logging.WARNING)

settings = get_settings()

# Load the lesson content now, so a broken unit file stops the app at startup (and fails the
# deploy's healthcheck) instead of erroring when a kid opens a lesson.
get_course()

app = FastAPI(title="Lingo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(family.router)
app.include_router(parent.router)
app.include_router(child.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
