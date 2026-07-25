# Rental

Monorepo for the rental marketplace application: a React frontend and a Node.js API backend.

## Packages

| Directory | Description |
| --- | --- |
| [`rental-fe/`](./rental-fe) | React + Vite frontend (map search, listings, profiles) |
| [`rental-be/`](./rental-be) | Express + MongoDB backend API |

## Prerequisites

- Node.js 22.x (see `rental-be/.nvmrc`)
- npm 10.x
- MongoDB and Redis for local backend development
- Google Maps API key for map search (`rental-fe/.env.example`)

## Local development

### Backend

```bash
cd rental-be
cp .env.example .env
npm ci
npm run dev
```

### Frontend

```bash
cd rental-fe
cp .env.example .env
npm ci
npm run dev
```

The frontend dev server proxies API requests to the backend configured in `.env`.

## Testing

```bash
# Frontend unit tests
cd rental-fe && npm test

# Frontend E2E smoke (requires Chromium + Google Maps key)
cd rental-fe && npm run test:e2e:install && npm run test:e2e

# Backend tests
cd rental-be && npm test
```

## CI

GitHub Actions workflows in [`.github/workflows/`](./.github/workflows) run on push and pull request:

- **Frontend CI** — unit tests and production build (`rental-fe/`)
- **Backend CI** — contract validation, dependency audit, Docker build, tests (`rental-be/`)
- **E2E Smoke** — Playwright browser smoke (`rental-fe/e2e/`); skips when `VITE_GOOGLE_MAPS_API_KEY` secret is unset

Each package workflow runs only when files in that package change. E2E smoke also runs on every push to `main` that touches the frontend.

### Branch protection (recommended)

In GitHub **Settings → Branches → Add rule** for `main`:

1. Require a pull request before merging
2. Require status checks to pass:
   - `Validate frontend`
   - `Validate backend`
   - `Playwright smoke` (optional until `VITE_GOOGLE_MAPS_API_KEY` is configured)
3. Require branches to be up to date before merging

### GitHub secrets (optional, for E2E smoke)

Add in **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | Enables map-search Playwright smoke in CI |
| `VITE_GOOGLE_MAPS_MAP_ID` | Optional custom map style ID |

Repository: [github.com/nangliansing/rental](https://github.com/nangliansing/rental)
