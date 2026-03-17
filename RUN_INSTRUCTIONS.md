# Run Instructions

**Primary Frontend:** React + Vite  
**Legacy Frontend:** Streamlit (also supported — runs independently)  
**Backend:** FastAPI + Uvicorn  
**Database:** PostgreSQL (optional, JSON fallback available)

---

## Quick Start

### Terminal 1 — Backend
```powershell
cd "C:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 — Frontend
```powershell
cd "C:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0\frontend"
npm run dev
```

Or use the combined launcher:
```powershell
start_all.bat
```

---

## Option B — Streamlit (Legacy, runs alongside React)

```powershell
cd "C:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
streamlit run app.py
```

Opens at **http://localhost:8501**  
Streamlit calls the FastAPI backend (`/api/chat`) when it's running, or falls back to direct RAG if the backend is down.  
React Vite and Streamlit can run at the same time — they use different ports.

---

## URLs

| Service | URL |
|---------|-----|
| Helpdesk Portal | http://localhost:5173/helpdesk |
| Login Page | http://localhost:5173/auth/login |
| Register | http://localhost:5173/auth/register |
| Admin Chat + Dashboard | http://localhost:5173/dashboard |
| API Backend | http://localhost:8000 |
| API Swagger Docs | http://localhost:8000/docs |

---

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  React + Vite   │       │    FastAPI        │       │   PostgreSQL     │
│  frontend/      │──────▶│  backend/api.py   │──────▶│   helpdesk_db   │
│  port: 5173     │ /api  │  port: 8000       │       │   port: 5432    │
└─────────────────┘       └────────┬─────────┘       └──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
             ┌──────▼──────┐             ┌────────▼───────┐
             │ RAG Backend  │             │  Email Notifier │
             │ rag_backend  │             │ email_notifier  │
             │ (Groq LLM)   │             │  (SMTP Gmail)   │
             └─────────────┘             └────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user |
| POST | /api/chat | RAG chatbot |
| POST | /api/helpdesk/ticket | Create helpdesk ticket |
| POST | /api/helpdesk/quick-ticket | One-click Quick Incident |
| GET | /api/my-tickets | Get tickets by user email |
| GET | /api/tickets/track/{id} | Track ticket by ID |
| PATCH | /api/tickets/{id}/status | Update ticket status |
| GET | /api/dashboard/stats | KPI + chart statistics |
| GET | /api/tickets/all | All tickets for admin |

---

## PostgreSQL Integration (Optional)

**1. Create database:**
```powershell
psql -U postgres -c "CREATE DATABASE helpdesk_db;"
```

**2. Configure .env:**
```
USE_DATABASE=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

**3. Run setup script:**
```powershell
python scripts/setup_db.py
```

When `USE_DATABASE=false`, the app uses JSON file storage — no database required.

---

## Prerequisites

1. **Python dependencies:** `pip install -r requirements.txt`
2. **Node.js dependencies:** `cd frontend && npm install`
3. **Knowledge base:** `python indexer.py` (run once before first use)
4. **Environment:** Copy `env_template.txt` to `.env` and set API keys + SMTP

---

## Environment Variables (.env)

```env
# LLM (choose one)
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key

# Email notifications
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
NOTIFICATION_EMAIL=subrahmanyam.pillalamarri@cognida.ai

# Database (optional)
USE_DATABASE=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT auth
JWT_SECRET_KEY=cognida-helpdesk-secret-key-2026
```
