# CrimeMap Map Migration Report

Updated: 2026-11-07

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| 1. Inspection | Complete | See [MAP_MIGRATION_AUDIT.md](./MAP_MIGRATION_AUDIT.md). |
| 2. Dependencies and reusable map | Complete | Shared map rendering now uses React Leaflet and OpenStreetMap tiles. |
| 3. Location search | Complete | Shared Photon autocomplete and reverse-geocoding service are integrated into active location search fields. |
| 4. Crime reporting picker | Complete | The report form now synchronizes Photon search, a clickable/draggable Leaflet marker, coordinates, and Photon reverse geocoding. |
| 5. Analytics map pages | Complete | Dashboard and Intelligence Map use validated analytics coordinates, filter-aware selection, hotspot navigation, and clustered markers. |
| 6. Google Maps cleanup | Complete | Obsolete Google Maps configuration was removed; historical audit entries remain as records of the original implementation. |
| 7. Final verification | Partial | Frontend/backend regression suites, build, dependency/import checks, and Express health route passed; browser QA is pending because the in-app browser was unavailable. Security findings in the retained FastAPI service are documented below. |

## Milestone 2 implementation

- Added `frontend/src/components/map/LeafletMap.jsx`, a reusable React Leaflet map surface using OpenStreetMap raster tiles, visible OSM attribution, zoom controls, responsive sizing, and tile loading/error messages.
- Replaced the Google renderer in `frontend/src/components/MapView.jsx` with Leaflet markers and popups. Existing state centers and zooms, crime-risk marker colors/sizing, report status colors, selected-location focus, district/report detail content, and the intelligence legend were retained.
- Added `frontend/src/components/MapView.css` for dark popup and map-control styling consistent with the existing dashboard.
- Removed unused `@googlemaps/js-api-loader` and `@googlemaps/markerclusterer` dependencies from the frontend manifest and lockfile. `react-leaflet-cluster` is used by the analytics maps for national-scale marker density.
- React and React DOM remain at 18.3.1 in the lockfile. Leaflet 1.9.4, React Leaflet 4.2.1, and react-leaflet-cluster 2.0.0 remain installed.

## Verification

- `npm.cmd run build --prefix frontend` — passed. Vite built the production bundle.
- `npm.cmd ls react react-dom leaflet react-leaflet react-leaflet-cluster @types/leaflet @googlemaps/js-api-loader @googlemaps/markerclusterer --depth=0 --prefix frontend` — passed; React and React DOM resolve to 18.3.1, and the removed Google packages are absent.
- The build reports the existing stale Browserslist database notice and a large JavaScript chunk warning. Neither prevented the build.

At the time of the Milestone 2 report, the report location picker had not yet been manually exercised and final Google Maps cleanup was pending; see the later Milestone 4 and Milestone 6 entries for their completion status. Reverse geocoding uses Photon; Nominatim is not used.

## Milestone 3 implementation

- Added `frontend/src/components/LocationSearch.jsx` with a 450 ms debounce, a three-character minimum, keyboard selection, loading/no-results/error states, retry behavior, and request cancellation plus stale-response protection.
- Added `frontend/src/services/locationSearch.js` for Photon GeoJSON normalization, valid coordinate checks, India-biased and India-restricted search, and Photon reverse geocoding. Suggestions show the place name and the district/city, state, and country values that Photon returns.
- Replaced Google Places autocomplete in `FilterPanel.jsx` and `ComplaintForm.jsx`. Selection supplies numeric latitude/longitude; the report form also updates its location and district while retaining its existing submission API and payload. The unused `SearchBar.jsx` now delegates to the shared component and supports a Leaflet map instance.
- No Google Places references remain in `frontend/src`. No backend, database, authentication, or Leaflet map-rendering changes were made for this milestone.
- Added native Node test coverage and the `npm test` script. No test dependencies were added.

### Milestone 3 verification

- `npm.cmd test --prefix frontend` — passed: 13 tests covering Mumbai, Pune district, Andheri East locality, coordinates, minimum query length, empty results, network/provider errors, reverse lookup, and invalid coordinates.
- Live Photon smoke checks — passed with HTTP 200 for Mumbai, Pune district, Andheri East Mumbai, and reverse lookup at 19.076, 72.8777. Photon returned coordinates in GeoJSON `[longitude, latitude]` order; the UI adapter maps those into numeric `latitude` and `longitude` fields.
- `npm.cmd run build --prefix frontend` — passed. The existing stale Browserslist notice and large JavaScript chunk warning remain.

The live Photon checks used the public service. Photon notes that excessive use may be throttled and availability is not guaranteed; requests are debounced, limited to six suggestions, and only sent after three characters.

## Milestone 4 implementation

- Added `frontend/src/components/CrimeLocationPicker.jsx`, a responsive Leaflet map within the existing report form. Map clicks set a point, the marker is draggable, and the map recenters on selected coordinates. The initial view uses the existing selected point or Mumbai.
- Added `frontend/src/services/locationPicker.js` for map positioning, coordinate validation, Photon search selection updates, reverse-geocoded address merging, and safe reverse-lookup failure results. The report form uses these helpers while keeping the existing multipart submission fields and evidence/privacy behavior.
- Added `frontend/src/components/map/LeafletMap.css` for shared dark map controls and attribution styling. The existing shared Leaflet renderer was not replaced.
- Added `frontend/test/locationPicker.test.js` with tests for initial positioning, map/drag coordinate handling, search-to-marker synchronization, reverse address updates, reverse failures, and invalid coordinates. Fixtures use observed Photon results.

### Milestone 4 verification

- Frontend: `npm.cmd test --prefix frontend` — passed, 18 tests total.
- Backend: `npm.cmd test --prefix server` — passed, 17 tests total, including authentication, CRUD, evidence upload, analytics, and news regressions.
- Production build: `npm.cmd run build --prefix frontend` — passed. The Browserslist age notice and large bundle warning remain.
- Dependency compatibility: `npm.cmd ls react react-dom leaflet react-leaflet react-leaflet-cluster --depth=0 --prefix frontend` — React/React DOM 18.3.1, Leaflet 1.9.4, React Leaflet 4.2.1, cluster 2.0.0; no peer errors.
- Read-only Supabase verification after tests confirmed both demo accounts and the deterministic demo report remain present.

### Admin demo login investigation

The expected `demo.admin@example.test` account exists in Supabase, is active, and has role `admin`. Its stored password hash is bcrypt, but `bcrypt.compare` against the local `DEMO_ADMIN_PASSWORD` returns false. The local Express admin-login API also returned HTTP 401 for that configured pair. The API’s bcrypt comparison works in the regression suite with valid test credentials.

The seed hashes `DEMO_ADMIN_PASSWORD` but supplies it only in `User.findOrCreate` defaults. If the deterministic admin row already exists, rerunning the seed does not change its password hash. The seed imports environment configuration before reading the variable; its default `.env` path is relative to the process working directory, so running the package script from `server/` loads the root `.env`, while invoking the script directly from the project root may not. No credentials were changed or included here.

For development recovery, first point the backend at an isolated development database, set a new local demo password, then use a one-row password reset that hashes with bcrypt and updates only `demo.admin@example.test` guarded by `role = 'admin'`. Verify the update with bcrypt comparison and the admin login endpoint. Do not use a production/Supabase database for this reset without explicit authorization.

### Manual browser testing

1. Start the backend and frontend (`npm.cmd run dev --prefix server` and `npm.cmd run dev --prefix frontend`), then sign in and open `/dashboard/report`.
2. Confirm the map starts around Mumbai, tiles and OSM attribution appear, and the map resizes on a narrow viewport.
3. Select an Indian address in the Photon search box. Confirm the map recenters, the marker appears at the returned point, coordinates update, and reverse lookup fills address/district details when available.
4. Click a different map point and drag the marker. Confirm each action updates latitude/longitude and address lookup feedback; simulate offline service access and confirm the coordinates remain selected when reverse geocoding fails.
5. Submit a report with and without evidence and with either description-sharing preference. Confirm the existing report workflow and fields still behave as before.
6. Open `/login-admin` to test admin login only after an authorized development-only password reset. The current local configured password was not accepted by the existing Supabase account.

## Milestone 5 implementation

- Reused the shared `MapView` for both the main dashboard and Intelligence Map. Official CSV analytics and citizen-submitted reports remain separate marker layers; no API or backend changes were needed.
- Added coordinate validation and exact district/hotspot resolution helpers in `frontend/src/services/analyticsMap.js`. Missing, non-numeric, and out-of-range coordinates are excluded so absent values cannot become markers at `[0, 0]`.
- Added Leaflet marker clustering for the existing national dataset (758 official district rows). Existing crime intensity/status markers, popups, and legends remain. Popups now indicate a selected district’s hotspot rank when it matches the current hotspot response.
- Dashboard and Intelligence Map clear stale selections when state/district filters change, focus selected districts, and navigate hotspot cards using coordinates resolved from the filtered official analytics rows. Removed the previous fallback that substituted fabricated map coordinates when a hotspot lacked a coordinate match.
- Added map-level loading, error, and empty-data overlays; adjusted map/sidebar sizing for narrow screens. Hotspot cards now call the backend's weighted `count` value “Crime Score” rather than “Cases”.
- The API contract is unchanged. Existing analytics APIs provide hotspot scores without coordinates, so map navigation resolves hotspot names against the existing `/crimes` response. Summary and hotspot endpoints remain state/year filtered; region/category filters continue to filter the map’s crime rows through `/crimes` without changing backend calculations.

### Milestone 5 verification

- `npm.cmd test --prefix frontend` — passed, 20 tests total (including 2 focused analytics map tests).
- `npm.cmd run build --prefix frontend` — passed. Vite transformed 2,440 modules. Existing Browserslist age notice and large JavaScript chunk warning remain.
- `npm.cmd ls react react-dom leaflet react-leaflet react-leaflet-cluster --depth=0 --prefix frontend` — passed with React/React DOM 18.3.1, Leaflet 1.9.4, React Leaflet 4.2.1, and cluster 2.0.0.
- Backend tests are not applicable because no backend files or API contracts were changed.
- Manual browser interaction has not been performed for this milestone; see the instructions below.

### Milestone 5 manual browser checks

1. Open the dashboard and Intelligence Map, and verify OSM tiles, attribution, legend, and map controls at desktop and mobile widths.
2. Use state, district, year, and crime-type filters; confirm mapped official markers update and state/district navigation recenters without retaining a stale popup.
3. Select a hotspot card and confirm the map focuses the matching official district marker and popup shows its hotspot rank. Confirm an unmatched hotspot does not jump to a default/fabricated coordinate.
4. Click official and citizen markers; verify their distinct popups and that rejected citizen reports remain absent.
5. Exercise loading, an API failure, and a filter combination with no coordinate-bearing rows; verify the overlays communicate each state.

## Milestone 6 implementation

- Removed `VITE_GOOGLE_MAPS_API_KEY` and its placeholder/comment from `.env.example`.
- The same obsolete variable was present in local `.env` and was removed by deleting only that assignment. Other environment entries were preserved and compared before/after without displaying their values.
- Confirmed no Google Maps packages remain in the frontend manifest or lockfile. The Google Maps packages were already removed during Milestone 2, so no dependency changes were needed in this milestone.
- Updated the README frontend setup notes to describe Leaflet, OpenStreetMap tiles, Photon, and the lack of a required Google Maps key.
- Kept `PROJECT_AUDIT.md` and `MAP_MIGRATION_AUDIT.md` references because they accurately describe the pre-migration project. This report also retains earlier milestone notes as historical records.
- Google Fonts URLs in `frontend/index.html` remain; they load typography and are unrelated to Google Maps or Places.

### Milestone 6 verification

- `npm.cmd test --prefix frontend` — passed, 20 tests.
- `npm.cmd run build --prefix frontend` — passed; Vite transformed 2,440 modules. Existing stale Browserslist data and large bundle warnings remain.
- `npm.cmd ls react react-dom leaflet react-leaflet react-leaflet-cluster @react-google-maps/api @googlemaps/js-api-loader @googlemaps/markerclusterer --depth=0 --prefix frontend` — passed; React/React DOM 18.3.1, Leaflet 1.9.4, React Leaflet 4.2.1, and cluster 2.0.0 are installed. No Google Maps packages are listed.
- Post-cleanup source/config search found no Google Maps JavaScript API, Google Places API, map key, or Google map package references in active application files. Remaining matches are historical audit/report records. Google Fonts references are unrelated.
- `.env` previously contained the obsolete key. After removing only that assignment, a line-by-line comparison confirmed all other `.env` lines remained unchanged; the key is absent from `.env` and `.env.example` now.
- Manual browser checks: no map functionality was changed, but verify the existing OSM map tiles and Photon search load in the browser when convenient.

## Milestone 7 final verification

### Automated checks

- Frontend `npm.cmd test --prefix frontend` — passed, 20/20.
- Backend `npm.cmd test --prefix server` — passed, 17/17. The integration suite created synthetic test users/reports and evidence files, then cleaned up records by generated test user IDs. It did not target deterministic demo IDs or reset tables. Use an isolated test database for future runs.
- Frontend `npm.cmd run build --prefix frontend` — passed (2,440 modules). Existing stale Browserslist data and large bundle warnings remain non-blocking.
- `npm.cmd ls --depth=0 --prefix frontend` and `npm.cmd ls --depth=0 --prefix server` — passed with installed packages resolving. React/React DOM are 18.3.1; Leaflet/React Leaflet/cluster are 1.9.4/4.2.1/2.0.0.
- `node --check` passed for 32 backend JavaScript files and 5 frontend `.js` files. JSX import resolution was checked by the successful Vite build.
- Express health smoke request returned HTTP 200 and `status: ok`; its database field was `unavailable` in that direct sandboxed process because the configured PostgreSQL host could not be reached from that command. The separate backend integration suite completed successfully. Recheck the health route in the local runtime environment.
- Google Maps/Places package, source, and configuration searches found no active application references. Historical audit/report references remain intentionally. Photon/Leaflet/OSM references and dependencies remain present.
- No `VITE_` variables expose database, JWT, or NewsAPI secrets. `.env` is ignored by `.gitignore`; its configured variable names use the supported discrete `PG_*` alternative, and the optional Vite API variables are absent. `.env` values were not printed.

### Browser verification and manual checklist

The in-app browser was unavailable, so no browser-driven interactions are claimed. Complete these checks in a running local environment:

1. **Citizen access:** register a user, log in, refresh to confirm session restoration, navigate between map/report/news/My Reports, and verify logout and protected-route redirects.
2. **Citizen reporting:** search for a location, select a Photon suggestion, click elsewhere on the report map, drag the marker, and confirm coordinates/address fields stay synchronized. Submit a report with and without JPEG/PNG/WebP evidence and with both description-sharing settings; check success and validation errors.
3. **My Reports:** confirm a user sees only their own reports, statuses/rejection reasons, and permitted edits/deletes. Open evidence and verify the authenticated preview loads and is revoked when leaving the page.
4. **Administrator access:** sign in with a provisioned admin account, verify admin routes reject a normal user, open the report queue, review and verify a report, reject a different report with a reason, and view its evidence.
5. **Maps:** check OpenStreetMap tiles and attribution; Photon suggestions and reverse lookup; map recentering; state/district/year/category filters; hotspot card navigation; crime/report popups; national clustering; and loading, empty, and API error states.
6. **Responsive layout:** repeat map and report picker checks at desktop and narrow mobile widths.
7. **News and legacy upload:** with backend NewsAPI configuration present, verify the news cards/search. Exercise CSV upload only in an isolated development setup after addressing the legacy FastAPI security findings below.

### Admin demo credential status

- Seed source confirms `demo.admin@example.test` is the deterministic administrator email and assigns role `admin` on initial creation.
- Earlier verification found the configured local `DEMO_ADMIN_PASSWORD` did not match the existing database bcrypt hash and the Express login returned 401. The seed passes the password hash only as `findOrCreate` defaults, so rerunning it does not reset an existing account.
- No valid admin password is documented or established here; `Test@1234` is not verified. No password, Supabase account, database, or schema was changed.
- The current `.env` has a configured non-loopback PostgreSQL host; no isolated local PostgreSQL target is configured. Do not run the seed against the current connection to establish a password. For a safe development-only admin, configure a separate local PostgreSQL database and a separate environment file via `ENV_FILE`, apply migrations, set a new local `DEMO_ADMIN_PASSWORD`, and seed that isolated database. Resetting the existing shared/Supabase account would require separate explicit authorization.

### Security and configuration findings

**Confirmed code-level vulnerabilities if the legacy FastAPI service is reachable by untrusted clients:**

- `backend/app/routes/api.py` exposes unauthenticated `/api/register-admin`, which writes an administrator into the legacy JSON database and returns an admin-role JWT.
- The legacy `/api/complaints/{id}/review`, `/verify`, and `/reject` handlers do not require authentication. They can change legacy JSON complaint statuses without an admin check.
- `backend/app/services/auth_utils.py` falls back to a known hardcoded JWT signing key when `JWT_SECRET` is missing. Its token reader trusts the signed role claim without checking the legacy user database.
- FastAPI publicly mounts `backend/uploads` at `/uploads`. Express stores evidence under the child `backend/uploads/reports`, so a known evidence filename can bypass Express's owner/admin-only evidence endpoint through the legacy static route.
- The CSV upload handler strips forward slashes from the client filename but not Windows backslashes before joining it to the upload directory. On Windows this may permit path traversal. Combined with legacy admin self-registration, this needs remediation before exposing CSV upload.

These routes were inspected but not changed in this final verification milestone. Keep FastAPI restricted to a trusted local network until the legacy routes, JWT setup, static uploads, and CSV filename handling are secured. Express authentication/report routes use database-backed roles and protected evidence retrieval; the findings above concern the retained FastAPI application.

**Additional configuration concerns:** FastAPI allows CORS from all origins, and the Express evidence directory overlaps its public static mount. The workspace has no Git metadata, so repository history/tracked-file status could not be audited; `.gitignore` excludes `.env` and `.env.*` while allowing `.env.example`.

### Documentation audit

- Replaced README claims about FastAPI as the primary backend, JSON storage, and PBKDF2 as current architecture with the current React/Vite + Express + Sequelize/PostgreSQL implementation.
- Added current setup, supported environment variables, Express/legacy service commands, test/build commands, route documentation links, OpenStreetMap/Photon setup, and the unmigrated CSV upload limitation.
- Documented that backend integration tests create and clean up synthetic records and must run against an isolated database.
- Added the legacy FastAPI security limitations above. No deployment or browser functionality is claimed as verified.
