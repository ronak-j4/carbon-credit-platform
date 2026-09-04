"""
Database setup using SQLAlchemy + SQLite.

We use SQLite here instead of PostgreSQL for local development because it
needs zero setup — no server to install or run. The code is written with
SQLAlchemy, so switching to PostgreSQL later is just a one-line change to
`database_url` in config.py (e.g. "postgresql://user:pass@localhost/dbname")
plus installing the `psycopg2-binary` driver — none of the model or query
code below needs to change.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session per-request
    and always closes it afterwards, even if an error occurs."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
