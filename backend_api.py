"""
IT Help Desk – Standalone FastAPI Backend
==========================================
Single-file, production-ready backend that consolidates:
  • All FastAPI routes from backend/api.py
  • _query_chat RAG-fallback logic extracted from the legacy Streamlit app.py
  • build_email_to_it_link utility exposed as a REST endpoint
  • Ticket-intent detection extracted from app.py chat input handler

No Streamlit dependency anywhere in this file.

Run:
    uvicorn backend_api:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import asyncio
import json
import os
import urllib.parse
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

import requests as _requests  # stdlib alias to avoid shadowing FastAPI's Request
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

import config


# ─────────────────────────────────────────────────────────────────────────────
# Startup / Shutdown
# ─────────────────────────────────────────────────────────────────────────────

rag_backend = None  # module-level singleton, initialised in lifespan


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_backend

    # 1. SQLAlchemy ORM (PostgreSQL)
    try:
        from backend.db_orm import USE_DATABASE, init_orm
        if USE_DATABASE:
            init_orm()
            print("[API] ORM (SQLAlchemy) initialised.")
        else:
            print("[API] USE_DATABASE=false — using JSON storage.")
    except Exception as exc:
        print(f"[API] ORM init skipped: {exc}")

    # 2. Legacy psycopg2 connection (for non-ORM helpers like save_chat_message)
    try:
        from database import USE_DATABASE as _USE_DB, init_database
        if _USE_DB:
            init_database()
    except Exception:
        pass

    # 3. RAG backend
    try:
        from rag_backend import RAGBackend
        rag_backend = RAGBackend()
        print("[API] RAG backend initialised successfully.")
    except Exception as exc:
        print(f"[API] RAG backend error: {exc}")

    yield


# ─────────────────────────────────────────────────────────────────────────────
# App & Middleware
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="IT Help Desk API",
    description="Cognida.ai IT Help Desk – RAG-powered chatbot & ticket management",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []
    fallback_used: bool = False  # True when direct RAG fallback was invoked


class IntentRequest(BaseModel):
    message: str


class IntentResponse(BaseModel):
    is_ticket_intent: bool
    matched_phrase: Optional[str] = None


class EmailLinkResponse(BaseModel):
    mailto_url: str


class TicketRequest(BaseModel):
    subject: str
    description: str
    priority: str = "Medium"
    category: Optional[str] = None
    ticket_type: Optional[str] = "incident"  # incident | service_request


class TicketStatusUpdate(BaseModel):
    status: str  # Open | Pending | Resolved | Closed


class TicketResponse(BaseModel):
    id: str
    subject: str
    description: str
    priority: str
    status: str
    created_at: str
    category: Optional[str] = None
    assigned_to: Optional[str] = None


class QuickTicketRequest(BaseModel):
    description: str
    department: Optional[str] = ""
    metadata: Optional[dict] = {}


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


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    emp_id: Optional[str] = None
    role: str = "user"  # user | admin


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    emp_id: Optional[str] = None
    role: str
    created_at: str


# ─────────────────────────────────────────────────────────────────────────────
# Assignment Routing
# (same map as backend/api.py – kept complete for backward compatibility)
# ─────────────────────────────────────────────────────────────────────────────

ASSIGNMENT_MAP: dict[str, str] = {
    # ── Aditya Kovoor ─────────────────────────────────────────────────────────
    "💻 Hardware Issues":                 "aditya.kovoor@cognida.ai",
    "🌐 Network & Internet":              "aditya.kovoor@cognida.ai",
    "🛡️ Security Issues":                "aditya.kovoor@cognida.ai",
    "🖨️ Printer & Scanning Issues":      "aditya.kovoor@cognida.ai",
    "🔧 IT Maintenance / System Updates": "aditya.kovoor@cognida.ai",
    "📱 Mobile Device Issues":            "aditya.kovoor@cognida.ai",
    # ── Subrahmanyam Pillalamarri ─────────────────────────────────────────────
    "🖥️ Software Issues":                "subrahmanyam.pillalamarri@cognida.ai",
    "📧 Email & Collaboration":           "subrahmanyam.pillalamarri@cognida.ai",
    "☁️ Cloud Services":                  "subrahmanyam.pillalamarri@cognida.ai",
    "❓ Other / General IT Support":      "subrahmanyam.pillalamarri@cognida.ai",
    # ── Service Request categories ────────────────────────────────────────────
    "🆕 New Hardware Request":            "aditya.kovoor@cognida.ai",
    "💾 New Software Request":            "subrahmanyam.pillalamarri@cognida.ai",
    "🆔 New Email ID / Account Setup":    "subrahmanyam.pillalamarri@cognida.ai",
    "🔐 Access & Permission Requests":    "subrahmanyam.pillalamarri@cognida.ai",
    "🔑 Password & Account Management":   "subrahmanyam.pillalamarri@cognida.ai",
    "🌐 Network & Connectivity Setup":    "aditya.kovoor@cognida.ai",
    "🖥️ IT Onboarding / Offboarding":    "subrahmanyam.pillalamarri@cognida.ai",
    "🛒 Procurement Request":             "aditya.kovoor@cognida.ai",
    "💡 IT Consultation":                 "subrahmanyam.pillalamarri@cognida.ai",
    "❓ Other Service Request":           "subrahmanyam.pillalamarri@cognida.ai",
    # ── Legacy keys (backwards compatibility) ─────────────────────────────────
    "Network & Connectivity":             "aditya.kovoor@cognida.ai",
    "Server & Infrastructure":            "aditya.kovoor@cognida.ai",
    "Security":                           "aditya.kovoor@cognida.ai",
    "Hardware & Devices":                 "aditya.kovoor@cognida.ai",
    "Software & Applications":            "subrahmanyam.pillalamarri@cognida.ai",
    "Email & Communication":              "subrahmanyam.pillalamarri@cognida.ai",
    "Access & Permissions":               "subrahmanyam.pillalamarri@cognida.ai",
    "Other":                              "subrahmanyam.pillalamarri@cognida.ai",
    "Network":                            "aditya.kovoor@cognida.ai",
    "Hardware":                           "aditya.kovoor@cognida.ai",
    "Software":                           "subrahmanyam.pillalamarri@cognida.ai",
}

# Phrases that signal the user wants to raise a ticket (extracted from app.py)
TICKET_INTENT_PHRASES: List[str] = [
    "create a ticket",
    "create ticket",
    "raise a ticket",
    "submit a ticket",
    "open a ticket",
    "new ticket",
    "log a ticket",
    "file a ticket",
    "report an issue",
]

VALID_STATUSES = {"Open", "Pending", "Resolved", "Closed"}


def _auto_assign(category: Optional[str]) -> str:
    """Return the assignee email based on ticket category."""
    if not category:
        return "subrahmanyam.pillalamarri@cognida.ai"
    return ASSIGNMENT_MAP.get(category, "subrahmanyam.pillalamarri@cognida.ai")


# ─────────────────────────────────────────────────────────────────────────────
# Async helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _run_blocking(callable_obj, *args, timeout: float = 8.0):
    """Run a blocking (synchronous) DB call off the event loop with a timeout."""
    return await asyncio.wait_for(
        asyncio.to_thread(callable_obj, *args),
        timeout=timeout,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Chat service layer
# (Mirrors _query_chat from app.py; primary path = RAG backend already loaded,
#  fallback = re-instantiate RAGBackend if the global was lost somehow,
#  final fallback = informative error message.)
# ─────────────────────────────────────────────────────────────────────────────

def _query_chat_sync(message: str, history: list) -> dict:
    """
    Synchronous chat logic extracted from app.py's _query_chat().

    Execution order:
      1. Use the already-initialised global rag_backend (fastest path).
      2. Re-instantiate RAGBackend if the global is None (warm-up fallback).
      3. Return a graceful error dict if both fail.

    Returns: {"response": str, "sources": list, "fallback_used": bool}
    """
    global rag_backend

    # Primary path – use the pre-loaded singleton
    if rag_backend is not None:
        try:
            result = rag_backend.query(message, history)
            return {
                "response": result.get("response", ""),
                "sources": result.get("sources", []),
                "fallback_used": False,
            }
        except Exception as exc:
            print(f"[CHAT] Primary RAG query failed: {exc}")

    # Fallback – try re-instantiating RAGBackend
    try:
        from rag_backend import RAGBackend
        rag_backend = RAGBackend()
        result = rag_backend.query(message, history)
        return {
            "response": result.get("response", ""),
            "sources": result.get("sources", []),
            "fallback_used": True,
        }
    except Exception as rag_err:
        return {
            "response": (
                f"The RAG backend is currently unavailable: {rag_err}. "
                "Please ensure the model and knowledge base are loaded correctly."
            ),
            "sources": [],
            "fallback_used": True,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Email link utility (extracted from app.py's build_email_to_it_link)
# ─────────────────────────────────────────────────────────────────────────────

def build_email_to_it_link(user_question: str, response_preview: str = "") -> str:
    """
    Build a mailto: link for escalating a chatbot issue to the IT team.
    Extracted verbatim from app.py — no changes to business logic.
    """
    to = "Cognida_IT@cognida.ai"
    subject = "IT Help Desk - Issue from Chatbot"
    body = f"I raised the following issue with the IT Help Desk Chatbot:\n\n{user_question}"
    if response_preview:
        body += f"\n\nChatbot response (summary):\n{response_preview}"
    body += "\n\nThe above issue is not resolved / I need further assistance."
    return (
        f"mailto:{to}"
        f"?subject={urllib.parse.quote(subject)}"
        f"&body={urllib.parse.quote(body)}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# ORM DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _orm_create_ticket(
    subject: str, description: str, priority: str, category: Optional[str]
) -> dict:
    """Create ticket via SQLAlchemy ORM with auto-assignment."""
    from backend.db_orm import get_db
    from backend.models import Ticket

    assignee = _auto_assign(category)
    with get_db() as db:
        count = db.query(Ticket).count()
        ticket_id = f"TKT-{count + 1000}"
        ticket = Ticket(
            ticket_id=ticket_id,
            subject=subject,
            description=description,
            priority=priority,
            status="Open",
            category=category,
            assigned_to=assignee,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(ticket)
        db.flush()
        return ticket.to_dict()


def _orm_list_tickets(limit: int = 10) -> List[dict]:
    """List recent tickets (newest first) via ORM."""
    from backend.db_orm import get_db
    from backend.models import Ticket

    with get_db() as db:
        rows = (
            db.query(Ticket)
            .order_by(Ticket.created_at.desc())
            .limit(limit)
            .all()
        )
        return [r.to_dict() for r in rows]


def _orm_list_all_tickets() -> List[dict]:
    """Return all tickets via ORM."""
    from backend.db_orm import get_db
    from backend.models import Ticket

    with get_db() as db:
        rows = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
        return [r.to_dict() for r in rows]


def _orm_update_status(ticket_id: str, new_status: str) -> Optional[dict]:
    """Update a ticket's status via ORM. Returns None if ticket not found."""
    from backend.db_orm import get_db
    from backend.models import Ticket

    with get_db() as db:
        ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
        if not ticket:
            return None
        ticket.status = new_status
        ticket.updated_at = datetime.utcnow()
        db.flush()
        return ticket.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from backend.auth import decode_token
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload  # {"sub": email, "role": role, "name": name, "id": id}


# ─────────────────────────────────────────────────────────────────────────────
# Routes – Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "healthy",
        "service": "IT Help Desk API",
        "version": "2.1.0",
    }


@app.get("/api/config", tags=["Health"])
async def get_config():
    return {
        "llm_provider": config.LLM_PROVIDER,
        "notification_email": os.getenv("NOTIFICATION_EMAIL", ""),
        "use_database": os.getenv("USE_DATABASE", "false"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routes – Chat
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Primary chat endpoint.

    Flow (extracted & merged from app.py._query_chat + backend/api.py):
      1. Run RAG query via the pre-loaded rag_backend singleton.
      2. If the singleton is unavailable, fall back to re-instantiating RAGBackend.
      3. Optionally persist conversation to PostgreSQL when session_id is provided.
      4. Return response + sources + fallback_used flag.
    """
    try:
        result = await _run_blocking(
            _query_chat_sync, request.message, request.history, timeout=65.0
        )

        response_text = result["response"]
        sources = result.get("sources", [])
        fallback_used = result.get("fallback_used", False)

        # Persist to DB (best-effort; never fail the response)
        if request.session_id:
            try:
                from database import USE_DATABASE, save_chat_message
                if USE_DATABASE:
                    save_chat_message(request.session_id, "user", request.message)
                    save_chat_message(
                        request.session_id, "assistant", response_text, sources
                    )
            except Exception:
                pass

        return ChatResponse(
            response=response_text,
            sources=sources,
            fallback_used=fallback_used,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="RAG backend timed out. Please try again.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/chat/history/{session_id}", tags=["Chat"])
async def get_chat_history(session_id: str):
    """Retrieve stored chat history for a session from PostgreSQL."""
    try:
        from database import USE_DATABASE, get_chat_history as db_history
        if not USE_DATABASE:
            return {"messages": []}
        return {"messages": db_history(session_id)}
    except Exception:
        return {"messages": []}


@app.post("/api/chat/detect-intent", response_model=IntentResponse, tags=["Chat"])
async def detect_ticket_intent(body: IntentRequest):
    """
    Detect whether a user message expresses intent to raise/create a support ticket.
    Logic extracted verbatim from app.py's ticket-phrase detection block.

    Returns:
        is_ticket_intent: bool
        matched_phrase:   the phrase that triggered the match (or null)
    """
    lower = body.message.lower()
    for phrase in TICKET_INTENT_PHRASES:
        if phrase in lower:
            return IntentResponse(is_ticket_intent=True, matched_phrase=phrase)
    return IntentResponse(is_ticket_intent=False)


@app.get("/api/email-link", response_model=EmailLinkResponse, tags=["Chat"])
async def get_email_link(question: str, response_preview: str = ""):
    """
    Build a mailto: escalation link for a chatbot question.
    Extracted from app.py's build_email_to_it_link() function.

    Query params:
        question          – the user's original IT question
        response_preview  – first portion of the chatbot's answer (optional)
    """
    url = build_email_to_it_link(question, response_preview)
    return EmailLinkResponse(mailto_url=url)


# ─────────────────────────────────────────────────────────────────────────────
# Routes – Tickets (ORM-first, JSON fallback)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/tickets", response_model=TicketResponse, tags=["Tickets"])
async def create_new_ticket(ticket: TicketRequest, background_tasks: BackgroundTasks):
    """Create a new IT support ticket (ORM when DB enabled, JSON otherwise)."""
    try:
        from backend.db_orm import orm_available
        from email_notifier import send_ticket_notification

        if orm_available():
            new_ticket = _orm_create_ticket(
                ticket.subject, ticket.description, ticket.priority, ticket.category
            )
        else:
            from tickets import create_ticket
            new_ticket = create_ticket(
                subject=ticket.subject,
                description=ticket.description,
                priority=ticket.priority,
                category=ticket.category,
            )
        background_tasks.add_task(send_ticket_notification, new_ticket)
        return TicketResponse(**new_ticket)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/tickets", response_model=List[TicketResponse], tags=["Tickets"])
async def get_tickets_list(limit: int = 10):
    """List the most recent tickets (newest first)."""
    try:
        from backend.db_orm import orm_available
        if orm_available():
            tickets = await _run_blocking(_orm_list_tickets, limit, timeout=6.0)
        else:
            from tickets import get_tickets
            tickets = await _run_blocking(get_tickets, limit, timeout=6.0)
        return [TicketResponse(**t) for t in tickets]
    except asyncio.TimeoutError:
        return []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/tickets/all", response_model=List[TicketResponse], tags=["Tickets"])
async def get_all_tickets_list():
    """Return all tickets (used by the dashboard)."""
    try:
        from backend.db_orm import orm_available
        if orm_available():
            tickets = await _run_blocking(_orm_list_all_tickets, timeout=6.0)
        else:
            from tickets import get_all_tickets
            tickets = await _run_blocking(get_all_tickets, timeout=6.0)
        return [TicketResponse(**t) for t in tickets]
    except asyncio.TimeoutError:
        return []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/tickets/track/{ticket_id}", response_model=TicketResponse, tags=["Tickets"])
async def track_ticket(ticket_id: str):
    """Look up a specific ticket by its ID (e.g. TKT-1000)."""
    try:
        from backend.db_orm import orm_available, get_db
        if orm_available():
            from backend.models import Ticket
            with get_db() as db:
                t = db.query(Ticket).filter(
                    Ticket.ticket_id == ticket_id.upper()
                ).first()
                if not t:
                    raise HTTPException(
                        status_code=404, detail=f"Ticket '{ticket_id}' not found"
                    )
                return TicketResponse(**t.to_dict())
        else:
            from tickets import get_all_tickets
            for t in get_all_tickets():
                if t.get("id", "").upper() == ticket_id.upper():
                    return TicketResponse(**t)
            raise HTTPException(
                status_code=404, detail=f"Ticket '{ticket_id}' not found"
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.patch(
    "/api/tickets/{ticket_id}/status",
    response_model=TicketResponse,
    tags=["Tickets"],
)
async def update_ticket_status(ticket_id: str, body: TicketStatusUpdate):
    """Update a ticket's status. Valid values: Open, Pending, Resolved, Closed."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    try:
        from backend.db_orm import orm_available
        if orm_available():
            updated = _orm_update_status(ticket_id, body.status)
            if not updated:
                raise HTTPException(
                    status_code=404, detail=f"Ticket '{ticket_id}' not found"
                )
            return TicketResponse(**updated)
        else:
            # JSON fallback: load → mutate → save
            tickets_file = os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "tickets.json"
            )
            if not os.path.exists(tickets_file):
                raise HTTPException(
                    status_code=404, detail=f"Ticket '{ticket_id}' not found"
                )
            with open(tickets_file, "r", encoding="utf-8") as f:
                tickets = json.load(f)
            found = None
            for t in tickets:
                if t.get("id") == ticket_id:
                    t["status"] = body.status
                    found = t
                    break
            if not found:
                raise HTTPException(
                    status_code=404, detail=f"Ticket '{ticket_id}' not found"
                )
            with open(tickets_file, "w", encoding="utf-8") as f:
                json.dump(tickets, f, indent=2)
            return TicketResponse(**found)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/my-tickets", response_model=List[TicketResponse], tags=["Tickets"])
async def get_my_tickets(email: str, ticket_type: Optional[str] = None):
    """
    Fetch tickets raised by a specific user (matched by email in description).
    Optionally filter by ticket_type: incident | service_request.
    """
    try:
        from backend.db_orm import orm_available
        tickets = (
            _orm_list_all_tickets()
            if orm_available()
            else __import__("tickets").get_all_tickets()
        )
        results = []
        for t in tickets:
            desc = t.get("description", "")
            if email.lower() in desc.lower():
                if ticket_type and f"[TYPE: {ticket_type}]" not in desc:
                    continue
                results.append(t)
        return [TicketResponse(**t) for t in results]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Routes – Helpdesk Portal
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/helpdesk/ticket", response_model=TicketResponse, tags=["Helpdesk"])
async def create_helpdesk_ticket(
    ticket: TicketRequest, background_tasks: BackgroundTasks
):
    """
    Dedicated Helpdesk Portal endpoint.
    Identical storage to /api/tickets but served at a distinct URL for the
    /helpdesk React page.
    """
    try:
        from backend.db_orm import orm_available
        from email_notifier import send_ticket_notification

        if orm_available():
            new_ticket = _orm_create_ticket(
                ticket.subject, ticket.description, ticket.priority, ticket.category
            )
        else:
            from tickets import create_ticket
            new_ticket = create_ticket(
                subject=ticket.subject,
                description=ticket.description,
                priority=ticket.priority,
                category=ticket.category,
            )
        background_tasks.add_task(send_ticket_notification, new_ticket)
        return TicketResponse(**new_ticket)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post(
    "/api/helpdesk/quick-ticket",
    response_model=TicketResponse,
    tags=["Helpdesk"],
)
async def create_quick_ticket(
    payload: QuickTicketRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
):
    """
    One-click Quick Incident endpoint.
    Reads name / email from the JWT token (optional), auto-generates subject and
    priority, stores device metadata in the description body.
    """
    from email_notifier import send_ticket_notification

    # Extract user identity from JWT (graceful fallback if no token)
    name = "Anonymous"
    email = "unknown@cognida.ai"
    if credentials and credentials.credentials:
        from backend.auth import decode_token
        data = decode_token(credentials.credentials)
        if data:
            name = data.get("name", name)
            email = data.get("email", email)

    now = datetime.utcnow()
    subject = f"Quick Incident – {now.strftime('%H:%M %d/%m/%Y')} UTC"

    meta = payload.metadata or {}
    dept = payload.department or "—"
    device = meta.get("device", "Unknown device")
    browser = meta.get("browser", "Unknown browser")
    os_val = meta.get("os", "Unknown OS")
    ts = meta.get("submitted_at", now.isoformat())
    url = meta.get("url", "")
    # Allow metadata name/email to override when user is unauthenticated
    if meta.get("name"):
        name = meta["name"]
    if meta.get("email"):
        email = meta["email"]

    full_description = (
        f"{payload.description}\n\n"
        f"---\n"
        f"[Quick Incident] Raised by: {name} <{email}>\n"
        f"Department: {dept}\n"
        f"Device: {device} | OS: {os_val} | Browser: {browser}\n"
        f"Submitted at: {ts}\n"
        f"URL: {url}\n"
        f"[TYPE: incident]"
    )

    try:
        from backend.db_orm import orm_available
        if orm_available():
            new_ticket = _orm_create_ticket(subject, full_description, "High", "Other")
        else:
            from tickets import create_ticket
            new_ticket = create_ticket(
                subject=subject,
                description=full_description,
                priority="High",
                category="Other",
            )
        background_tasks.add_task(send_ticket_notification, new_ticket)
        return TicketResponse(**new_ticket)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Routes – Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats", response_model=DashboardStats, tags=["Dashboard"])
async def get_dashboard_statistics():
    """
    Compute and return aggregated dashboard statistics.
    Uses tickets.py compute logic; always runs off-thread to avoid blocking.
    Returns safe empty stats on timeout instead of hanging.
    """
    try:
        from tickets import get_dashboard_stats
        stats = await _run_blocking(get_dashboard_stats, timeout=6.0)
        return DashboardStats(**stats)
    except asyncio.TimeoutError:
        return DashboardStats(
            overdue=0,
            due_today=0,
            open=0,
            on_hold=0,
            unassigned=0,
            all=0,
            by_priority={"High": 0, "Medium": 0, "Low": 0},
            by_status={"Open": 0, "Pending": 0, "Resolved": 0, "Closed": 0},
            by_category={"Network": 0, "Software": 0, "Hardware": 0, "Other": 0},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/dashboard/activity", tags=["Dashboard"])
async def get_dashboard_activity(limit: int = 20):
    """
    Return a recent-activity timeline derived from ticket data.
    Each event has: id, type, icon, text, sub, time, color.
    Falls back to an empty list on error rather than 500.
    """
    try:
        from backend.db_orm import orm_available

        if orm_available():
            tickets = await _run_blocking(_orm_list_all_tickets, timeout=6.0)
        else:
            from tickets import get_all_tickets
            tickets = await _run_blocking(get_all_tickets, timeout=6.0)

        STATUS_COLORS = {
            "Open":     "#3b82f6",
            "Pending":  "#f59e0b",
            "Resolved": "#06b6d4",
            "Closed":   "#22c55e",
        }

        events: list[dict] = []
        sorted_tickets = sorted(
            tickets,
            key=lambda t: t.get("created_at", ""),
            reverse=True,
        )
        for t in sorted_tickets[:limit]:
            events.append({
                "id":    t.get("id", "") + "_created",
                "type":  "created",
                "icon":  "🎫",
                "color": "#3b82f6",
                "text":  f"Ticket {t.get('id', '')} created",
                "sub":   (t.get("subject", "") or "")[:60],
                "time":  t.get("created_at", ""),
            })
            status = t.get("status", "")
            if status in ("Resolved", "Closed"):
                events.append({
                    "id":    t.get("id", "") + "_" + status.lower(),
                    "type":  status.lower(),
                    "icon":  "✅" if status == "Closed" else "🔧",
                    "color": STATUS_COLORS.get(status, "#6366f1"),
                    "text":  f"Ticket {t.get('id', '')} {status.lower()}",
                    "sub":   (t.get("resolution") or t.get("subject", "") or "")[:60],
                    "time":  t.get("created_at", ""),
                })

        events.sort(key=lambda e: e["time"], reverse=True)
        return {"events": events[:limit]}

    except asyncio.TimeoutError:
        return {"events": []}
    except Exception as exc:
        return {"events": [], "error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# Routes – Auth
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=AuthResponse, tags=["Auth"])
async def register(body: RegisterRequest):
    """Register a new user account."""
    try:
        from backend.auth import create_token, hash_password
        from backend.db_orm import get_db, orm_available
        from backend.models import User

        if not orm_available():
            raise HTTPException(
                status_code=503,
                detail="Database not available. Enable PostgreSQL first.",
            )
        with get_db() as db:
            existing = db.query(User).filter(User.email == body.email.lower()).first()
            if existing:
                raise HTTPException(status_code=409, detail="Email already registered.")
            user = User(
                name=body.name.strip(),
                email=body.email.strip().lower(),
                emp_id=body.emp_id.strip() if body.emp_id else None,
                password_hash=hash_password(body.password),
                role=body.role if body.role in ("user", "admin") else "user",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            token = create_token(
                {"sub": user.email, "role": user.role, "name": user.name, "id": user.id}
            )
            return AuthResponse(token=token, user=user.to_dict())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/auth/login", response_model=AuthResponse, tags=["Auth"])
async def login(body: LoginRequest):
    """Authenticate with email and password; returns a JWT."""
    try:
        from backend.auth import create_token, verify_password
        from backend.db_orm import get_db, orm_available
        from backend.models import User

        if not orm_available():
            raise HTTPException(status_code=503, detail="Database not available.")
        with get_db() as db:
            user = db.query(User).filter(
                User.email == body.email.strip().lower()
            ).first()
            if not user or not verify_password(body.password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid email or password.")
            token = create_token(
                {"sub": user.email, "role": user.role, "name": user.name, "id": user.id}
            )
            return AuthResponse(token=token, user=user.to_dict())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/auth/me", response_model=UserResponse, tags=["Auth"])
async def get_me(current_user: dict = Depends(_get_current_user)):
    """Return the profile of the currently authenticated user."""
    try:
        from backend.db_orm import get_db, orm_available
        from backend.models import User

        if not orm_available():
            raise HTTPException(status_code=503, detail="Database not available.")
        with get_db() as db:
            user = db.query(User).filter(User.email == current_user["sub"]).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            return UserResponse(**user.to_dict())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Entry point (direct execution)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
