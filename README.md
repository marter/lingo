# Lingo

Short, playful Spanish lessons for kids ages 7+, set up and watched over by their parents.
Live (soon) at `lingo.martinteran.me`.

## Privacy stance

A family app. Only a parent signs up, with an email address. Kids are profiles under the
parent with just a nickname, an emoji avatar and an age band: no names, emails, birthdays,
voices or locations. No ads, no trackers or third-party scripts (fonts are bundled), no
chat, nothing public. Parents can delete a child's data or the whole account at any time.
Keep it that way: new features must not collect more from kids.

## Accounts and devices

Three token scopes (`backend/app/core/security.py`), so a kid holding a parent's device
can't reach the parent area:

- **family**: stays on the device after a parent logs in. Lists the kids' nicknames and
  avatars, starts a kid's session, and checks the PIN. Nothing else.
- **parent**: the parent area (profiles, PIN). Comes from the password or the 4-digit PIN,
  lasts 30 minutes, and is kept in sessionStorage. The PIN locks for 15 minutes after 5
  wrong tries.
- **child**: one kid's session; only ever sees that kid's data.

A parent must confirm their email before adding kids. In dev, the confirmation email is
printed in the backend logs (`docker compose logs backend`).

## Stack

- **Backend**: FastAPI, SQLAlchemy 2, Alembic, Postgres 16, `uv`, ruff, mypy, pytest
- **Frontend**: React 19, TypeScript, Vite, TanStack Query, react-router, oxlint
- **Hosting**: the shared Lightsail server and Caddy (config in the fake-sportsbook repo)

## Local development

```sh
docker compose up        # db :5434, API :8002, app http://localhost:5175
```

Ports are offset from volunteer-scheduler and fake-sportsbook so all three can run at once.

Backend checks (tests use a `lingo_test` database on the dev Postgres, created automatically):

```sh
cd backend
uv sync
uv run ruff check . && uv run mypy app && uv run pytest
```

Frontend checks:

```sh
cd frontend
npm install
npm run lint && npm run build
```

## Deploying

Every change goes through a PR; merging to `main` runs CI and then `deploy/deploy.sh`
(see `deploy/README.md`).
