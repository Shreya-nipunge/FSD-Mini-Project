# FastAPI CSV service on Render

This service exists to support the Admin Dashboard CSV upload at
`POST /api/upload-csv`. Express remains the authentication authority and
continues to serve login, reports, and analytics.

## Render web service

Create a Python web service from the repository with these settings:

| Setting | Value |
|---|---|
| Name | `crimemap-fastapi` |
| Branch | `main` |
| Region | Oregon (US West) |
| Root directory | `backend` |
| Runtime | Python 3 |
| Python version | `3.11.11` from `backend/.python-version` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |
| Instance | Free |

The `backend` directory is the service root, so `app.main:app` and
`requirements.txt` resolve correctly. FastAPI exposes both `/health` and
`/api/health` as unauthenticated liveness endpoints.

## FastAPI environment variables

Set these on the Render FastAPI service only. Do not copy the Express
environment wholesale or add database credentials.

| Variable | Purpose | Required? | Secret? | Production value / source |
|---|---|---:|---:|---|
| `JWT_SECRET` | Secure configuration gate; must match Express's HS256 signing secret. Actual token signature, active-account, and role checks are performed by Express `/api/auth/me`. | Yes | Yes | Enter the existing value from the Express Render service's environment settings. Do not generate a new value. |
| `EXPRESS_API_URL` | Base URL for the Express API used for current-user and login/register proxy requests. HTTPS is required for remote hosts. | Yes | No | `https://crimemap-api.onrender.com` |
| `CLIENT_ORIGIN` | Exact browser origin allowed by FastAPI CORS. | Yes | No | `https://crimemap-five.vercel.app` (no trailing slash) |
| `NEWS_API_KEY` | Enables the optional legacy FastAPI news endpoint. CSV upload does not require it. | No | Yes | If using that endpoint, retrieve it from the existing NewsAPI account/configuration; otherwise omit it. |

`PORT` is supplied by Render and must not be manually fixed. `ENV_FILE` is a
local-development override and is not needed in Render. The FastAPI service
does not use Supabase/PostgreSQL credentials.

## Authentication and upload path

1. Express issues an HS256 JWT with the user UUID in `sub` and stores the
   browser's current user/role in its database.
2. The Admin Dashboard sends that token as `Authorization: Bearer ...` to the
   FastAPI `POST /api/upload-csv` request, together with multipart fields
   `file` and `state`.
3. FastAPI forwards the bearer token to Express `GET /api/auth/me`. Express
   checks the HS256 signature and expiry, loads the active account, and
   returns its current database role. A citizen gets HTTP 403; missing or
   invalid credentials get HTTP 401.
4. FastAPI accepts CSVs up to 10 MiB, validates the selected state, schema,
   rows, and numeric counts, then processes valid data and removes the
   temporary incoming file. Errors returned to the client do not include
   stack traces or local paths.

## Vercel frontend

Set the following project environment variable for the Vercel deployment
environment(s) being used, then redeploy the frontend:

```text
VITE_LEGACY_API_URL=https://crimemap-fastapi.onrender.com
```

This is only for CSV upload. Keep the existing `VITE_API_URL` / same-origin
configuration used for Express unchanged. Vite's local development proxy is
not used by production builds.

## Storage limits

Uploads update a generated per-state CSV under `backend/data/processed` on the
running service. The temporary incoming file is deleted after processing.
Render Free has ephemeral storage: processed changes are lost on restart,
spin-down, or redeploy and revert to the files in the deployed commit. The API
must not be treated as a durable dataset store. No persistence service or
database migration is configured by this implementation. Preserve and review
the source dataset changes separately if an upload is intended to become
permanent.

CSV uploads are for demonstration processing confirmation. They do not need
to update Express analytics or either dashboard. The success message confirms
the selected CSV passed validation and processing on the FastAPI service.

## Deployment and smoke checks

1. Create the Render service using the settings above and add the required
   environment variables from the existing Express and Vercel deployments.
2. Deploy the repository's `main` branch. Confirm Render reports a successful
   deploy and `GET https://crimemap-fastapi.onrender.com/health` returns
   `{"status":"ok"}`.
3. In Render logs, verify startup completes without a traceback. Do not print
   or paste environment values into logs or support requests.
4. Set `VITE_LEGACY_API_URL` in Vercel and redeploy the frontend. Confirm the
   normal Express login, report, and analytics URLs remain unchanged.
5. Sign in to the deployed Admin Dashboard with an existing administrator,
   upload a small valid CSV for a supported state, and confirm the visible
   success message. Use a non-production synthetic file if possible.
6. Confirm a citizen cannot upload (403), no-token upload is rejected (401),
   and a browser request from the Vercel origin has the expected CORS response.

The local test suite validates these contracts but cannot prove Render
environment configuration, the hosted Express-to-FastAPI request, Vercel
browser behavior, or the production administrator's current database role.
