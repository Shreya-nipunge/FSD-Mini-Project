# FastAPI / Express Authentication Contract

## Existing contract (recorded before remediation)

- Express is the current authentication authority. It signs an HS256 JWT with an 8-hour expiry. The token `sub` is the PostgreSQL user UUID and the token also contains a role claim.
- The React API client stores the token under `token` and sends it as `Authorization: Bearer <token>`.
- For CSV upload, the frontend sends that same bearer token in a multipart request to `POST /api/upload-csv`. Vite proxies this path to FastAPI on port 8000; production uses `VITE_LEGACY_API_URL`.
- Before this remediation, FastAPI verified the JWT signature with the shared `JWT_SECRET`, required a nonempty `sub`, and returned the JWT payload. It did not look up the subject in PostgreSQL or verify the user's current role. The role came from the signed token and could remain stale until token expiry.
- FastAPI also issued separate email-subject JWTs for its legacy JSON-backed login routes. These tokens were not the Express identity contract and used a separate JSON user/admin store.

## Remediation contract

- Express continues to issue tokens and the frontend request format remains unchanged.
- FastAPI forwards a supplied bearer token to Express `GET /api/auth/me`. Express validates signature, expiry, active account, and the current PostgreSQL user. FastAPI uses only the returned user ID and current role for authorization.
- FastAPI auth/login compatibility routes proxy to Express. Public admin registration is disabled; administrator provisioning remains an Express/database operator action.
- The legacy JSON auth store is no longer an authorization source. The FastAPI service has no fallback signing key and rejects authenticated operations when JWT configuration is absent or below the configured minimum strength.
- CSV upload remains `POST /api/upload-csv`; multipart fields and Express-issued bearer-token forwarding are preserved.
- The public `/uploads` static mount is removed. Existing Express report evidence continues through its authenticated Express evidence endpoint. Old FastAPI JSON-report links that relied on unauthenticated `/uploads/...` serving are intentionally no longer public; callers must not rely on that legacy URL.

The FastAPI-to-Express base URL defaults to `http://127.0.0.1:5000` for local development and can be configured with `EXPRESS_API_URL`. For a deployment, configure a private service address and use HTTPS between hosts. FastAPI CORS reads the explicit `CLIENT_ORIGIN` allowlist (comma-separated); credentials are disabled and wildcard origins are rejected.

The security tests use temporary files and mocked Express/CSV processor responses, so they do not connect to PostgreSQL or modify analytics datasets. Run them from the project root with `python -m pytest backend/tests/test_fastapi_security.py -q -p no:cacheprovider` after installing `backend/requirements-test.txt`.
