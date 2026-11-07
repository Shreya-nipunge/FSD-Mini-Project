# CrimeMap

CrimeMap is a full-stack crime analytics and citizen reporting application. It combines official CSV-based crime statistics with a separate, authenticated citizen report workflow and geospatial visualization.

## Problem and objectives

Official district-level crime statistics, citizen-submitted reports, and geographic context are often presented in separate tools. CrimeMap brings those distinct sources into one interface so users can explore regional patterns, understand hotspots, and submit reports while administrators review them.

The project objectives are to visualize official crime aggregates and citizen reports separately, provide map and chart-based analytics, support authenticated report review, protect report evidence and reporter privacy, and demonstrate a React/Express/PostgreSQL full-stack application.

## Features

- Explore official crime statistics by state, district, crime type, and year.
- View summary analytics, trends, hotspots, safety scores, and administrative insights.
- Use Leaflet and OpenStreetMap maps with district markers, hotspot navigation, and marker clustering.
- Search and reverse-geocode locations using Photon.
- Submit and track citizen reports with optional image evidence and description privacy controls.
- Review, verify, and reject reports through administrator workflows.
- Browse crime news through the backend NewsAPI integration.
- Upload updated analytics CSVs through the retained FastAPI endpoint.

## Technology and architecture

| Area | Current implementation |
|---|---|
| Frontend | React 18, Vite, JavaScript, React Router, Axios, Tailwind CSS, Recharts |
| Maps and geocoding | Leaflet, React Leaflet, OpenStreetMap tiles, Photon API |
| Main API | Node.js, Express, REST endpoints |
| Database | PostgreSQL through Sequelize; migrations are explicit |
| Authentication | bcrypt password hashes and JWT bearer tokens; role checks use the current database user |
| Evidence | Express validates images and stores metadata with reports; the Express evidence route checks report ownership or admin role |
| Legacy service | FastAPI remains for `POST /api/upload-csv`; public static uploads are disabled |

Official CSV analytics remain separate from citizen-submitted reports. The Express analytics service reads the existing datasets under `backend/data`; it does not insert aggregated rows into the citizen reports table.

The project has not been deployed as part of the map migration. Production hosting, HTTPS, CORS origins, and public environment variables must be configured for the chosen host before deployment.

## Repository layout

```text
frontend/                 React/Vite application
server/                   Express API, Sequelize models, migrations, tests
backend/                  Legacy FastAPI service, CSV datasets, legacy uploads
docs/                     Architecture, API, audit, and migration documentation
```

The retained FastAPI application is under `backend/app/`. Its remaining administrator CSV upload route processes CSV files into the existing per-state analytics outputs; it is not the primary auth, report, analytics, or news API.

## Requirements

- Node.js 18 or newer and npm.
- PostgreSQL for the Express API.
- Python 3.10 or newer only when running the legacy FastAPI CSV upload service.
- A NewsAPI key for live news results. The map does not require a Google key or paid mapping account.

## Configuration

Use the ignored root `.env.local` for isolated development configuration. Keep `.env` and `.env.local` private and do not commit them. The root `.env` may point to a shared/remote database; do not run migrations, seeds, or integration tests with it.

Main Express variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` or `PG_HOST`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD` | PostgreSQL connection |
| `PG_SSL` | Enable PostgreSQL TLS where required |
| `JWT_SECRET` | Signing key for API access tokens |
| `PORT` | Express port; defaults to `5000` |
| `HOST` | Express bind address; defaults to loopback (`127.0.0.1`). Set explicitly for the deployment platform, commonly `0.0.0.0`. |
| `CLIENT_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `NEWS_API_KEY` | Backend-only NewsAPI key |
| `DEMO_USER_PASSWORD`, `DEMO_ADMIN_PASSWORD` | Locally chosen seed passwords; never published by the application |

The current isolated database is configured in `.env.local` with loopback host `127.0.0.1` and database `crimemap_admin_dev`. The seed and database integration test suite refuse to write unless that exact isolated target is active.

Frontend variables use the `VITE_` prefix because Vite exposes them to the browser:

- `VITE_API_URL` is optional; in local development the default Vite proxy sends `/api` requests to Express on port 5000.
- `VITE_LEGACY_API_URL` is required for CSV upload when the frontend runs in production, where the Vite development proxy is unavailable. In local development `/api/upload-csv` is proxied to FastAPI on port 8000.

No database password, JWT secret, NewsAPI key, or Supabase service key belongs in a `VITE_` variable.

## Local setup

### Express API

In one terminal:

```bash
cd server
npm install
```

In PowerShell, select the isolated environment before database or server commands:

```powershell
$env:ENV_FILE = (Resolve-Path ..\.env.local).Path
npm run db:migrate
npm run dev
```

The API listens on `http://127.0.0.1:5000` by default. `GET /api/health` is the health check. The migration command applies explicit migrations and does not use destructive Sequelize synchronization. Set `HOST` explicitly when deploying to a platform that requires a non-loopback bind address.

To seed deterministic demonstration records in a database you control:

```powershell
$env:ENV_FILE = (Resolve-Path ..\.env.local).Path
npm run db:seed
```

The seed refuses all targets except `127.0.0.1/crimemap_admin_dev`. Set `DEMO_USER_PASSWORD` and `DEMO_ADMIN_PASSWORD` in `.env.local` first. It uses `findOrCreate`; it does not change passwords on existing records.

### React frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the frontend at `http://localhost:5173` and proxies the migrated `/api` requests to Express. The map displays OpenStreetMap attribution. Photon search is debounced and uses its public service; availability and rate limits depend on that service.

### Legacy CSV upload service

The CSV upload endpoint has not been migrated to Express. For local use, in a third terminal:

```bash
cd backend
python -m venv .venv
# Activate .venv, then:
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The admin upload UI sends an Express JWT to FastAPI. CSV upload requires the FastAPI service and the matching JWT configuration. Express is still the backend for authentication, reports, analytics, and news.

#### FastAPI security status

The retained FastAPI service has these implemented security changes, covered by the focused security and CSV suite (34 tests):

- Administrator self-registration is disabled.
- Legacy report review, verification, rejection, and rejected-report listing require administrator authorization validated through Express.
- FastAPI delegates token identity and current role validation to Express; it does not grant access from a JWT role claim alone.
- Missing or weak `JWT_SECRET` configuration fails closed.
- The public static uploads mount has been removed. Evidence remains available through the authenticated Express evidence endpoint.
- CSV uploads use generated filenames, strict CSV/state validation, resolved-path containment checks, row/column validation, and a 10 MB size cap. Temporary input files are removed after processing.
- CORS uses an explicit `CLIENT_ORIGIN` allowlist and rejects wildcard origins.

The FastAPI security and CSV suite passed 34 tests. Local live checks confirmed the isolated Express database connection, local demo admin and citizen login, invalid credentials, `/api/auth/me`, admin-vs-user authorization, report validation and synthetic report cleanup, plus analytics endpoints. A synthetic CSV upload was sent through a temporary Vite proxy using a real Express-issued admin token; FastAPI validated the current account through Express, processed one synthetic row into a temporary output directory, and rejected invalid schema/rows, unsafe paths, oversized input, missing authentication, and citizen authorization. The occupied default FastAPI port was left untouched; this test used loopback port 8001. No shared datasets or database records were modified. Cross-user evidence was covered by Express tests but was not exercised in a browser; legacy FastAPI review/verify/reject operations were not live-tested.

The local isolated demo administrator is `demo.admin@example.test` with database role `admin` and administrative role `System Admin`; the password is configured only in ignored `.env.local` and is intentionally not documented here. Express login and the token’s use by FastAPI were verified. The proposed `admin@crimemap.local` account is not present. Browser-based dashboard redirection was not verified because browser automation was unavailable.

Before public deployment, configure a strong shared `JWT_SECRET`, an explicit production `CLIENT_ORIGIN`, and HTTPS for remote FastAPI-to-Express communication. Configure the Express `HOST` and platform `PORT` intentionally, place both services behind the intended network boundary, and complete browser-based report/evidence/admin-flow verification. HTTPS termination and deployment settings have not been verified here.

## Tests and build

```powershell
npm test --prefix frontend
npm run build --prefix frontend
```

Run backend tests from `server/` with the isolated environment explicitly selected:

```powershell
Set-Location server
$env:ENV_FILE = (Resolve-Path ..\.env.local).Path
npm.cmd test
Set-Location ..
python -m pytest backend/tests/test_fastapi_security.py -q -p no:cacheprovider
```

The integration suite verifies the database target before writing, creates synthetic test accounts/reports and temporary evidence files, then cleans up only records and files created by the tests. It does not reset tables or target deterministic demo records. FastAPI security tests use mocked service responses and temporary files; they do not connect to PostgreSQL or modify analytics datasets.

## API and project documentation

- [Frontend integration and legacy upload configuration](./docs/FRONTEND_EXPRESS_INTEGRATION.md)
- [Analytics and news endpoints, datasets, and response contracts](./docs/ANALYTICS_AND_NEWS.md)
- [Project audit](./docs/PROJECT_AUDIT.md)
- [Map migration report and verification checklist](./docs/MAP_MIGRATION_REPORT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Academic project report](./docs/PROJECT_REPORT.md)
- [Testing report](./docs/TESTING_REPORT.md)

Express routes are mounted under `/api`. They include authentication (`/auth/register`, `/auth/login`, `/auth/me`), reports (`/reports`), analytics (including `/crimes`, `/summary`, `/hotspots`, and `/states`), and news (`/news`). The report evidence endpoint requires bearer authentication. Detailed query parameters and compatibility routes are documented in the linked API notes.

The remaining FastAPI upload endpoint is `POST /api/upload-csv` with multipart fields `file` and `state`; in development Vite proxies only that route to port 8000. FastAPI validates administrators through Express and does not publish an `/uploads` static route.

## Performance review

Route-level screens are loaded lazily with a visible loading fallback. The latest production build reduced the largest initial JavaScript asset from about 1.38 MB to about 455 kB; analytics is emitted as a separate roughly 465 kB chunk. The large-chunk warning is gone. The build still reports stale Browserslist data; it was not updated during this task. Local analytics request timings were below 100 ms in the earlier smoke run; this is an observation, not a load test. A scoped override selects patched `uuid@11.1.1` for Sequelize. The server audit still flags nodemon’s minimatch 10.x dependency; patched minimatch 11 requires Node 20+, conflicting with documented Node 18 support.

## Scope and future work

CrimeMap supports demonstration and educational use. Official statistics are limited to the CSV datasets shipped with the project, and submitted reports are separate user-generated records. Public NewsAPI and Photon availability depends on their external services. Future work includes a verified deployment, production monitoring, richer data provenance, browser-based accessibility and end-to-end testing, and a compatible upstream release for nodemon’s minimatch dependency.

## Historical project credits

CrimeMap began as a React frontend with a FastAPI backend and JSON-based authentication/report storage. That original implementation is retained in the repository as migration history and as the remaining CSV upload service; the current primary authentication and report database is PostgreSQL.

Team CodeCrust: Shreya Nipunge, Kirtan Devadiga, Mayuri Gade, Shreya Dandekar, and Lata Choudhary.
