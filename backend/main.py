from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from sqlmodel import Session, text

load_dotenv()

from db import get_session
from auth import init_firebase, get_current_player, get_current_admin

app = FastAPI(title="ERP API")

# Configure CORS
# Allow frontend/admin in development, cloud run, and custom domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://erp-frontend-223240539839.us-east1.run.app",
        "https://erp-admin-223240539839.us-east1.run.app",
        "https://play.does-god-exist.org",
        "https://admin.does-god-exist.org"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_firebase()


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------

@app.get("/")
def read_default():
    return {
        "message": "Welcome to the ERP API",
        "endpoints": {
            "health": "/health",
            "hello": "/hello"
        }
    }


@app.get("/health")
def health_check(session: Session = Depends(get_session)):
    db_status = "connected"
    error = None
    try:
        session.exec(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
        error = str(e)

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "database_error": error,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/hello")
def read_root():
    return {"message": "Hello from the ERP Backend!"}


# ---------------------------------------------------------------------------
# Player-authenticated endpoints (Firebase token required)
# Frontends already use Firebase Google SSO (signInWithPopup) — they send
# the resulting ID token as Authorization: Bearer <token> to these routes.
# ---------------------------------------------------------------------------

@app.get("/api/players/me")
async def get_my_profile(token: dict = Depends(get_current_player)):
    """Stub — will be fully implemented in 7.3 (Player Profile API)."""
    return {
        "uid": token.get("uid"),
        "email": token.get("email"),
        "name": token.get("name"),
        "player_id": token.get("player_id"),
    }


# ---------------------------------------------------------------------------
# Admin-authenticated endpoints (admin email + IP whitelist)
# Admin frontend already has client-side email/IP check — this enforces
# the same rules server-side so bypassing the client check is useless.
# ---------------------------------------------------------------------------

@app.get("/api/admin/ping")
async def admin_ping(token: dict = Depends(get_current_admin)):
    """Stub — verifies admin auth pipeline is working end-to-end."""
    return {
        "message": "Admin access confirmed",
        "admin_email": token.get("email"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
