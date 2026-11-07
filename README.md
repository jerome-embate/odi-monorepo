# Workshop Bookings

Book customers into workshop service bays without ever double-booking a bay.

- `backend/`: Laravel 12 API (API-only, SQLite, Pest)
- `frontend/`: Next.js 16 App Router (TypeScript), which talks to the API server-side only

## Prerequisites

- PHP ≥ 8.2 and Composer
- Node ≥ 20 and npm
- `make`: preinstalled on macOS (with the Xcode Command Line Tools) and Linux. On Windows, use WSL.

If `php` on your PATH is older than 8.2, pass the binary explicitly, for example `make setup PHP=/opt/homebrew/opt/php@8.3/bin/php` (the same works for every target).

## Quickstart

```bash
make setup   # checks versions, installs deps, creates .env + key, SQLite DB (50 seeded bookings), frontend/.env.local
make dev     # API on http://127.0.0.1:8000, web on http://localhost:3000
```

Open http://localhost:3000/bookings.

To review the production build (prerendered shells and caching behave differently from `next dev`), stop `make dev` and run `make prod` instead. It uses the same ports.

## Docker

Needs only Docker (with Compose v2), no local PHP or Node.

```bash
make docker-up      # or: docker compose up -d --build
```

Open http://localhost:3000/bookings. The API is also published on http://localhost:8000.

- `backend`: Laravel on FrankenPHP (PHP 8.4). The SQLite file is in the `sqlite-data` named volume, so data survives restarts and rebuilds. The first start migrates and seeds; later starts only migrate.
- `frontend`: Next.js standalone server. It reaches the API at `http://backend:8000` over the compose network (`API_URL`). The browser never calls Laravel directly.
- `APP_KEY` is generated on first start and kept in the volume. Set `APP_KEY` in a root `.env` to supply your own. `API_PORT` and `WEB_PORT` change the host ports.
- `make docker-logs` tails both services. `make docker-fresh` deletes the volume and reseeds. `make docker-down` stops the stack and keeps the data.

`make docker-up` uses the same ports as `make dev`/`make prod`, so run only one of them at a time.

## Commands

| Command | What it does |
|---|---|
| `make setup` | Version checks, composer/npm install, `.env` + app key, SQLite file, migrate --seed, `frontend/.env.local`. Safe to re-run |
| `make dev` | API (`:8000`) and `next dev` (`:3000`) in parallel |
| `make prod` | `next build`, then the API (`:8000`) and `next start` (`:3000`) in parallel |
| `make test` | Backend Pest suite, plus frontend unit tests (`node:test`), `tsc --noEmit` and ESLint |
| `make test-api` | Backend Pest suite only |
| `make lint` | Pint (check mode) + `tsc --noEmit` + ESLint |
| `make fresh` | `migrate:fresh --seed` (resets the data) |
