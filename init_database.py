"""
Database Initialization Script
Creates PostgreSQL database and tables for the Help Desk system.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "helpdesk_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")


def create_database():
    """Create database if it doesn't exist."""
    print(f"Connecting to PostgreSQL at {DB_HOST}:{DB_PORT}...")
    
    try:
        # Connect to default 'postgres' database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database="postgres",
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        with conn.cursor() as cur:
            # Check if database exists
            cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
            exists = cur.fetchone()
            
            if not exists:
                print(f"Creating database '{DB_NAME}'...")
                cur.execute(f"CREATE DATABASE {DB_NAME}")
                print(f"Database '{DB_NAME}' created successfully!")
            else:
                print(f"Database '{DB_NAME}' already exists.")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error creating database: {e}")
        return False


def create_tables():
    """Create tables in the database."""
    print(f"\nConnecting to database '{DB_NAME}'...")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        with conn.cursor() as cur:
            print("Creating tables...")
            
            # Tickets table
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
            print("  - tickets table created")
            
            # Chat history table
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
            print("  - chat_history table created")
            
            # Users table (optional for future)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("  - users table created")
            
            # Create indexes
            print("\nCreating indexes...")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id, created_at)
            """)
            print("  - indexes created")
            
            conn.commit()
            print("\nAll tables created successfully!")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        return False


def test_connection():
    """Test database connection."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()
            print(f"\nPostgreSQL version: {version[0]}")
            
            cur.execute("SELECT COUNT(*) FROM tickets")
            ticket_count = cur.fetchone()[0]
            print(f"Total tickets in database: {ticket_count}")
            
            cur.execute("SELECT COUNT(*) FROM chat_history")
            chat_count = cur.fetchone()[0]
            print(f"Total chat messages in database: {chat_count}")
        
        conn.close()
        print("\nDatabase connection test successful!")
        return True
        
    except Exception as e:
        print(f"Connection test failed: {e}")
        return False


def main():
    print("="*60)
    print("IT Help Desk Database Initialization")
    print("="*60)
    
    print("\nConfiguration:")
    print(f"  Host: {DB_HOST}")
    print(f"  Port: {DB_PORT}")
    print(f"  Database: {DB_NAME}")
    print(f"  User: {DB_USER}")
    print(f"  Password: {'*' * len(DB_PASSWORD) if DB_PASSWORD else '(not set)'}")
    
    if not DB_PASSWORD:
        print("\nWARNING: DB_PASSWORD not set in .env file!")
        print("Please set DB_PASSWORD before continuing.")
        return
    
    print("\n" + "="*60)
    
    # Step 1: Create database
    if not create_database():
        print("\nFailed to create database. Exiting.")
        return
    
    # Step 2: Create tables
    if not create_tables():
        print("\nFailed to create tables. Exiting.")
        return
    
    # Step 3: Test connection
    test_connection()
    
    print("\n" + "="*60)
    print("Database initialization complete!")
    print("\nTo enable database mode:")
    print("  1. Add to .env file: USE_DATABASE=true")
    print("  2. Restart Streamlit: streamlit run app.py")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
