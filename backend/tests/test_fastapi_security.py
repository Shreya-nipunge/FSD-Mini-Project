import base64
import json
import shutil
import tempfile
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.routes import api as api_routes
from backend.app.services import auth_utils


def synthetic_express_token(subject="10000000-0000-4000-8000-000000000001", role="user"):
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": subject, "role": role}).encode("utf-8")
    ).decode("ascii").rstrip("=")
    return f"synthetic-header.{payload}.synthetic-signature"


@pytest.fixture
def tmp_path():
    temporary_root = Path(__file__).resolve().parent / ".security-test-tmp"
    temporary_root.mkdir(parents=True, exist_ok=True)
    test_directory = Path(tempfile.mkdtemp(prefix="case-", dir=temporary_root))
    try:
        yield test_directory
    finally:
        shutil.rmtree(test_directory, ignore_errors=True)
        try:
            temporary_root.rmdir()
        except OSError:
            pass


@pytest.fixture(autouse=True)
def secure_auth_environment(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "unit-test-signing-secret-with-more-than-32-bytes")
    monkeypatch.setattr(auth_utils, "EXPRESS_API_URL", "http://127.0.0.1:5000")


def fake_identity(monkeypatch, role="admin", user_id="test-user-id", status_code=200):
    body = {
        "success": True,
        "data": {
            "user": {
                "id": user_id,
                "email": "synthetic@example.test",
                "name": "Synthetic Test User",
                "role": role,
            }
        },
    }
    response = SimpleNamespace(status_code=status_code, json=lambda: body)
    captured = {}

    def get(url, headers, timeout, **kwargs):
        captured.update(url=url, headers=headers, timeout=timeout, **kwargs)
        return response

    monkeypatch.setattr(auth_utils.requests, "get", get)
    return captured


def setup_legacy_complaints(monkeypatch, tmp_path, ids=("review-id", "verify-id", "reject-id")):
    file_path = tmp_path / "complaints.json"
    file_path.write_text(
        json.dumps(
            {
                "complaints": [
                    {"id": report_id, "state": "Test State", "status": "UNVERIFIED"}
                    for report_id in ids
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(api_routes, "COMPLAINTS_FILE", file_path)
    monkeypatch.setattr(api_routes, "_processed_data", {})
    return file_path


def test_admin_registration_is_disabled_without_writing_legacy_auth_data(monkeypatch):
    def unexpected_post(*_args, **_kwargs):
        pytest.fail("admin registration must not call an auth provider")

    monkeypatch.setattr(auth_utils.requests, "post", unexpected_post)
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.post(
        "/api/register-admin",
        json={"name": "Synthetic Admin", "email": "admin@example.test", "password": "synthetic-test-password"},
    )
    assert response.status_code == 403
    assert "provisioned" in response.json()["detail"].lower()


def test_legacy_login_routes_proxy_to_express_and_keep_bearer_response_shape(monkeypatch):
    captured = {}
    user = {"id": "express-user-uuid", "email": "synthetic@example.test", "name": "Synthetic", "role": "admin"}
    payload = {
        "success": True,
        "data": {"token": "synthetic-express-token", "user": user},
        "access_token": "synthetic-express-token",
        "token_type": "bearer",
        "role": "admin",
        "name": "Synthetic",
    }

    def post(url, json, timeout, **kwargs):
        captured.update(url=url, json=json, timeout=timeout, **kwargs)
        return SimpleNamespace(status_code=200, json=lambda: payload)

    monkeypatch.setattr(auth_utils.requests, "post", post)
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.post("/api/login-admin", json={"email": "synthetic@example.test", "password": "synthetic-password"})
    assert response.status_code == 200
    assert captured["url"].endswith("/api/login-admin")
    assert response.json()["access_token"] == "synthetic-express-token"
    assert response.json()["email"] == "synthetic@example.test"
    assert response.json()["role"] == "admin"


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/complaints/review-id/review", None),
        ("/api/complaints/verify-id/verify", None),
        ("/api/complaints/reject-id/reject", {"admin_notes": "Synthetic rejection reason"}),
    ],
)
def test_normal_user_cannot_change_legacy_report_status(monkeypatch, tmp_path, path, payload):
    complaint_file = setup_legacy_complaints(monkeypatch, tmp_path)
    before = complaint_file.read_bytes()
    captured = fake_identity(monkeypatch, role="user")
    client = TestClient(create_app(["http://localhost:5173"]))
    token = synthetic_express_token()
    response = client.patch(path, headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert response.status_code == 403
    assert captured["headers"]["Authorization"] == f"Bearer {token}"
    assert complaint_file.read_bytes() == before


def test_current_express_admin_role_can_review_verify_and_reject(monkeypatch, tmp_path):
    complaint_file = setup_legacy_complaints(monkeypatch, tmp_path)
    captured = fake_identity(monkeypatch, role="admin")
    client = TestClient(create_app(["http://localhost:5173"]))
    token_header = {"Authorization": f"Bearer {synthetic_express_token(role='admin')}"}

    review = client.patch("/api/complaints/review-id/review", headers=token_header)
    verify = client.patch("/api/complaints/verify-id/verify", headers=token_header)
    reject = client.patch(
        "/api/complaints/reject-id/reject",
        headers=token_header,
        json={"admin_notes": "Synthetic rejection reason"},
    )
    assert [review.status_code, verify.status_code, reject.status_code] == [200, 200, 200]
    statuses = {row["id"]: row["status"] for row in json.loads(complaint_file.read_text(encoding="utf-8"))["complaints"]}
    assert statuses == {"review-id": "UNDER_REVIEW", "verify-id": "VERIFIED", "reject-id": "REJECTED"}
    assert captured["url"].endswith("/api/auth/me")


def test_legacy_my_reports_filter_uses_current_express_email(monkeypatch, tmp_path):
    file_path = tmp_path / "complaints.json"
    file_path.write_text(
        json.dumps(
            {
                "complaints": [
                    {"id": "owned", "user_email": "synthetic@example.test", "status": "UNVERIFIED"},
                    {"id": "other", "user_email": "other@example.test", "status": "UNVERIFIED"},
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(api_routes, "COMPLAINTS_FILE", file_path)
    fake_identity(monkeypatch, role="user", user_id="express-user-uuid")
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.get(
        "/api/my-complaints",
        headers={"Authorization": f"Bearer {synthetic_express_token()}"},
    )
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["complaints"]] == ["owned"]


def test_public_legacy_reports_hide_contact_fields_and_private_descriptions(monkeypatch, tmp_path):
    file_path = tmp_path / "complaints.json"
    file_path.write_text(
        json.dumps(
            {
                "complaints": [
                    {
                        "id": "public-report",
                        "status": "UNVERIFIED",
                        "description": "Private synthetic description",
                        "share_description": False,
                        "name": "Synthetic Reporter",
                        "phone": "0000000000",
                        "email": "reporter@example.test",
                        "user_email": "reporter@example.test",
                        "image_url": "/uploads/synthetic.png",
                    },
                    {"id": "rejected-report", "status": "REJECTED", "share_description": True},
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(api_routes, "COMPLAINTS_FILE", file_path)
    client = TestClient(create_app(["http://localhost:5173"]))

    public = client.get("/api/complaints")
    assert public.status_code == 200
    rows = public.json()["complaints"]
    assert [row["id"] for row in rows] == ["public-report"]
    assert rows[0]["description"] is None
    assert not {"name", "phone", "email", "user_email", "image_url"}.intersection(rows[0])

    unauthenticated_admin_queue = client.get("/api/complaints?include_rejected=true")
    assert unauthenticated_admin_queue.status_code == 401


def test_only_current_express_admin_can_list_rejected_legacy_reports(monkeypatch, tmp_path):
    file_path = tmp_path / "complaints.json"
    file_path.write_text(
        json.dumps({"complaints": [{"id": "rejected-report", "status": "REJECTED", "email": "reporter@example.test"}]}),
        encoding="utf-8",
    )
    monkeypatch.setattr(api_routes, "COMPLAINTS_FILE", file_path)
    client = TestClient(create_app(["http://localhost:5173"]))

    fake_identity(monkeypatch, role="user")
    user_response = client.get(
        "/api/complaints?include_rejected=true",
        headers={"Authorization": f"Bearer {synthetic_express_token()}"},
    )
    assert user_response.status_code == 403

    fake_identity(monkeypatch, role="admin")
    admin_response = client.get(
        "/api/complaints?include_rejected=true",
        headers={"Authorization": f"Bearer {synthetic_express_token(role='admin')}"},
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["complaints"][0]["email"] == "reporter@example.test"


def test_missing_invalid_and_expired_tokens_fail_closed(monkeypatch):
    captured = fake_identity(monkeypatch, status_code=401)
    client = TestClient(create_app(["http://localhost:5173"]))
    missing = client.get("/api/my-complaints")
    invalid = client.get("/api/my-complaints", headers={"Authorization": f"Bearer {synthetic_express_token()}"})
    expired_token = synthetic_express_token(subject="20000000-0000-4000-8000-000000000001")
    expired = client.get("/api/my-complaints", headers={"Authorization": f"Bearer {expired_token}"})
    retired_email_token = synthetic_express_token(subject="legacy@example.test")
    retired = client.get("/api/my-complaints", headers={"Authorization": f"Bearer {retired_email_token}"})
    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert expired.status_code == 401
    assert retired.status_code == 401
    assert captured["headers"]["Authorization"] == f"Bearer {expired_token}"


def test_stale_admin_claim_cannot_override_authoritative_express_user(monkeypatch, tmp_path):
    setup_legacy_complaints(monkeypatch, tmp_path)
    fake_identity(monkeypatch, role="user")
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.patch(
        "/api/complaints/review-id/verify",
        headers={"Authorization": f"Bearer {synthetic_express_token(role='admin')}"},
    )
    assert response.status_code == 403


def test_missing_or_weak_jwt_configuration_fails_closed(monkeypatch):
    assert not auth_utils.jwt_configuration_is_secure("hackstomp-dev-fallback-key-2026")
    assert not auth_utils.jwt_configuration_is_secure("short")
    assert not auth_utils.jwt_configuration_is_secure("a" * 64)
    assert auth_utils.jwt_configuration_is_secure("synthetic-secure-signing-secret-over-32-bytes")

    monkeypatch.delenv("JWT_SECRET")
    assert not auth_utils.jwt_configuration_is_secure()
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.get("/api/my-complaints", headers={"Authorization": f"Bearer {synthetic_express_token()}"})
    assert response.status_code == 503
    assert "securely configured" in response.json()["detail"].lower()


def test_remote_express_authentication_requires_https(monkeypatch):
    monkeypatch.setattr(auth_utils, "EXPRESS_API_URL", "http://express.internal:5000")
    with pytest.raises(HTTPException) as exc_info:
        auth_utils._express_endpoint("auth/me")
    assert exc_info.value.status_code == 503
    monkeypatch.setattr(auth_utils, "EXPRESS_API_URL", "https://express.internal")
    assert auth_utils._express_endpoint("auth/me") == "https://express.internal/api/auth/me"


@pytest.mark.parametrize(
    "filename",
    [
        "../outside.csv",
        r"..\outside.csv",
        r"folder\..\outside.csv",
        "/tmp/outside.csv",
        r"C:\outside.csv",
        r"C:outside.csv",
        "dataset.txt",
        "",
    ],
)
def test_csv_upload_filename_traversal_and_unsafe_extensions_are_rejected(tmp_path, filename):
    with pytest.raises(HTTPException) as exc_info:
        api_routes.build_csv_upload_path(tmp_path, filename)
    assert exc_info.value.status_code == 400
    assert list(tmp_path.iterdir()) == []


def test_valid_csv_upload_uses_generated_contained_name_and_preserves_auth_contract(monkeypatch, tmp_path):
    fake_identity(monkeypatch, role="admin", user_id="express-user-uuid")
    monkeypatch.setattr(api_routes, "DATA_UPLOAD_DIR", tmp_path)
    processed = {}

    def fake_process_and_save(state, source_csv):
        source = Path(source_csv)
        processed["state"] = state
        processed["path"] = source
        processed["content"] = source.read_text(encoding="utf-8")
        return [{"district": "Synthetic District"}]

    monkeypatch.setattr(api_routes, "process_and_save", fake_process_and_save)
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.post(
        "/api/upload-csv",
        headers={"Authorization": f"Bearer {synthetic_express_token(role='admin')}"},
        data={"state": "Maharashtra"},
        files={"file": ("dataset 2026.csv", "year,state_name,district_name,murder\n2026,Maharashtra,Synthetic District,1\n", "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["status"].startswith("Data processed successfully")
    assert processed["state"] == "Maharashtra"
    assert processed["content"] == "year,state_name,district_name,murder\n2026,Maharashtra,Synthetic District,1\n"
    assert processed["path"].parent == tmp_path.resolve()
    assert processed["path"].name != "dataset 2026.csv"
    assert list(tmp_path.iterdir()) == []


def test_csv_upload_runs_real_processor_only_in_temporary_directories(monkeypatch, tmp_path):
    from backend.app import dataset_loader, crime_processor

    fake_identity(monkeypatch, role="admin", user_id="express-user-uuid")
    upload_dir = tmp_path / "incoming"
    output_dir = tmp_path / "processed"
    raw_dir = tmp_path / "raw"
    scratch_upload_dir = tmp_path / "scratch"
    coords_file = tmp_path / "district_coords.json"
    coords_file.write_text('{"Maharashtra":{"Synthetic District":[18.5,73.8]}}', encoding="utf-8")
    monkeypatch.setattr(api_routes, "DATA_UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(dataset_loader, "PROCESSED_DIR", output_dir)
    monkeypatch.setattr(dataset_loader, "RAW_DIR", raw_dir)
    monkeypatch.setattr(dataset_loader, "UPLOADS_DIR", scratch_upload_dir)
    monkeypatch.setattr(crime_processor, "COORDS_FILE", coords_file)
    api_routes._processed_data.pop("maharashtra", None)

    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.post(
        "/api/upload-csv",
        headers={"Authorization": f"Bearer {synthetic_express_token(role='admin')}"},
        data={"state": "Maharashtra"},
        files={"file": ("synthetic.csv", "year,state_name,district_name,murder,robbery\n2024,Maharashtra,Synthetic District,2,3\n", "text/csv")},
    )
    assert response.status_code == 200
    assert "1 records loaded for Maharashtra" in response.json()["status"]
    generated = output_dir / "maharashtra_crimes_processed.csv"
    assert generated.exists()
    assert "Synthetic District,2024,18.5,73.8,2,3" in generated.read_text(encoding="utf-8")
    assert list(upload_dir.iterdir()) == []
    api_routes._processed_data.pop("maharashtra", None)


@pytest.mark.parametrize(
    ("state", "filename", "content", "expected_status"),
    [
        ("../../outside", "valid.csv", "year,state_name,district_name\n2024,Maharashtra,Pune\n", 400),
        ("Maharashtra", "invalid.txt", "year,state_name,district_name\n2024,Maharashtra,Pune\n", 400),
        ("Maharashtra", "missing.csv", "district_name,murder\nPune,1\n", 400),
        ("Maharashtra", "no-counts.csv", "year,state_name,district_name\n2024,Maharashtra,Pune\n", 400),
        ("Maharashtra", "malformed.csv", "year,state_name,district_name,murder\n2024,Maharashtra\n", 400),
        ("Maharashtra", "bad-count.csv", "year,state_name,district_name,murder\n2024,Maharashtra,Pune,nope\n", 400),
    ],
)
def test_csv_upload_rejects_unsafe_state_and_invalid_csv_before_processing(
    monkeypatch, tmp_path, state, filename, content, expected_status
):
    fake_identity(monkeypatch, role="admin", user_id="express-user-uuid")
    monkeypatch.setattr(api_routes, "DATA_UPLOAD_DIR", tmp_path / "incoming")
    monkeypatch.setattr(api_routes, "process_and_save", lambda **kwargs: pytest.fail("invalid CSV reached processor"))
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.post(
        "/api/upload-csv",
        headers={"Authorization": f"Bearer {synthetic_express_token(role='admin')}"},
        data={"state": state},
        files={"file": (filename, content, "text/csv")},
    )
    assert response.status_code == expected_status
    incoming = tmp_path / "incoming"
    assert not incoming.exists() or list(incoming.iterdir()) == []


def test_csv_upload_enforces_size_limit_and_removes_temporary_file(monkeypatch, tmp_path):
    fake_identity(monkeypatch, role="admin", user_id="express-user-uuid")
    upload_dir = tmp_path / "incoming"
    monkeypatch.setattr(api_routes, "DATA_UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(api_routes, "MAX_CSV_UPLOAD_BYTES", 32)
    monkeypatch.setattr(api_routes, "process_and_save", lambda **kwargs: pytest.fail("oversized CSV reached processor"))
    client = TestClient(create_app(["http://localhost:5173"]))
    response = client.post(
        "/api/upload-csv",
        headers={"Authorization": f"Bearer {synthetic_express_token(role='admin')}"},
        data={"state": "Maharashtra"},
        files={"file": ("large.csv", "x" * 33, "text/csv")},
    )
    assert response.status_code == 413
    assert list(upload_dir.iterdir()) == []


@pytest.mark.parametrize(("role", "token", "expected_status"), [("user", "present", 403), ("admin", "", 401)])
def test_csv_upload_requires_current_admin_identity(monkeypatch, tmp_path, role, token, expected_status):
    fake_identity(monkeypatch, role=role, user_id="express-user-uuid")
    upload_dir = tmp_path / "incoming"
    monkeypatch.setattr(api_routes, "DATA_UPLOAD_DIR", upload_dir)
    client = TestClient(create_app(["http://localhost:5173"]))
    headers = {"Authorization": f"Bearer {synthetic_express_token(role=role)}"} if token else {}
    response = client.post(
        "/api/upload-csv",
        headers=headers,
        data={"state": "Maharashtra"},
        files={"file": ("synthetic.csv", "year,state_name,district_name\n2024,Maharashtra,Pune\n", "text/csv")},
    )
    assert response.status_code == expected_status
    assert not upload_dir.exists()


def test_sensitive_upload_path_is_not_publicly_mounted(tmp_path):
    evidence_root = tmp_path / "uploads" / "reports"
    evidence_root.mkdir(parents=True)
    (evidence_root / "synthetic-evidence.png").write_bytes(b"synthetic")
    application = create_app(["http://localhost:5173"])
    assert not any(getattr(route, "path", None) == "/uploads" for route in application.routes)
    client = TestClient(application)
    response = client.get("/uploads/reports/synthetic-evidence.png")
    assert response.status_code == 404


def test_cors_allows_only_configured_origins_and_never_wildcards():
    client = TestClient(create_app(["https://frontend.example.test"]))
    allowed = client.options(
        "/api/health",
        headers={
            "Origin": "https://frontend.example.test",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    denied = client.options(
        "/api/health",
        headers={
            "Origin": "https://untrusted.example.test",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert allowed.headers.get("access-control-allow-origin") == "https://frontend.example.test"
    assert "access-control-allow-origin" not in denied.headers
    with pytest.raises(RuntimeError):
        create_app(["*"])

