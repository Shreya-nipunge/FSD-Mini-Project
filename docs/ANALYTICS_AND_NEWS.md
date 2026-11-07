# Express analytics and news API

The Express API serves the migrated analytics and NewsAPI endpoints used by the React frontend. The retained FastAPI service is still responsible for the administrator CSV upload workflow at `/api/upload-csv`.

## Data sources and calculations

Official aggregated statistics are read from `backend/data/processed/<state-lowercase>_crimes_processed.csv`; district coordinates and supported state names come from `backend/data/district_coords.json`. The raw source remains in `backend/data/raw/`. Analytics rows are never inserted into Sequelize `CrimeReport` records. Citizen reports are queried separately only for the legacy map responsiveness and gap insight enrichments.

Processed columns are `district`, `year`, `lat`, `lng`, `murder`, `robbery`, `thefts`, `vehicle_theft`, `burglary`, `cheating`, `rape`, and `crime_score`. CSVs and coordinates are read by paths resolved from the module location and cached by modification time and size. The crime score remains the Python processor's weighted calculation: murder×5 + robbery×4 + vehicle theft×3 + thefts×2 + burglary×3 + cheating×2 + rape×5.

## Endpoints

All routes are mounted under `/api`:

| Endpoint | Response contract |
|---|---|
| `GET /api/states` | `{ states: string[], total: number }` |
| `GET /api/crimes` | `{ data: object[], total: number }`; supports `state`, `region`, `crime_type`, `year`, `view_mode` (`micro` or `macro`) |
| `GET /api/summary` | `{ total_incidents, top_crime, hottest_zone, under_investigation }` |
| `GET /api/by-type` | `{ labels: string[], values: number[] }` |
| `GET /api/trend` | array of `{ month, count }` |
| `GET /api/hotspots` | array of `{ rank, area, station, count, primary_crime }` |
| `GET /api/safety-score` | district score object with score, risk, rank, trend and state comparison |
| `GET /api/admin/insights` | `{ rising_crimes, auto_insight }` |
| `GET /api/analytics/insights` | `{ insights, gap_alerts }` |
| `GET /api/analytics/benchmarks` | array of state benchmark objects |
| `GET /api/news?q=...` | `{ status, query, articles, count }`; articles retain title, description, url, image, source, publishedAt, severity, confidence and location_hint |

Analytics endpoints accept the legacy state/year filters where applicable. Invalid query parameters return HTTP 400 with the shared validation error response. Missing or malformed dataset files return a safe HTTP 503 error.

The benchmark and insight objects retain their legacy nested fields; their detailed calculations are ported from `backend/app/analytics.py` and `backend/app/main.py`. Empty safety-score results preserve the legacy empty result behavior.

## News provider

News is provided by NewsAPI (`https://newsapi.org/v2/everything`). Configure `NEWS_API_KEY` in the backend environment; the key is never sent to the browser. Search text is normalized and validated, results are cached for five minutes, and provider/rate-limit failures return an error response with an empty `articles` array. No fabricated articles are returned. The response uses the existing frontend article fields and the legacy crime-source filtering and severity/confidence hints.

`NEWS_API_KEY` is already listed in the root `.env.example`; set a real key only in the ignored local `.env` or deployment environment.

## Run and verify

For local development, install dependencies and start Express from PowerShell. For backend tests or commands that can write to PostgreSQL, select the isolated local environment explicitly; do not let the root `.env` select the shared Supabase database:

```powershell
Set-Location server
npm.cmd install
$env:ENV_FILE = (Resolve-Path ..\.env.local).Path
npm.cmd run dev
npm.cmd test
```

The Express API defaults to loopback port 5000. Analytics tests use checked-in processed CSVs and temporary fixtures. News tests mock provider responses and do not make paid external requests. Database integration tests enforce the isolated `127.0.0.1/crimemap_admin_dev` target and clean up generated records.

The legacy `POST /api/upload-csv` workflow remains implemented in FastAPI. It requires multipart fields `file` and `state`, an Express-issued bearer token whose current database role is administrator, UTF-8 CSV containing year/state/district plus a supported crime-count field, and a file no larger than 10 MB. Inputs are written under `backend/data/uploads` with generated filenames, processed into the selected state's `backend/data/processed/<state>_crimes_processed.csv`, merged by district/year, and removed from the upload directory afterward. This processing writes files, not PostgreSQL rows. The admin UI reports the response `status` field. The live synthetic verification used temporary upload and processed directories; real datasets were not overwritten. Other listed analytics and news routes are served by Express.
