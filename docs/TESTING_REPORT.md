# CrimeMap Testing Report

Updated: 2026-11-07

## Test environment and safety

- Windows PowerShell, Node.js/npm, Python/pytest.
- Database-backed Express tests and live API smoke checks explicitly selected `.env.local`, targeting loopback PostgreSQL database `crimemap_admin_dev` (`127.0.0.1:5432`). No test used the remote Supabase configuration.
- Database baseline and post-test counts were users=3 and reports=3. The deterministic demo admin, demo citizen, and demo report remained present. Synthetic report records and uploaded test files were cleaned up by test code.
- No migrations, seed operations, password changes, role changes, truncations, or database resets were performed during final verification.
- FastAPI CSV processing does not write PostgreSQL rows; live upload verification redirected both its temporary upload and processed output directories to an OS temporary directory. The submitted row and all temporary files were removed afterward.
- Manual browser QA: PASS, as reported by the project owner. This agent session did not independently operate a browser; HTTP responses and automated tests are reported separately below.

## Automated test results

| Area | Command | Result |
|---|---|---|
| Frontend unit tests | `npm.cmd test --prefix frontend` | PASS, 21 tests, 0 failures |
| Express tests | From `server/`, set `$env:ENV_FILE = (Resolve-Path ..\.env.local).Path`, then `npm.cmd test` | PASS, 18 tests, 0 failures |
| FastAPI security and CSV tests | `python -m pytest backend/tests/test_fastapi_security.py -q -p no:cacheprovider` | PASS, 34 tests, 59 dependency/deprecation warnings |
| Frontend production build | `npm.cmd run build --prefix frontend` | PASS; Vite transformed the application and emitted the production bundle |
| Dependency tree | `npm.cmd ls --depth=0 --prefix frontend` and equivalent under `server` | PASS; dependencies resolve; React/React DOM remain 18.3.1 |
| Frontend dependency audit | `npm audit --omit=dev --prefix frontend` after compatible `npm audit fix --omit=dev` | PASS, 0 production vulnerabilities reported |
| Server dependency audit | `npm.cmd install` and `npm.cmd audit --prefix server` | UUID advisory resolved with a scoped Sequelize override; 2 moderate audit entries remain for nodemon → minimatch, retained to preserve documented Node 18 support |

The build reports the existing Browserslist data-age warning. The earlier large initial-chunk warning was eliminated by route-level lazy loading. No lint, TypeScript, or backend build script is configured.

## Local API smoke cases

An ephemeral Express process bound to loopback with `.env.local` was exercised using actual HTTP requests. Only status and safe role fields were recorded; credentials and tokens were not printed.

| Case | Expected | Actual |
|---|---|---|
| `GET /api/health` | 200, database connected | PASS, 200 |
| Local demo administrator login | 200, admin role | PASS, 200, admin |
| Incorrect admin password | 401 | PASS, 401 |
| Authenticated `GET /api/auth/me` | 200 and current role | PASS, 200, admin |
| Administrator report listing | 200 | PASS, 200 |
| Citizen login and own report list | 200, user role | PASS, 200 |
| Citizen calling admin-only report endpoint | 403 | PASS, 403 |
| Invalid report input | 400 validation response | PASS, 400 |
| Synthetic report create, owner list, delete | 201, visible to owner, then removed | PASS; 201/200/200 |
| `/api/crimes`, `/api/summary`, `/api/hotspots`, `/api/analytics/benchmarks` | 200 | PASS, all 200 |
| Vite `/`, `/login-admin`, `/admin/analytics`, map source modules | HTTP 200 | PASS, all 200 |
| Authenticated CSV through temporary Vite proxy to FastAPI on `127.0.0.1:8001` | Admin token accepted, synthetic row processed only in temp output | PASS |
| CSV invalid schema/row, filename/state traversal, oversized input, missing token, citizen token | Reject without processing or persistent output | PASS; expected 400/413/401/403 |
| Nodemon on Node 18-compatible dependency tree | Start on alternate port and request API health | PASS; server started, DB connected, health 200 |
| Latest live Express smoke | Admin/citizen login, profile, invalid password, citizen admin denial, analytics | PASS; 200/200, 401, 403, 200 respectively |

These checks establish API reachability and backend behavior, not visual correctness or successful browser navigation.

## Test cases and expected behavior

| Feature | Expected result | Result / status |
|---|---|---|
| Registration/login/password hashing | Valid credentials authenticate; bad credentials are denied; response excludes password hash | Covered by Express tests; PASS |
| Role and ownership checks | Citizen cannot access admin actions or another owner's report | Covered by Express tests and local HTTP check; PASS |
| Evidence upload/retrieval | Supported synthetic image is stored safely; protected access enforced | Upload and protected retrieval covered by Express tests; PASS; browser flow not run |
| Analytics | CSV parsing, filtering, aggregation, hotspots and missing data behavior | Covered by Express tests and live endpoint smoke; PASS |
| News provider | Query validation and provider error/missing-key behavior without paid requests | Mocked provider tests; PASS; live external NewsAPI not exercised |
| FastAPI legacy security | Admin registration disabled, delegated auth, CSV filename/path checks, CORS allowlist | 34 focused tests; PASS |
| FastAPI CSV processing | Real synthetic CSV through temporary Vite proxy and FastAPI instance on loopback port 8001 | PASS; admin Express token accepted and one output row written under a temporary directory; temporary files/directory removed |
| Manual UI QA | Login/dashboard navigation, reporting, map/location interactions, analytics, admin workflows, and responsive behavior | PASS per project owner’s manual QA. Not independently reproduced in this agent session; automated browser tooling was unavailable. |
| Leaflet/Photon automated coverage | Map/location helper behavior and production bundle | PASS for unit tests/build; this does not independently verify live tiles or interactive browser behavior |

## Dependency and source checks

- React and React DOM resolve to 18.3.1; Leaflet 1.9.4 and React Leaflet 4.2.1 resolve without peer errors.
- The compatible frontend production dependency audit reported zero vulnerabilities after a non-force lockfile remediation. Development dependencies are outside that audit scope.
- Server lockfile uses a scoped `sequelize -> uuid@11.1.1` override. `uuid@11.1.1` is the patched CommonJS-export-compatible line; Express tests pass with it. The remaining audit chain is nodemon 3.1.14 → minimatch 10.2.6 (GHSA-g3hv-75wg-m249, moderate globparts-amplification DoS). The fixed minimatch line begins at 11.0.1, but minimatch 11.0.5 requires Node 20 or newer while this project documents Node 18 support; forcing it would violate that compatibility. No safe patched release within nodemon’s current `^10.2.1` range was found, so two linked audit entries remain (nodemon and minimatch).
- Active frontend source/configuration has no Google Maps/Places package, loader, or key usage. Historical migration documentation retains accurate references.
- No public `/uploads` frontend path is used; evidence uses the authenticated API route.

## Known issues and pending checks

- The project owner reports manual UI QA as passed. This agent session had no in-app browser, Playwright/Puppeteer package, or browser executable, so it did not independently reproduce the browser checks. Vite serving and API responses are documented separately and are not treated as browser QA.
- No valid remote/Supabase account was used. The local `.env.local` demo admin successfully authenticated, but the remote account must not be modified or assumed to share that password.
- CSV upload validation and processing were exercised with synthetic input and temporary upload/processed directories. The default project FastAPI listener on port 8000 was not modified; the temporary test service used port 8001. Production CSV ingestion was not run.
- NewsAPI live availability and provider quotas were not tested; tests mock the external API.
- Admin review/verify/reject was covered by Express tests, not a second live UI session. Browser upload selection/success/error messaging and evidence previews remain unverified interactively.
- There is no Git metadata directory in the workspace, so tracked-file and uncommitted-change status could not be reported. `.gitignore` ignores `.env`, `.env.local`, `node_modules`, build output, uploads, caches, and runtime JSON files.
