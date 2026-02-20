# PostgreSQL Database Setup Guide

## Overview
The IT Help Desk system now supports **PostgreSQL database** for storing:
- **Tickets** (instead of JSON file)
- **Chat History** (persistent chat logs)
- **Users** (for future features)

By default, the system uses **JSON file storage** (no setup required). Follow this guide to enable PostgreSQL.

---

## Prerequisites

### 1. Install PostgreSQL

#### Windows:
- Download from: https://www.postgresql.org/download/windows/
- Run installer (EDB PostgreSQL recommended)
- During installation:
  - Set a password for 'postgres' user (remember this!)
  - Default port: 5432 (keep default)
  - Install pgAdmin 4 (GUI tool)

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Install Python Dependencies
```bash
cd "Chat-bot 2.0"
pip install psycopg2-binary sqlalchemy
```

Or install all:
```bash
pip install -r requirements.txt
```

---

## Quick Setup (5 minutes)

### Step 1: Configure Database Settings

Edit your `.env` file and add:

```env
# Enable PostgreSQL
USE_DATABASE=true

# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
```

**Replace** `your_postgres_password_here` with the password you set during PostgreSQL installation.

### Step 2: Initialize Database

Run the initialization script:

```bash
python init_database.py
```

This will:
- Create the `helpdesk_db` database
- Create tables: `tickets`, `chat_history`, `users`
- Create indexes for performance
- Test the connection

You should see:
```
Database initialization complete!
```

### Step 3: Restart Streamlit

```bash
streamlit run app.py
```

That's it! The system now uses PostgreSQL.

---

## Database Schema

### Tickets Table
```sql
CREATE TABLE tickets (
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
);
```

### Chat History Table
```sql
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Features

### Automatic Fallback
If PostgreSQL is unavailable, the system automatically falls back to JSON file storage.

### Data Migration
To migrate existing tickets from `tickets.json` to PostgreSQL:

```python
# Run this in Python console
import json
from tickets import create_ticket

# Load existing tickets
with open('tickets.json', 'r') as f:
    old_tickets = json.load(f)

# Import to database
for ticket in old_tickets:
    create_ticket(
        subject=ticket['subject'],
        description=ticket['description'],
        priority=ticket.get('priority', 'Medium'),
        category=ticket.get('category')
    )
```

### Viewing Data

#### Using pgAdmin 4 (GUI):
1. Open pgAdmin 4
2. Connect to PostgreSQL server
3. Navigate to: `Databases > helpdesk_db > Schemas > public > Tables`
4. Right-click table → `View/Edit Data`

#### Using Command Line:
```bash
psql -U postgres -d helpdesk_db
```

Then run queries:
```sql
-- View all tickets
SELECT * FROM tickets ORDER BY created_at DESC;

-- View ticket statistics
SELECT status, COUNT(*) FROM tickets GROUP BY status;

-- View recent chat history
SELECT * FROM chat_history ORDER BY created_at DESC LIMIT 10;
```

---

## Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running:
  ```bash
  # Windows
  services.msc → Look for "postgresql"
  
  # macOS/Linux
  brew services list
  # or
  sudo systemctl status postgresql
  ```
- Verify password in `.env` matches PostgreSQL password
- Check port 5432 is not blocked by firewall

### "Authentication failed"
- Wrong password in `.env`
- User 'postgres' doesn't have access
- Try: `ALTER USER postgres WITH PASSWORD 'your_password';`

### "Database does not exist"
- Run `python init_database.py` to create it
- Or create manually: `CREATE DATABASE helpdesk_db;`

### Import errors (psycopg2)
```bash
# Windows - reinstall
pip uninstall psycopg2-binary
pip install psycopg2-binary

# Linux - install system dependencies
sudo apt-get install libpq-dev python3-dev
pip install psycopg2-binary
```

---

## Switching Between JSON and Database

### To use JSON (default):
```env
USE_DATABASE=false
```
Restart Streamlit. Data stored in `tickets.json`.

### To use PostgreSQL:
```env
USE_DATABASE=true
```
Restart Streamlit. Data stored in PostgreSQL database.

---

## Performance Benefits

Using PostgreSQL provides:
- **Faster queries** for large datasets (1000+ tickets)
- **Concurrent access** (multiple users)
- **Data integrity** (ACID transactions)
- **Advanced analytics** (SQL queries for reporting)
- **Scalability** (handles millions of records)

For small deployments (<100 tickets), JSON file storage is sufficient.

---

## Security Recommendations

1. **Change default password**: Don't use default PostgreSQL passwords
2. **Firewall**: Only allow localhost connections (no external access)
3. **Backups**: Set up automatic database backups
4. **SSL**: Enable SSL connections for production
5. **User permissions**: Create separate DB user for the app (not 'postgres')

---

## Backup & Restore

### Backup
```bash
pg_dump -U postgres helpdesk_db > backup.sql
```

### Restore
```bash
psql -U postgres helpdesk_db < backup.sql
```

---

## Questions?

Check the official PostgreSQL documentation: https://www.postgresql.org/docs/

Or contact your database administrator.
