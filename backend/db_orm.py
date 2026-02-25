"""
SQLAlchemy engine and session management for IT Help Desk.
Uses the same DB credentials as database.py (.env).
"""
import os
from pathlib import Path
from contextlib import contextmanager
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Load from project root .env
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "helpdesk_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
USE_DATABASE = os.getenv("USE_DATABASE", "false").lower() == "true"

# URL-encode password to handle special characters (e.g. @ in Subbu@2000)
DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = None
SessionLocal = None


def init_orm():
    """Initialize SQLAlchemy engine and create tables."""
    global engine, SessionLocal
    if not USE_DATABASE:
        print("[ORM] USE_DATABASE=false — ORM not initialized.")
        return False
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        # Create tables
        from backend.models import Base
        Base.metadata.create_all(bind=engine)
        print(f"[ORM] Connected to PostgreSQL at {DB_HOST}:{DB_PORT}/{DB_NAME}")
        print("[ORM] Tables ensured: tickets, chat_history")
        return True
    except Exception as e:
        print(f"[ORM] Failed to connect: {e}")
        return False


@contextmanager
def get_db() -> Session:
    """Yield a database session."""
    if SessionLocal is None:
        raise RuntimeError("ORM not initialized. Call init_orm() first.")
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def orm_available() -> bool:
    return USE_DATABASE and SessionLocal is not None
