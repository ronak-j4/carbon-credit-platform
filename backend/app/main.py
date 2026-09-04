from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import projects

# Creates the local SQLite tables on startup if they don't already exist.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Carbon Credit Platform API",
    description="Backend for the blockchain-based carbon credit trading platform.",
    version="0.1.0",
)

# Allows the React frontend (running on a different port, e.g. localhost:3000)
# to call this API from the browser. Restrict origins in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api", tags=["projects"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Carbon Credit Platform API"}
