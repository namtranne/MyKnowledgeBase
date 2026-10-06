# Knowledge Base — API server

NestJS + PostgreSQL backend that provides:

- **Auth** — email/password signup & login with hashed passwords (bcrypt) and JWT tokens.
- **Checklist storage** — per-user check state and written answers for every interview
  checklist item.

## Endpoints

| Method | Path                                | Auth | Description |
| ------ | ----------------------------------- | ---- | ----------- |
| POST   | `/api/auth/signup`                  | –    | `{ email, password, displayName? }` → `{ token, user }` |
| POST   | `/api/auth/login`                   | –    | `{ email, password }` → `{ token, user }` |
| GET    | `/api/auth/me`                      | JWT  | Current user |
| GET    | `/api/health`                       | –    | Keep-alive / uptime check |
| GET    | `/api/checklist`                    | JWT  | All item states, grouped by category |
| PUT    | `/api/checklist/item/:itemId`       | JWT  | `{ categoryId, checked?, answer? }` upsert one item |
| DELETE | `/api/checklist/category/:catId`    | JWT  | Reset a category's progress |
| POST   | `/api/interview/resume`             | JWT  | multipart `file` (PDF/DOCX) → `{ text }` |
| POST   | `/api/interview`                    | JWT  | `{ role, level, interviewType, durationMin, resumeText }` → first question |
| POST   | `/api/interview/:id/answer`         | JWT  | `{ answer }` → next question, or `{ ended, result }` |
| POST   | `/api/interview/:id/finish`         | JWT  | End early → evaluation (`passProbability`, per-answer feedback) |
| GET    | `/api/interview/:id`                | JWT  | Full session: transcript + result |
| GET    | `/api/interview`                    | JWT  | List the user's past interviews |

Send the token as `Authorization: Bearer <token>`.

`interviewType` is one of `technical`, `live-coding`, `system-design`, `behavioural`, `mixed`; `durationMin` is `15`, `30`, or `45`.

## AI (mock interview)

The interview feature calls the Anthropic API. Set these env vars:

- `ANTHROPIC_API_KEY` — from https://console.anthropic.com/
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-5`; set to whatever model your account supports.

## Run locally (Docker — recommended)

```bash
cd server
cp .env.example .env          # edit JWT_SECRET
docker compose up --build
```

This starts Postgres + the API (which runs migrations automatically) on
`http://localhost:3001/api`.

## Run locally (without Docker)

Requires Node 20+ and a running Postgres.

```bash
cd server
cp .env.example .env          # point DATABASE_URL at your Postgres, set JWT_SECRET
npm install
npx prisma migrate dev --name init   # creates tables
npm run start:dev
```

## Deploying

The `Dockerfile` produces a self-contained image. On a host like Railway, Render,
or Fly.io:

1. Provision a Postgres database and copy its connection string.
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (your site's URL), `PORT`.
3. Deploy the image. The entrypoint runs `prisma migrate deploy` on boot, so the
   schema is applied automatically.

> **Note:** the frontend is currently a static GitHub Pages site. GitHub Pages
> can't run a server, so host this API separately and point the frontend at it
> via `VITE_API_URL` (see the site README).

## First migration

If you haven't generated a migration yet (the `prisma/migrations` folder is
empty), create one once against a running database:

```bash
npx prisma migrate dev --name init
```

Commit the generated `prisma/migrations/` folder so `migrate deploy` can apply it
in production.
