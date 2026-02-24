"""
FastAPI Backend for IT Help Desk Chatbot
Serves REST API for React frontend and Streamlit (when Streamlit uses /api/chat).
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_backend import RAGBackend
from tickets import create_ticket, get_tickets, get_all_tickets, get_dashboard_stats
from email_notifier import send_ticket_notification
import config

# Initialize RAG backend (set in lifespan)
rag_backend = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_backend
    try:
        rag_backend = RAGBackend()
        print("[API] RAG backend initialized successfully")
    except Exception as e:
        print(f"[API] Error loading RAG backend: {e}")
    yield


app = FastAPI(title="IT Help Desk API", version="1.0.0", lifespan=lifespan)

# CORS configuration - allow React frontend (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []  # RAG returns source filenames as strings

class TicketRequest(BaseModel):
    subject: str
    description: str
    priority: str = "Medium"
    category: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    subject: str
    description: str
    priority: str
    status: str
    created_at: str
    category: Optional[str] = None

class DashboardStats(BaseModel):
    overdue: int
    due_today: int
    open: int
    on_hold: int
    unassigned: int
    all: int
    by_priority: dict
    by_status: dict
    by_category: dict


# API Routes

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "IT Help Desk API",
        "version": "1.0.0"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint - sends message to RAG backend and returns response
    """
    if not rag_backend:
        raise HTTPException(status_code=503, detail="RAG backend not initialized")
    
    try:
        result = rag_backend.query(request.message, request.history)
        return ChatResponse(
            response=result['response'],
            sources=result.get('sources', [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tickets", response_model=TicketResponse)
async def create_new_ticket(ticket: TicketRequest, background_tasks: BackgroundTasks):
    """
    Create a new ticket
    """
    try:
        new_ticket = create_ticket(
            subject=ticket.subject,
            description=ticket.description,
            priority=ticket.priority,
            category=ticket.category
        )
        
        # Send email notification in background
        background_tasks.add_task(send_ticket_notification, new_ticket)
        
        return TicketResponse(**new_ticket)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tickets", response_model=List[TicketResponse])
async def get_tickets_list(limit: int = 10):
    """
    Get list of recent tickets
    """
    try:
        tickets = get_tickets(limit=limit)
        return [TicketResponse(**t) for t in tickets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tickets/all", response_model=List[TicketResponse])
async def get_all_tickets_list():
    """
    Get all tickets for dashboard
    """
    try:
        tickets = get_all_tickets()
        return [TicketResponse(**t) for t in tickets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_statistics():
    """
    Get dashboard statistics
    """
    try:
        stats = get_dashboard_stats()
        return DashboardStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config")
async def get_config():
    """
    Get public configuration
    """
    return {
        "llm_provider": config.LLM_PROVIDER,
        "notification_email": os.getenv("NOTIFICATION_EMAIL", ""),
        "use_database": os.getenv("USE_DATABASE", "false")
    }


if __name__ == "__main__":
    import uvicorn
    # Use import string so reload works. Run from project root: python backend/api.py
    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)
