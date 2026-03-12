import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlmodel import Session, select, text

from db import get_session
from auth import init_firebase
from models import SupportTicket, ActivityEvent
from utils import load_profanity_blocklist
import config_cache

# Import all routers
from routes.public import router as public_router
from routes.auth import router as auth_router
from routes.players import router as players_router
from routes.characters import router as characters_router
from routes.game import router as game_router
from routes.support import router as support_router
from routes.admin_access import router as admin_access_router
from routes.admin_config import router as admin_config_router
from routes.admin_support import router as admin_support_router
from routes.admin_players import router as admin_players_router
from routes.admin_analytics import router as admin_analytics_router
from routes.story_mode import router as story_mode_router
from routes.game_training import router as game_training_router
from routes.character_progression import router as character_progression_router
from routes.inventory import router as inventory_router
from routes.admin_game import router as admin_game_router
from routes.admin_audio import router as admin_audio_router
from routes.audio import router as audio_router
from routes.discovery import router as discovery_router
from routes.chat import router as chat_router
from routes.admin_chat import router as admin_chat_router
from routes.home_base import router as home_base_router
from routes.admin_home_base import router as admin_home_base_router
from routes.payments import router as payments_router
from routes.webhooks import router as webhooks_router
from routes.admin_payments import router as admin_payments_router
from routes.subscriptions import router as subscriptions_router
from routes.admin_subscriptions import router as admin_subscriptions_router
from routes.shop import router as shop_router
from routes.admin_shop import router as admin_shop_router
from routes.donations import router as donations_router
from routes.admin_donations import router as admin_donations_router
from routes.marketplace import router as marketplace_router
from routes.admin_marketplace import router as admin_marketplace_router

logger = logging.getLogger(__name__)


# --- Background Tasks ---

async def auto_close_tickets_task():
    """Periodically check for resolved tickets to auto-close."""
    while True:
        try:
            from db import engine
            with Session(engine) as session:
                now = datetime.now(timezone.utc)
                cutoff = now - timedelta(days=7)
                tickets = session.exec(
                    select(SupportTicket)
                    .where(SupportTicket.status == "resolved")
                    .where(SupportTicket.resolved_at <= cutoff)
                ).all()
                for t in tickets:
                    t.status = "closed"
                    t.closed_at = now
                    t.updated_at = now
                    session.add(t)
                session.commit()
                if tickets:
                    logger.info("Auto-closed %d resolved tickets", len(tickets))
        except Exception as e:
            logger.error("Error in auto_close_tickets_task: %s", e)
        await asyncio.sleep(3600) # Every hour

async def retention_policy_task():
    """Periodically delete activity events older than 90 days (NFR-7)."""
    while True:
        try:
            from db import engine
            with Session(engine) as session:
                cutoff = datetime.now(timezone.utc) - timedelta(days=90)
                result = session.execute(
                    text("DELETE FROM activity_events WHERE created_at < :cutoff"),
                    {"cutoff": cutoff}
                )
                session.commit()
                if result.rowcount > 0:
                    logger.info("Deleted %d activity events older than 90 days", result.rowcount)
        except Exception as e:
            logger.error("Error in retention_policy_task: %s", e)
        await asyncio.sleep(86400) # Every day

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    init_firebase()
    load_profanity_blocklist()
    # Load server config into memory cache
    try:
        from sqlmodel import Session
        from db import engine
        with Session(engine) as session:
            config_cache.load_config(session)
    except Exception as e:
        logger.warning("Could not load config cache on startup (this is normal in some test environments): %s", e)

    # Start background tasks
    asyncio.create_task(auto_close_tickets_task())
    asyncio.create_task(retention_policy_task())

    yield
    # Shutdown logic (if any)

app = FastAPI(title="ERP API", lifespan=lifespan)

# Configure CORS
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


# Maintenance mode middleware — blocks player endpoints when maintenance is active
class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if (
            path.startswith("/api/")
            and not path.startswith("/api/config/public")
            and not path.startswith("/api/admin/")
        ):
            if config_cache.get_config_bool("ops.maintenance_mode"):
                message = config_cache.get_config(
                    "ops.maintenance_message",
                    "Elysium is undergoing maintenance. Please return shortly.",
                )
                return JSONResponse(
                    status_code=503,
                    content={"error": message},
                )
        return await call_next(request)

app.add_middleware(MaintenanceModeMiddleware)

# Static file serving for uploads
uploads_dir = os.getenv("UPLOADS_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Register all routers
app.include_router(public_router)
app.include_router(auth_router)
app.include_router(players_router)
app.include_router(characters_router)
app.include_router(game_router)
app.include_router(support_router)
app.include_router(admin_access_router)
app.include_router(admin_config_router)
app.include_router(admin_support_router)
app.include_router(admin_players_router)
app.include_router(admin_analytics_router)
app.include_router(story_mode_router)
app.include_router(game_training_router)
app.include_router(character_progression_router)
app.include_router(inventory_router)
app.include_router(admin_game_router)
app.include_router(admin_audio_router)
app.include_router(audio_router)
app.include_router(discovery_router)
app.include_router(chat_router)
app.include_router(admin_chat_router)
app.include_router(home_base_router)
app.include_router(admin_home_base_router)
app.include_router(payments_router)
app.include_router(webhooks_router)
app.include_router(admin_payments_router)
app.include_router(subscriptions_router)
app.include_router(admin_subscriptions_router)
app.include_router(shop_router)
app.include_router(admin_shop_router)
app.include_router(donations_router)
app.include_router(admin_donations_router)
app.include_router(marketplace_router)
app.include_router(admin_marketplace_router)


@app.get("/debug-routes")
def list_routes():
    return [{"path": route.path, "name": route.name} for route in app.routes]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
