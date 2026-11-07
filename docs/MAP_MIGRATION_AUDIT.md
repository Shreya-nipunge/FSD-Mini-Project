# CrimeMap Map Migration Audit

**Milestone:** 1 — inspection only  
**Scope:** Frontend mapping/search dependencies and backend Google API dependency inspection. No application code or dependencies were changed for this audit.

## Frontend structure inspected

The Vite application is under `frontend/`:

- `src/App.jsx`, `src/main.jsx`, `src/context/`, and `src/layouts/` provide routing, app startup, auth context, and the dashboard shell.
- `src/pages/` contains user/admin auth and reporting pages; `src/pages/dashboard/` contains map, report, news, and personal report pages; `src/pages/admin/` contains admin analytics and report review pages.
- `src/components/` contains the shared map, filters, report form, chart panels, hotspots, news, and other dashboard components.
- `src/services/api.js` centralizes Express API calls. `vite.config.js` configures local development proxying. Package manifests are `frontend/package.json` and `frontend/package-lock.json`.
- `public/` contains the existing hero illustration. `dist/` is generated build output and `node_modules/` is installed dependency content; neither is source code.

## Google Maps dependencies and configuration

### Source usage

| Location | Current use |
|---|---|
| `frontend/src/components/MapView.jsx` | Imports `GoogleMap`, `useJsApiLoader`, and `OverlayView`; reads `VITE_GOOGLE_MAPS_API_KEY`; creates Google marker objects; pans/zooms the map; uses Google controls and custom marker-size/anchor objects. This is the only map renderer and is used by both `Dashboard.jsx` and `pages/dashboard/MapPage.jsx`. |
| `frontend/src/components/FilterPanel.jsx` | Initializes Google Places Autocomplete on its location search input and passes selected coordinates/address to the page. Used by both map pages. |
| `frontend/src/components/ComplaintForm.jsx` | Initializes Places Autocomplete on the report location field; derives coordinates and a district from the selected place. This is the reporting form’s only location picker; there is no embedded report map or draggable report marker today. |
| `frontend/src/components/SearchBar.jsx` | Contains another Google Places Autocomplete implementation. No source file imports or renders this component, so it is currently unused. |
| `frontend/src/pages/Dashboard.jsx` and `pages/dashboard/MapPage.jsx` | Request crime rows and reports, pass them to `MapView`, and update selected location from district/crime/hotspot selections. These pages do not directly instantiate Google Maps. |

### Declared packages and mismatch

`frontend/package.json` declares `@googlemaps/js-api-loader` and `@googlemaps/markerclusterer`. No source import of either package was found. `MapView.jsx` instead imports `@react-google-maps/api`, which is **not** declared in `package.json` or `package-lock.json` and is not present in the inspected `frontend/node_modules`. This is a dependency mismatch in the current checkout.

`@types/leaflet` is already listed in the frontend manifest, but `leaflet` and `react-leaflet` are not installed or declared. No actual Leaflet source usage was found.

### Environment variables

- `.env.example` declares `VITE_GOOGLE_MAPS_API_KEY` for the frontend map.
- The local `.env` also declares a variable with that name. Its value was deliberately not read or included in this audit.
- Map source reads `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` in `MapView.jsx`.
- No Google Maps variable or API key is used by the Express or FastAPI source found in this inspection.

## Map rendering and behavior

- The two application map pages are the user map page and the legacy dashboard page. Both render the shared `MapView`.
- `MapView` has hard-coded center and zoom presets for the supported states/UTs and a national view. It uses crime-row `lat`/`lng` coordinates supplied by analytics data.
- Official crime rows are rendered as custom pulsing SVG markers colored by relative crime score. Under-reporting and admin-responsiveness warnings are badges in the marker SVG.
- Citizen reports are separate status-colored markers, placed from report `lat`/`lng`; a marker selection opens the shared detail overlay. The map also renders an intelligence legend and report/analytics details in a custom `OverlayView`.
- Hotspots are supplied by the existing analytics endpoint and displayed as cards. Selecting a card finds a matching crime row and changes the map’s selected location; the hotspot is not a distinct marker layer.
- `MapView` keeps a ref named `clustererRef` for cleanup, but the current code creates ordinary Google marker instances and does not instantiate a marker-clustering implementation. The declared Google marker-clusterer package is not used in source.
- The loader requests Google `visualization`, `marker`, and `places` libraries, but no Google heatmap layer is created. The current crime-intensity visualization is the custom pulsing crime markers, not a separate heatmap overlay.
- A custom dark Google style array is declared near the bottom of `MapView.jsx` but is not referenced by the map options. Map controls include zoom and map type, with greedy gesture handling.

## Location search and report location

- The map filter search performs Places Autocomplete and reports a chosen address plus coordinates to the page. It does not call a backend search endpoint.
- `SearchBar.jsx` contains a second map-bound Places search but is currently unused.
- The report form performs Places Autocomplete restricted to India. Selection fills the address, latitude/longitude, and a district inferred from administrative/locality address components. It sends `lat`, `lng`, `district`, `state`, and `location` to the existing report API.
- There is currently no Photon client, Nominatim client, debounce logic, reverse geocoding, map click-to-select reporting interaction, draggable report pin, or browser `navigator.geolocation` call.
- A comment in `MapView` calls its nearby-marker calculation a “Geolocation Fallback”; this is a Haversine distance comparison on already selected coordinates, not browser/device geolocation.

## Backend and data dependencies

- No Google Maps, Places, geocoding, directions, or distance-matrix import/request was found in the inspected `server/` or `backend/` application source.
- Analytics data already supplies district `lat`/`lng` values from processed CSVs and the district coordinate JSON. Those data and calculations are independent of Google Maps.
- Crime reports persist optional `latitude` and `longitude` fields in PostgreSQL through the existing Sequelize model. Report create/update APIs accept coordinate aliases; authentication, report ownership, and analytics APIs do not call a Google service.
- The backend therefore has no identified Google API dependency to replace. Map rendering and address lookup are frontend responsibilities; existing API contracts already accept coordinates and human-readable location strings.

## Migration impact summary

1. Replace the shared `MapView` renderer while retaining its two page consumers, custom crime/report markers, selected-location behavior, detail overlays, legend, and hotspot focus.
2. Replace Places search in `FilterPanel` and `ComplaintForm`; decide whether the currently unreferenced `SearchBar.jsx` should be adapted or removed after confirming no dynamic use.
3. Add an interactive location picker to the report form only if required by the approved milestone behavior; the current form has search autocomplete but no map picker.
4. Remove the Google key setting and unused Google packages after source migration; resolve the existing undeclared `@react-google-maps/api` import as part of replacing `MapView`.
5. Preserve existing API coordinate fields and keep report CRUD/authentication and CSV analytics unchanged.

This file is the Milestone 1 audit. No application-code migration has been started.
