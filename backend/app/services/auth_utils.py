"""Authentication adapter for the existing Express/PostgreSQL authority.

FastAPI does not issue or independently interpret JWT roles. It forwards bearer
tokens to Express /api/auth/me, which verifies the token and returns the current
active user's database-backed role.
"""

import base64
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

import requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

env_path = os.getenv("ENV_FILE") or str(
    Path(__file__).resolve().parents[3] / ".env"
)
load_dotenv(dotenv_path=env_path)

JWT_SECRET_MIN_BYTES = 32
EXPRESS_API_URL = os.getenv("EXPRESS_API_URL", "http://127.0.0.1:5000").rstrip("/")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login-user", auto_error=False)
_SECRET_UNSET = object()


def jwt_configuration_is_secure(secret=_SECRET_UNSET):
    secret = os.getenv("JWT_SECRET", "") if secret is _SECRET_UNSET else (secret or "")
    encoded = secret.encode("utf-8")
    lowered = secret.casefold()
    insecure_markers = (
        "hackstomp-dev-fallback-key-2026",
        "change-me",
        "change_me",
        "your_",
        "replace_",
        "example",
    )
    return (
        len(encoded) >= JWT_SECRET_MIN_BYTES
        and len(set(secret)) >= 12
        and not any(marker in lowered for marker in insecure_markers)
    )


def require_secure_jwt_configuration():
    if not jwt_configuration_is_secure():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not securely configured",
        )


def _has_express_subject_shape(token):
    """Reject the retired email-subject format before forwarding to Express.

    The unverified payload is used only as a format check. Acceptance, expiry,
    signature, active-account, and current-role validation all remain with
    Express /api/auth/me.
    """
    if len(token) > 8192:
        return False
    segments = token.split(".")
    if len(segments) != 3:
        return False
    try:
        encoded_payload = segments[1] + "=" * (-len(segments[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(encoded_payload.encode("ascii")))
        subject = str(payload.get("sub", ""))
        parsed_subject = UUID(subject)
        if str(parsed_subject) != subject.lower():
            return False
        return True
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        return False


def _express_endpoint(path):
    parsed = urlsplit(EXPRESS_API_URL)
    local_http_hosts = {"localhost", "127.0.0.1", "::1"}
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or (parsed.scheme != "https" and parsed.hostname.casefold() not in local_http_hosts)
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service URL must use HTTPS except for local development",
        )
    return f"{EXPRESS_API_URL}/api/{path.lstrip('/')}"


def _upstream_error(response):
    if response.status_code in (401, 403, 409, 422):
        try:
            body = response.json()
            detail = body.get("error", {}).get("message") or body.get("detail")
        except (ValueError, AttributeError):
            detail = None
        return HTTPException(status_code=response.status_code, detail=detail or "Authentication request rejected")
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication service is unavailable",
    )


def proxy_auth_request(path, payload):
    require_secure_jwt_configuration()
    try:
        response = requests.post(
            _express_endpoint(path),
            json=payload,
            timeout=5,
            allow_redirects=False,
        )
    except requests.RequestException as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        ) from error

    if response.status_code >= 400:
        raise _upstream_error(response)
    try:
        body = response.json()
        user = body.get("data", {}).get("user") or body.get("user")
        if isinstance(user, dict):
            body.setdefault("email", user.get("email"))
            body.setdefault("role", user.get("role"))
            body.setdefault("name", user.get("name"))
            body.setdefault("token_type", "bearer")
        return body
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service returned an invalid response",
        ) from error


def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not _has_express_subject_shape(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    require_secure_jwt_configuration()

    try:
        response = requests.get(
            _express_endpoint("auth/me"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
            allow_redirects=False,
        )
    except requests.RequestException as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        ) from error

    if response.status_code >= 400:
        raise _upstream_error(response)
    try:
        body = response.json()
        user = body.get("data", {}).get("user") or body.get("user")
    except (ValueError, AttributeError):
        user = None

    if (
        not isinstance(user, dict)
        or not user.get("id")
        or not user.get("email")
        or user.get("role") not in {"user", "admin"}
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication service returned an invalid identity",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Legacy JSON report helpers still address owners by email. This value
    # comes from Express's current database user response, never the JWT claim.
    identity = dict(user)
    identity["sub"] = user["email"]
    return identity


def get_optional_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    return get_current_user(token)


def require_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return current_user
