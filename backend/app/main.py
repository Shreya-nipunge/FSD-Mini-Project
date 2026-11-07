"""Legacy FastAPI service retained for analytics compatibility and CSV upload."""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

env_path = os.getenv("ENV_FILE") or str(Path(__file__).resolve().parents[2] / ".env")
load_dotenv(dotenv_path=env_path)

from .dataset_loader import load_processed
from .routes import news
from .routes import router


def get_cors_origins():
    configured = os.getenv("CLIENT_ORIGIN", "http://localhost:5173")
    origins = [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]
    if not origins or "*" in origins:
        raise RuntimeError("CLIENT_ORIGIN must contain explicit browser origins; wildcard CORS is not allowed")
    return origins


def create_app(cors_origins=None):
    allowed_origins = cors_origins if cors_origins is not None else get_cors_origins()
    if not allowed_origins or "*" in allowed_origins:
        raise RuntimeError("CORS requires explicit origins; wildcard CORS is not allowed")
    application = FastAPI(title="CrimeMap India API", version="2.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    # Evidence uploads are served only by the authenticated Express evidence
    # endpoint. Do not mount backend/uploads as a public static directory here.
    application.include_router(router, prefix="/api")
    application.include_router(news.router)

    @application.on_event("startup")
    def startup_event():
        """Pre-warm analytics; other states load lazily on first request."""
        load_processed("Maharashtra")

    @application.get("/api/states")
    def get_states():
        import json

        coords_file = Path(__file__).resolve().parent.parent / "data" / "district_coords.json"
        if coords_file.exists():
            states = list(json.loads(coords_file.read_text(encoding="utf-8")).keys())
            return {"states": sorted(states), "total": len(states)}
        return {"states": [], "total": 0}

    return application


app = create_app()
