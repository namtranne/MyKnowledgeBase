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
| GET    | `/api/checklist`                    | JWT  | All item states, grouped by category |
| PUT    | `/api/checklist/item/:itemId`       | JWT  | `{ categoryId, checked?, answer? }` upsert one item |
| DELETE | `/api/checklist/category/:catId`    | JWT  | Reset a category's progress |

Send the token as `Authorization: Bearer <token>`.

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
