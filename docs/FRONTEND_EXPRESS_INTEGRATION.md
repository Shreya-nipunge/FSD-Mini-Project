# React to Express integration

The existing React UI now calls the Express API through its central Axios service. `VITE_API_URL` is an optional API root (for example `http://localhost:5000`); when blank, Vite proxies migrated `/api` paths to Express on port 5000. The root `.env.example` lists only public frontend settings and the optional legacy API URL. Never put database, JWT, or NewsAPI credentials in a `VITE_*` variable.

Run the services in separate terminals:

```sh
npm --prefix server run dev
npm --prefix frontend run dev
```

The auth provider retains the `token` localStorage key for the existing app architecture. It restores sessions through `GET /api/auth/me`; route access and navigation use the server-returned user. The server remains authoritative for report ownership and admin permission checks. A 401 clears the session; a 403 is displayed as an authorization failure without silently logging the user out.

Report submission, history, details, edits, deletes, and admin review use the Express report APIs. Evidence thumbnails/details use authenticated Axios Blob requests and temporary object URLs; those URLs are revoked when components unmount. The backend does not support replacing an existing evidence file through report edits.

## CSV upload remains on FastAPI

`POST /api/upload-csv` has not been migrated. Vite routes only this path to FastAPI at `127.0.0.1:8000`; other `/api` requests go to Express at `127.0.0.1:5000`. In production, configure `VITE_LEGACY_API_URL` to the legacy FastAPI API origin if uploads remain enabled. If it is absent in a production build, the upload service refuses to send the request instead of sending it to Express.

The legacy upload path still depends on the original FastAPI service and its admin token validation. This integration does not alter its upload implementation or data processing.
