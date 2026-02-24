#!/usr/bin/env python3
"""
PostgreSQL Database Setup Script for IT Help Desk Chatbot.
Run this script to create the database and tables before enabling USE_DATABASE=true.

Prerequisites:
  - PostgreSQL installed and running
  - Create the database: createdb helpdesk_db  (or use psql)

Usage:
  1. Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
  2. Create database: psql -U postgres -c "CREATE DATABASE helpdesk_db;"
  3. Run: python scripts/setup_db.py
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from database import init_database, USE_DATABASE, test_connection

def main():
    print("=" * 50)
    print("PostgreSQL Setup for IT Help Desk Chatbot")
    print("=" * 50)

    if not USE_DATABASE:
        print("\n[!] USE_DATABASE is false in .env")
        print("    Set USE_DATABASE=true in .env, then run this script again.")
        sys.exit(1)

    print("\n1. Testing connection...")
    if not test_connection():
        print("   [FAIL] Cannot connect to PostgreSQL.")
        print("   Check:")
        print("   - PostgreSQL is running")
        print("   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env")
        print("   - Database exists: psql -U postgres -c 'CREATE DATABASE helpdesk_db;'")
        sys.exit(1)
    print("   [OK] Connected")

    print("\n2. Creating tables...")
    if init_database():
        print("   [OK] Tables created: tickets, chat_history")
    else:
        print("   [FAIL] Could not create tables")
        sys.exit(1)

    print("\n" + "=" * 50)
    print("Setup complete! Your chatbot and ticket dashboard will use PostgreSQL.")
    print("=" * 50)

if __name__ == "__main__":
    main()
