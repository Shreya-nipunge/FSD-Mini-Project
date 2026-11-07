# CrimeMap Project Audit and Migration Plan

**Scope:** Milestone 1 inspection only. No application code, dependencies, data, or existing documentation have been changed as part of the audit.

## Existing architecture

The repository is a single project with two application directories:

- `frontend/` is a React 18 single-page application built with Vite. It uses React Router, Tailwind CSS, Axios, Recharts, Lucide icons, and Google Maps components.
- `backend/` is a Python FastAPI application. It serves JSON APIs, local static evidence uploads, and crime analytics generated from CSV data.
- `backend/data/raw/`, `backend/data/processed/`, `backend/data/uploads/`, and `backend/db/` hold source datasets, generated datasets, admin-uploaded CSVs, and example JSON persistence files. `backend/uploads/` is the intended runtime evidence directory.
- `assets/` contains project screenshots. The repository root holds the README, environment example, and ignore rules.

The frontend uses Axios through `frontend/src/services/api.js`. Vite loads the root `.env` and proxies `/api` and `/uploads` to FastAPI on port 8000 during development. The frontend defaults to same-origin API requests unless `VITE_API_URL` is set.

## Existing technologies and configuration

| Area | Current implementation |
|---|---|
| Frontend | React 18, JavaScript/JSX, Vite, Tailwind CSS, React Router, Axios, Recharts, Google Maps, Lucide |
| Backend | Python, FastAPI, Uvicorn, Pydantic, Pandas, python-multipart |
| Authentication | JWT (`PyJWT`) and Passlib password hashing (configured as PBKDF2-SHA256); local JSON user store |
| Complaint storage | Local JSON file, with evidence images saved to disk |
| Analytics source | CSV files for national/state/district crime data; processed per-state CSVs and district coordinate JSON |
| External integration | NewsAPI-backed news service; Google Maps JavaScript API in browser |
| Configuration | Root `.env.example`; Vite `envDir` points to project root; `.gitignore` excludes env files and runtime JSON stores |

No PostgreSQL, Sequelize, Express, backend npm package, or database migration system exists yet. There is no `frontend/src/context/` or central React authentication provider. Authentication is currently stored in `localStorage` and read directly by pages, layouts, and a protected-route component.

## Existing features

### Crime intelligence and visualization

- National, state, and district crime data loading and processing from CSV, with district coordinates.
- Map page with Google Maps, crime markers/density, district details, complaint overlays, and map filters.
- Crime summary KPIs, category distributions, trends, hotspots, state benchmarks, safety scores, and decision-support insights.
- Admin CSV upload flow that processes a state's dataset and refreshes the in-memory analytics cache.

### Citizen reports and administration

- Separate user and admin login/registration screens and role-aware navigation.
- JWT-protected user report submission and personal report history.
- Report submission includes location, crime category, description, optional evidence image, and a description-sharing preference.
- Public complaint listing applies a rejected-report privacy filter; individual users can view their own history.
- Admin complaint queue supports review, verification, rejection with a reason, and displays responsiveness/under-reporting metrics.
- Complaint statuses include `UNVERIFIED`, `UNDER_REVIEW`, `VERIFIED`, and `REJECTED` (with some legacy status aliases).

### News and presentation

- News panel and dedicated news page use a backend service with severity/source scoring and caching.
- Landing page, role selection, dashboard/admin layouts, reusable charts/cards/filters, and supplied screenshot assets establish the existing visual identity.
- Loading/error states are present in several data-driven views, though consistency should be checked during integration.

## Existing backend API surface

The current frontend depends on these FastAPI routes (all under `/api`, except news mounted at `/news`):

- Analytics: `GET /crimes`, `/summary`, `/by-type`, `/trend`, `/hotspots`, `/safety-score`, `/admin/insights`, `/analytics/insights`, `/analytics/benchmarks`, `/states`.
- Auth: `POST /register-user`, `/login-user`, `/register-admin`, `/login-admin`.
- Reports: `POST /complaints`, `GET /complaints`, `GET /my-complaints`, and `PATCH /complaints/:id/review|verify|reject`.
- Dataset management: `POST /upload-csv`.
- News: `GET /news?q=...`.

The requested REST API's `/api/auth/*`, `/api/crimes/*`, and `/api/analytics/*` endpoints do not match these legacy paths or data shapes. The implementation must deliberately preserve the dashboard's required endpoints and translate the legacy frontend contract as appropriate, while adding the requested CRUD API. Report data is currently called “complaints” in code and includes workflow, evidence, and privacy fields beyond the proposed generic crime model.

## Data and storage findings

- Analytics data is primarily pre-existing CSV data, not individual incident records. It is aggregated by district/year and currently read through Pandas-based processing. Converting those tables into one generic `Crime` model would lose the distinction between published aggregate statistics and citizen-submitted reports.
- User and complaint records are written to JSON runtime files. The checked-in files are examples (`auth_db.example.json`, `complaints_db.example.json`); actual JSON databases are excluded by `.gitignore`.
- Evidence files are stored on the local filesystem and their URL is currently assembled using a localhost URL. The Express replacement will need a deployment-safe URL strategy and upload validation.
- The proposed PostgreSQL migration should model accounts and citizen reports relationally, while preserving the CSV analytical dataset pipeline and its current outputs unless a verified conversion path is designed. Do not automatically import or delete CSV data as part of schema synchronization.
- An existing `backend/data/uploads/` CSV appears in the checkout. Retain it as project data unless a later explicit cleanup is approved.

## Features to retain

- Existing React pages, layouts, styles, map and marker behavior, chart components, filters, news UI, and role-specific flows.
- CSV-based official crime analytics, district coordinate data, processing logic, and the upload-to-refresh workflow.
- Complaint lifecycle, ownership, evidence, privacy preference, public visibility filtering, and admin review insights.
- Existing API service boundary and Axios usage, updating endpoint paths and response adapters rather than spreading requests through components.
- News scoring/caching behavior and Google Maps integration (with keys supplied by environment configuration).

## Features requiring modification

- Replace FastAPI route/middleware startup with Express and configure CORS for explicit frontend origins.
- Replace JSON user/report persistence with Sequelize/PostgreSQL models; retain compatibility fields and workflow semantics.
- Replace auth hashing/token code with bcrypt and JWT; consolidate user/admin authentication into a shared auth service while preserving role-based access. Admin privileges must be enforced server-side.
- Adapt the Axios API service and Vite proxy to the Express endpoint contract. Maintain existing analytics routes/response shapes or add an explicit compatibility layer.
- Protect admin status changes and CSV upload with authentication and role middleware; protect user-owned report history and report creation.
- Configure evidence upload/static serving without localhost URLs; validate file type/size and avoid exposing reporter PII on public endpoints.
- Add centralized request logging, validation, not-found handling, and consistent JSON error responses.
- Add React authentication context and route guard integration, keeping current role-specific forms and visual styling.
- Update README and environment examples to reflect npm/Express/PostgreSQL setup and deployment.

## Features requiring replacement

- FastAPI/Uvicorn as the primary backend runtime and Python JSON-file auth/report persistence.
- Passlib/PBKDF2 password handling for application accounts, replaced by bcrypt as required.
- JSON-file CRUD persistence for users/reports, replaced by PostgreSQL through Sequelize.

Python/Pandas dataset processing is not inherently replaced by the requested stack migration if preserving the currently useful official CSV analytics is necessary. The migration plan should avoid introducing Python as a new primary service; the current processing code may be ported to Node only if its outputs can be matched and verified, otherwise the existing data outputs should remain usable as static analytics inputs.

## Proposed final architecture

```text
Browser (React + Vite)
  ├── React Router pages and existing dashboard components
  ├── Auth Context + protected user/admin routes
  └── Axios API service (VITE_API_URL)
          │ JSON REST / multipart uploads, CORS
          ▼
Express API (server/)
  ├── routes → controllers → services
  ├── validation, JWT auth/role checks, morgan, centralized errors
  ├── Sequelize models: User, CrimeReport (and status/audit fields as needed)
  ├── PostgreSQL (DATABASE_URL or discrete PG environment variables)
  ├── Existing CSV analytics and district coordinate data adapter
  └── Validated evidence uploads/static path (deployment-configured)
```

Use safe Sequelize synchronization or migrations that create/update schema without dropping tables. Seed only clearly identified demonstration records and make seeding repeatable. Keep official aggregate CSV analytics separate from citizen-submitted incident reports. Express should preserve the existing analytics and news contracts needed by the current screens while exposing the requested REST auth, report CRUD, and analytics endpoints. Deploy the static frontend to Vercel and the API to Render with PostgreSQL and HTTPS/TLS configured by the hosting platform.

## Milestone plan after approval

1. **Milestone 1 (this audit):** Document current state and migration plan. No migration changes made.
2. **Milestone 2:** Add the `server/` Express application, configuration, middleware, health endpoint, environment template updates, and PostgreSQL connection setup.
3. **Milestone 3:** Add Sequelize user/report models, associations, safe schema strategy, and repeatable demonstration seed data.
4. **Milestone 4:** Implement validated authentication and protected report CRUD while preserving citizen/admin workflow rules.
5. **Milestone 5:** Implement analytics endpoints and adapt the current CSV analytics/news integration for existing UI needs.
6. **Milestone 6:** Update frontend API/auth integration with Context, protected routing, and explicit loading/error/empty states while retaining current screens.
7. **Milestone 7:** Add separate, small Node.js syllabus demonstrations (including a raw HTTP server) without using them as the main app server.
8. **Milestone 8:** Run the requested checks where the local database/tooling permits, resolve issues, and complete README and syllabus-coverage documentation with evidence-based statuses.

At each milestone, report changed files, implementation, verification results, and remaining issues. The next milestone begins only after the user approves the completed milestone.

## Audit limitations

This is a source and configuration inspection. No backend/frontend runtime, PostgreSQL connection, external NewsAPI request, or Google Maps key was available or exercised during this milestone. The README currently describes FastAPI and JSON storage, as expected for the pre-migration application.
