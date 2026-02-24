# Run Instructions

**Primary frontend:** React + Vite. Streamlit is available as legacy/fallback.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Streamlit      │     │  React (Vite)   │     │  FastAPI        │
│  app.py         │     │  frontend/      │     │  backend/      │
│  (port 8501)    │     │  (port 5173)    │     │  (port 8000)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                        │                        │
         │   HTTP /api/chat       │   Proxy /api → :8000   │
         └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    RAG (rag_backend.py) + tickets.py
```

---

## 1. Run FastAPI Backend

Required for chat. Both Streamlit and React will use it.

```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
python backend/api.py
```

- **URL:** http://localhost:8000
- **Health check:** http://localhost:8000/

---

## 2. Run React (Vite) Frontend (Primary)

Requires the backend to be running.

```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0\frontend"
npm install
npm run dev
```

- **URL:** http://localhost:5173
- **Proxy:** `/api` → `http://localhost:8000`

---

## 3. Streamlit Frontend (Optional / Legacy)

Can run with or without the backend. If backend is down, Streamlit falls back to direct RAG.

```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
streamlit run app.py
```

- **URL:** http://localhost:8501

---

## Quick Start (React + Backend)

**Terminal 1 – Backend:**
```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
python backend/api.py
```

**Terminal 2 – React Frontend:**
```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0\frontend"
npm run dev
```

Open **http://localhost:5173**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Chat with RAG backend |
| GET | /api/chat/history/{session_id} | Get chat history (PostgreSQL) |
| POST | /api/tickets | Create a ticket |
| GET | /api/tickets | Get recent tickets |
| GET | /api/tickets/all | Get all tickets |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET | /api/config | Public config |
| GET | / | Health check |

---

## PostgreSQL Integration (Optional)

The chatbot and ticket dashboard can use PostgreSQL for persistent storage.

**1. Install PostgreSQL** (if not installed)

**2. Create database:**
```powershell
psql -U postgres -c "CREATE DATABASE helpdesk_db;"
```

**3. Configure .env:**
```
USE_DATABASE=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

**4. Run setup script:**
```powershell
python scripts/setup_db.py
```

**5. Restart the backend.** Tickets and chat history will be stored in PostgreSQL.

When `USE_DATABASE=false`, the app uses JSON file storage (tickets.json) — no database required.

---

## Prerequisites

1. **Python:** `pip install -r requirements.txt`
2. **Node.js:** For React frontend (`npm install` in `frontend/`)
3. **Knowledge base:** Run `python indexer.py` before first use
4. **Environment:** Copy `env_template.txt` to `.env` and set API keys
