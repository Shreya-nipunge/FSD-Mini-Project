# Milestone 6 Frontend Integration Audit

**Pre-implementation inspection.** This audit records the checked-in frontend and Express contracts before integration changes. The frontend is React 18/Vite/React Router/Axios; it uses a single API module, but auth state is currently read and written independently through `localStorage`.

## Existing frontend structure

- `frontend/src/App.jsx` defines public login/register pages, user dashboard routes, and admin dashboard routes.
- `frontend/src/components/ProtectedRoute.jsx` checks the presence of `token` and a browser-stored `role`; it does not validate/restore the token with the API and redirects to `/`.
- `frontend/src/layouts/DashboardLayout.jsx`, `Dashboard.jsx`, and `AdminUpload.jsx` read/write auth keys directly.
- User/admin auth forms call `frontend/src/services/api.js`; user registration currently expects a legacy token response. The AdminRegister form exposes role/organization fields, while Express intentionally rejects self-service admin registration.
- Report form and report pages use legacy `complaint(s)` names and fields (`crime_type`, `lat/lng`, `image_url`, `share_description`, `created_at`).
- Analytics pages, map/chart components, and news cards retain the existing design and consume API service functions.

## Current API service and Vite configuration

`frontend/src/services/api.js` centralizes Axios with base URL `${VITE_API_URL || ""}/api` and attaches `localStorage.token`. It currently targets legacy auth routes (`/login-user`, `/register-user`, `/login-admin`, `/register-admin`), complaint aliases, and an upload route. Its multipart request explicitly sets the `Content-Type` header, which risks an incorrect boundary.

`frontend/vite.config.js` proxies `/api` and `/uploads` to FastAPI at `127.0.0.1:8000`. The root `.env.example` has no `VITE_API_URL`; its Vite environment directory is the repository root.

## Express contracts inspected

### Authentication

- `POST /api/auth/register` accepts `{ name, email, password }`. It returns `{ success, data: { token, user }, access_token, token_type, role, name }` and assigns the normal user role.
- `POST /api/auth/login` accepts `{ email, password }` and returns the same shape; the authoritative role is in `data.user.role` (also in the compatibility `role` field).
- `GET /api/auth/me` requires bearer auth and returns `{ success, data: { user }, user }`.
- `POST /api/register-admin` explicitly returns 403; Express login supports legacy `/api/login-admin` and `/api/login-user` role-specific aliases.

### Reports and review

- Express supports both `/api/reports` and `/api/complaints` aliases. Create accepts multipart `image` or JSON; `category`/`crime_type`, `latitude`/`lat`, `longitude`/`lng`, `incidentDate`/`incident_date`, and `shareDescription`/`share_description` aliases are accepted.
- List responses contain `{ success, data: { reports, total }, reports, complaints, total }`; own list has the same shape. Report creation/get/update return a `report` object and nested `data.report`.
- Public report views omit reporter details and evidence metadata, hide rejected reports, and may hide descriptions according to `shareDescription`. Admin/own views include more fields. Both `evidence_url` and report metadata are returned only for non-public views.
- Review, verify, and reject are **PATCH** `/api/reports/:id/{review,verify,reject}` (also `/complaints` aliases), not POST. Rejection accepts `{ reason }` or `{ admin_notes }`.
- Evidence is streamed by authenticated `GET /api/reports/:id/evidence`; it is not exposed at `/uploads`.
- There is no separate list-evidence capability, no evidence update on `PATCH /reports/:id`, and no dedicated public detail endpoint that bypasses report visibility rules.

### Analytics and news

- Analytics routes are mounted at the exact legacy `/api` paths and preserve their documented output shapes. `getCrimes` responds `{ data, total }`; summary/by-type/trend/hotspots/safety/insight/benchmark/state response formats are the established legacy shapes.
- The frontend API module does not currently export `getInsights`, although `Dashboard.jsx` calls it. `getComplaints` accepts only `(state, status)` while `AdminComplaintsPage.jsx` passes a third `includeRejected` argument. `getCrimes` sends `gender`; existing API behavior does not implement that filter.
- Express news accepts `/api/news` and `/api/news/`; the frontend asks for `/api/news?q=...`. The article fields are compatible. Express intentionally returns HTTP error statuses for provider/key failures rather than FastAPI's HTTP 200 provider-error response.

### Upload and migration boundary

`AdminUpload.jsx` and `uploadDataset` expect FastAPI `POST /api/upload-csv`. That endpoint remains outside Express and will not be pointed at Express in this milestone. To keep it functional, Vite must route only `/api/upload-csv` to the legacy FastAPI service while routing migrated `/api` paths to Express. Its bearer token comes from the same browser storage. The upload API itself was not migrated or tested here.

## Integration requirements identified

1. Centralize token/user state in an AuthContext, restore it through `/api/auth/me`, and clear it on invalid/expired-token responses.
2. Keep the existing localStorage token key for compatibility, but treat the server-returned user as authoritative; browser role data is only display/navigation state.
3. Use a role-aware loading protected route and avoid login redirects until auth restoration completes.
4. Adapt legacy page field/response expectations in the Axios service; use Express report aliases and PATCH review routes.
5. Fetch evidence with Axios bearer auth and object URLs; revoke generated object URLs on replacement/unmount.
6. Route migrated endpoints to Express on port 5000, with only `/api/upload-csv` left on FastAPI port 8000.
7. Keep admin self-registration disabled and keep API/provider/database secrets out of `VITE_*` variables.
