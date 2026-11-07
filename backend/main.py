# backend/main.py
# Entry point for FastAPI. This module delegates to the app package so the
# legacy command `uvicorn main:app --reload --port 8000` continues to work.

from app.main import app
