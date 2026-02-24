"""
PostgreSQL Database Configuration and Connection Manager
Handles database connections, table creation, and queries.
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from dotenv import load_dotenv

# Load .env from project root (same as config.py)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path, override=True)

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "helpdesk_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
USE_DATABASE = os.getenv("USE_DATABASE", "false").lower() == "true"

# Connection Pool
_connection_pool = None


def get_connection_pool():
    """Get or create connection pool."""
    global _connection_pool
    if _connection_pool is None:
        try:
            _connection_pool = SimpleConnectionPool(
                1, 20,  # min and max connections
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD
            )
            print(f"[DATABASE] Connected to PostgreSQL at {DB_HOST}:{DB_PORT}/{DB_NAME}")
        except Exception as e:
            print(f"[DATABASE] Failed to connect to PostgreSQL: {e}")
            print("[DATABASE] Falling back to JSON file storage")
            return None
    return _connection_pool


def get_connection():
    """Get a connection from the pool."""
    pool = get_connection_pool()
    if pool:
        return pool.getconn()
    return None


def release_connection(conn):
    """Release connection back to pool."""
    pool = get_connection_pool()
    if pool and conn:
        pool.putconn(conn)


def init_database():
    """Initialize database tables if they don't exist."""
    if not USE_DATABASE:
        print("[DATABASE] Database mode disabled. Using JSON file storage.")
        return False
    
    conn = get_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            # Create tickets table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tickets (
                    id SERIAL PRIMARY KEY,
                    ticket_id VARCHAR(50) UNIQUE NOT NULL,
                    subject VARCHAR(500) NOT NULL,
                    description TEXT NOT NULL,
                    priority VARCHAR(20) DEFAULT 'Medium',
                    status VARCHAR(20) DEFAULT 'Open',
                    category VARCHAR(50),
                    assigned_to VARCHAR(100),
                    due_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create chat_history table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(100),
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    sources TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tickets_status 
                ON tickets(status)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tickets_created 
                ON tickets(created_at DESC)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_chat_session 
                ON chat_history(session_id, created_at)
            """)
            
            conn.commit()
            print("[DATABASE] Database tables initialized successfully")
            return True
            
    except Exception as e:
        print(f"[DATABASE] Error initializing database: {e}")
        conn.rollback()
        return False
    finally:
        release_connection(conn)


def execute_query(query: str, params: tuple = None, fetch: bool = True):
    """Execute a query and return results."""
    conn = get_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
                conn.commit()
                return result
            else:
                conn.commit()
                return cur.rowcount
    except Exception as e:
        print(f"[DATABASE] Query error: {e}")
        conn.rollback()
        return None
    finally:
        release_connection(conn)


def test_connection() -> bool:
    """Test database connection."""
    if not USE_DATABASE:
        return False
    
    conn = get_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
            return result is not None
    except Exception as e:
        print(f"[DATABASE] Connection test failed: {e}")
        return False
    finally:
        release_connection(conn)


def save_chat_message(session_id: str, role: str, content: str, sources: Optional[str] = None) -> bool:
    """Save a chat message (user or assistant) to chat_history."""
    if not USE_DATABASE:
        return False
    query = """
        INSERT INTO chat_history (session_id, role, content, sources)
        VALUES (%s, %s, %s, %s)
    """
    sources_str = json.dumps(sources) if isinstance(sources, (list, dict)) else sources
    params = (session_id, role, content, sources_str)
    result = execute_query(query, params, fetch=False)
    return result is not None


def get_chat_history(session_id: str, limit: int = 50) -> List[Dict]:
    """Load chat history for a session (for future session restore)."""
    if not USE_DATABASE:
        return []
    query = """
        SELECT role, content, sources, created_at
        FROM chat_history
        WHERE session_id = %s
        ORDER BY created_at ASC
        LIMIT %s
    """
    results = execute_query(query, (session_id, limit))
    if not results:
        return []
    messages = []
    for row in results:
        m = {"role": row["role"], "content": row["content"]}
        if row.get("sources"):
            try:
                m["sources"] = json.loads(row["sources"]) if isinstance(row["sources"], str) else row["sources"]
            except (json.JSONDecodeError, TypeError):
                pass
        messages.append(m)
    return messages


# Initialize database on import
if USE_DATABASE:
    init_database()
