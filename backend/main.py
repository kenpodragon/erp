from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine, select, text
from typing import List, Optional

load_dotenv()

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

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

@app.on_event("startup")
def on_startup():
    # This would create tables if we had models defined
    # SQLModel.metadata.create_all(engine)
    pass

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
