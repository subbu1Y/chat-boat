# Run Instructions

This project supports two frontends: **Streamlit** and **React (Vite)**. Both can run alongside the FastAPI backend.

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

## 2. Run Streamlit Frontend

Can run with or without the backend. If backend is down, Streamlit falls back to direct RAG.

```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
streamlit run app.py
```

- **URL:** http://localhost:8501

---

## 3. Run React (Vite) Frontend

Requires the backend to be running (for chat, tickets, dashboard).

```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0\frontend"
npm install
npm run dev
```

- **URL:** http://localhost:5173
- **Proxy:** `/api` → `http://localhost:8000`

---

## Quick Start (All Three)

**Terminal 1 – Backend:**
```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
python backend/api.py
```

**Terminal 2 – Streamlit:**
```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
streamlit run app.py
```

**Terminal 3 – React:**
```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0\frontend"
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Chat with RAG backend |
| POST | /api/tickets | Create a ticket |
| GET | /api/tickets | Get recent tickets |
| GET | /api/tickets/all | Get all tickets |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET | /api/config | Public config |
| GET | / | Health check |

---

## Prerequisites

1. **Python:** `pip install -r requirements.txt`
2. **Node.js:** For React frontend (`npm install` in `frontend/`)
3. **Knowledge base:** Run `python indexer.py` before first use
4. **Environment:** Copy `env_template.txt` to `.env` and set API keys
