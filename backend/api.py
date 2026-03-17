"""
FastAPI Backend for IT Help Desk Chatbot.
Uses SQLAlchemy ORM for ticket management (PostgreSQL) with JSON fallback.
"""
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# Add parent directory to path so imports work when run from project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_backend import RAGBackend
from email_notifier import send_ticket_notification
import config

rag_backend = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_backend

    # 1. Initialize SQLAlchemy ORM (PostgreSQL)
    try:
        from backend.db_orm import init_orm, USE_DATABASE
        if USE_DATABASE:
            init_orm()
        else:
            print("[API] USE_DATABASE=false — using JSON storage.")
    except Exception as e:
        print(f"[API] ORM init skipped: {e}")

    # 2. Initialize legacy psycopg2 connection for non-ORM helpers
    try:
        from database import init_database, USE_DATABASE as _USE_DB
        if _USE_DB:
            init_database()
    except Exception:
        pass

    # 3. Initialize RAG backend
    try:
        rag_backend = RAGBackend()
        print("[API] RAG backend initialized successfully")
    except Exception as e:
        print(f"[API] RAG backend error: {e}")

    yield


app = FastAPI(title="IT Help Desk API", version="2.0.0", lifespan=lifespan)

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


# ─────────────────────────── Pydantic Models ────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []

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

# ── Auth models ──────────────────────────────────────────────────────────────
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


# ─────────────────────────── Assignment Routing ─────────────────────────────

# Auto-assignment: infrastructure/security/network/hardware → Aditya
#                  software/email/access/cloud/mobile/requests → Subrahmanyam
ASSIGNMENT_MAP = {
    # ── Aditya Kovoor ───────────────────────────────────────────────────────
    "💻 Hardware Issues":                "aditya.kovoor@cognida.ai",
    "🌐 Network & Internet":             "aditya.kovoor@cognida.ai",
    "🛡️ Security Issues":               "aditya.kovoor@cognida.ai",
    "🖨️ Printer & Scanning Issues":     "aditya.kovoor@cognida.ai",
    "🔧 IT Maintenance / System Updates":"aditya.kovoor@cognida.ai",
    "📱 Mobile Device Issues":           "aditya.kovoor@cognida.ai",
    # ── Subrahmanyam Pillalamarri ───────────────────────────────────────────
    "🖥️ Software Issues":               "subrahmanyam.pillalamarri@cognida.ai",
    "📧 Email & Collaboration":          "subrahmanyam.pillalamarri@cognida.ai",
    "☁️ Cloud Services":                 "subrahmanyam.pillalamarri@cognida.ai",
    "❓ Other / General IT Support":     "subrahmanyam.pillalamarri@cognida.ai",
    # ── Service Request categories ──────────────────────────────────────────
    "🆕 New Hardware Request":           "aditya.kovoor@cognida.ai",
    "💾 New Software Request":           "subrahmanyam.pillalamarri@cognida.ai",
    "🆔 New Email ID / Account Setup":   "subrahmanyam.pillalamarri@cognida.ai",
    "🔐 Access & Permission Requests":   "subrahmanyam.pillalamarri@cognida.ai",
    "🔑 Password & Account Management":  "subrahmanyam.pillalamarri@cognida.ai",
    "🌐 Network & Connectivity Setup":   "aditya.kovoor@cognida.ai",
    "🖥️ IT Onboarding / Offboarding":   "subrahmanyam.pillalamarri@cognida.ai",
    "🛒 Procurement Request":            "aditya.kovoor@cognida.ai",
    "💡 IT Consultation":                "subrahmanyam.pillalamarri@cognida.ai",
    "❓ Other Service Request":          "subrahmanyam.pillalamarri@cognida.ai",
    # ── Legacy keys (kept for backwards compatibility) ──────────────────────
    "Network & Connectivity":            "aditya.kovoor@cognida.ai",
    "Server & Infrastructure":           "aditya.kovoor@cognida.ai",
    "Security":                          "aditya.kovoor@cognida.ai",
    "Hardware & Devices":                "aditya.kovoor@cognida.ai",
    "Software & Applications":           "subrahmanyam.pillalamarri@cognida.ai",
    "Email & Communication":             "subrahmanyam.pillalamarri@cognida.ai",
    "Access & Permissions":              "subrahmanyam.pillalamarri@cognida.ai",
    "Other":                             "subrahmanyam.pillalamarri@cognida.ai",
    "Network":                           "aditya.kovoor@cognida.ai",
    "Hardware":                          "aditya.kovoor@cognida.ai",
    "Software":                          "subrahmanyam.pillalamarri@cognida.ai",
}

def _auto_assign(category: Optional[str]) -> str:
    """Return the assignee email based on ticket category."""
    if not category:
        return "subrahmanyam.pillalamarri@cognida.ai"
    return ASSIGNMENT_MAP.get(category, "subrahmanyam.pillalamarri@cognida.ai")


# ─────────────────────────── ORM Helpers ────────────────────────────────────

VALID_STATUSES = {"Open", "Pending", "Resolved", "Closed"}


def _orm_create_ticket(subject: str, description: str, priority: str, category: Optional[str]) -> dict:
    """Create ticket using SQLAlchemy ORM with auto-assignment."""
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
    """List tickets using SQLAlchemy ORM (newest first)."""
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
    """All tickets using SQLAlchemy ORM."""
    from backend.db_orm import get_db
    from backend.models import Ticket

    with get_db() as db:
        rows = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
        return [r.to_dict() for r in rows]


def _orm_update_status(ticket_id: str, new_status: str) -> Optional[dict]:
    """Update ticket status using SQLAlchemy ORM."""
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


# ─────────────────────────── Routes ─────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "healthy", "service": "IT Help Desk API", "version": "2.0.0"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the RAG backend, optionally persisting history to PostgreSQL."""
    if not rag_backend:
        raise HTTPException(status_code=503, detail="RAG backend not initialized")
    try:
        result = rag_backend.query(request.message, request.history)
        response_text = result["response"]
        sources = result.get("sources", [])

        if request.session_id:
            try:
                from database import save_chat_message, USE_DATABASE
                if USE_DATABASE:
                    save_chat_message(request.session_id, "user", request.message)
                    save_chat_message(request.session_id, "assistant", response_text, sources)
            except Exception:
                pass

        return ChatResponse(response=response_text, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Retrieve stored chat history for a session."""
    try:
        from database import get_chat_history as db_history, USE_DATABASE
        if not USE_DATABASE:
            return {"messages": []}
        return {"messages": db_history(session_id)}
    except Exception:
        return {"messages": []}


# ── Ticket Endpoints (ORM-first, JSON fallback) ──────────────────────────────

@app.post("/api/tickets", response_model=TicketResponse)
async def create_new_ticket(ticket: TicketRequest, background_tasks: BackgroundTasks):
    """Create a new ticket (SQLAlchemy ORM when DB enabled, else JSON)."""
    try:
        from backend.db_orm import orm_available
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tickets", response_model=List[TicketResponse])
async def get_tickets_list(limit: int = 10):
    """List recent tickets (SQLAlchemy ORM when DB enabled, else JSON)."""
    try:
        from backend.db_orm import orm_available
        if orm_available():
            tickets = _orm_list_tickets(limit)
        else:
            from tickets import get_tickets
            tickets = get_tickets(limit=limit)
        return [TicketResponse(**t) for t in tickets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tickets/all", response_model=List[TicketResponse])
async def get_all_tickets_list():
    """Get all tickets for the dashboard."""
    try:
        from backend.db_orm import orm_available
        if orm_available():
            tickets = _orm_list_all_tickets()
        else:
            from tickets import get_all_tickets
            tickets = get_all_tickets()
        return [TicketResponse(**t) for t in tickets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/tickets/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(ticket_id: str, body: TicketStatusUpdate):
    """Update ticket status. Valid values: Open, Pending, Resolved, Closed."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )
    try:
        from backend.db_orm import orm_available
        if orm_available():
            updated = _orm_update_status(ticket_id, body.status)
            if not updated:
                raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
            return TicketResponse(**updated)
        else:
            # JSON fallback: load, update, save
            import json, os
            tickets_file = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tickets.json"
            )
            if not os.path.exists(tickets_file):
                raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
            with open(tickets_file, "r") as f:
                tickets = json.load(f)
            found = None
            for t in tickets:
                if t.get("id") == ticket_id:
                    t["status"] = body.status
                    found = t
                    break
            if not found:
                raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
            with open(tickets_file, "w") as f:
                json.dump(tickets, f, indent=2)
            return TicketResponse(**found)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_statistics():
    """Dashboard statistics — always uses tickets.py compute logic."""
    try:
        from tickets import get_dashboard_stats
        stats = get_dashboard_stats()
        return DashboardStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/helpdesk/ticket", response_model=TicketResponse)
async def create_helpdesk_ticket(ticket: TicketRequest, background_tasks: BackgroundTasks):
    """
    Dedicated Cognida.ai Helpdesk Portal endpoint.
    Same storage as /api/tickets but served from the /helpdesk UI at a distinct URL.
    """
    try:
        from backend.db_orm import orm_available
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class QuickTicketRequest(BaseModel):
    description: str
    department: Optional[str] = ""
    metadata: Optional[dict] = {}


@app.post("/api/helpdesk/quick-ticket", response_model=TicketResponse)
async def create_quick_ticket(
    payload: QuickTicketRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
):
    """
    One-click Quick Incident endpoint.
    Reads name/email from the JWT token, auto-generates subject and priority.
    Stores device metadata in the description body.
    """
    from datetime import datetime as dt

    # Extract user identity from JWT (optional – falls back gracefully if no token)
    name  = "Anonymous"
    email = "unknown@cognida.ai"
    if credentials and credentials.credentials:
        from backend.auth import decode_token
        data = decode_token(credentials.credentials)
        if data:
            name  = data.get("name",  name)
            email = data.get("email", email)

    now     = dt.utcnow()
    subject = f"Quick Incident – {now.strftime('%H:%M %d/%m/%Y')} UTC"

    meta   = payload.metadata or {}
    dept   = payload.department or "—"
    device = meta.get("device", "Unknown device")
    browser= meta.get("browser", "Unknown browser")
    os_val = meta.get("os", "Unknown OS")
    ts     = meta.get("submitted_at", now.isoformat())
    url    = meta.get("url", "")
    # Allow name/email override from metadata when user is not authenticated via JWT
    if meta.get("name"):  name  = meta["name"]
    if meta.get("email"): email = meta["email"]

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
            new_ticket = _orm_create_ticket(
                subject, full_description, "High", "Other"
            )
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/my-tickets", response_model=List[TicketResponse])
async def get_my_tickets(email: str, ticket_type: Optional[str] = None):
    """
    Fetch tickets for a specific user by email.
    Searches description for the email tag [Raised by: ... <email>].
    Optionally filter by ticket_type: incident | service_request.
    """
    try:
        from backend.db_orm import orm_available
        if orm_available():
            tickets = _orm_list_all_tickets()
        else:
            from tickets import get_all_tickets
            tickets = get_all_tickets()

        results = []
        for t in tickets:
            desc = t.get("description", "")
            if email.lower() in desc.lower():
                if ticket_type:
                    type_tag = f"[TYPE: {ticket_type}]"
                    if type_tag not in desc:
                        continue
                results.append(t)
        return [TicketResponse(**t) for t in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tickets/track/{ticket_id}", response_model=TicketResponse)
async def track_ticket(ticket_id: str):
    """Track a specific ticket by its ID (e.g. TKT-1000)."""
    try:
        from backend.db_orm import orm_available, get_db
        if orm_available():
            from backend.models import Ticket
            with get_db() as db:
                t = db.query(Ticket).filter(Ticket.ticket_id == ticket_id.upper()).first()
                if not t:
                    raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
                return TicketResponse(**t.to_dict())
        else:
            from tickets import get_all_tickets
            for t in get_all_tickets():
                if t.get("id", "").upper() == ticket_id.upper():
                    return TicketResponse(**t)
            raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config")
async def get_config():
    return {
        "llm_provider": config.LLM_PROVIDER,
        "notification_email": os.getenv("NOTIFICATION_EMAIL", ""),
        "use_database": os.getenv("USE_DATABASE", "false"),
    }


# ── Auth helpers ──────────────────────────────────────────────────────────────
_bearer = HTTPBearer(auto_error=False)

def _get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from backend.auth import decode_token
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload  # {"sub": email, "role": role, "name": name, "id": id}


# ── Auth endpoints ────────────────────────────────────────────────────────────
@app.post("/api/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    """Register a new user account."""
    try:
        from backend.db_orm import orm_available, get_db
        from backend.auth import hash_password, create_token
        from backend.models import User

        if not orm_available():
            raise HTTPException(status_code=503, detail="Database not available. Enable PostgreSQL first.")

        with get_db() as db:
            existing = db.query(User).filter(User.email == body.email.lower()).first()
            if existing:
                raise HTTPException(status_code=409, detail="Email already registered.")

            user = User(
                name=body.name.strip(),
                email=body.email.strip().lower(),
                emp_id=body.emp_id.strip() if body.emp_id else None,
                password_hash=body.password,
                role=body.role if body.role in ("user", "admin") else "user",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            token = create_token({"sub": user.email, "role": user.role, "name": user.name, "id": user.id})
            return AuthResponse(token=token, user=user.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Login with email and password."""
    try:
        from backend.db_orm import orm_available, get_db
        from backend.auth import verify_password, create_token
        from backend.models import User

        if not orm_available():
            raise HTTPException(status_code=503, detail="Database not available.")

        with get_db() as db:
            user = db.query(User).filter(User.email == body.email.strip().lower()).first()
            if not user or not verify_password(body.password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid email or password.")

            token = create_token({"sub": user.email, "role": user.role, "name": user.name, "id": user.id})
            return AuthResponse(token=token, user=user.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(_get_current_user)):
    """Get the currently authenticated user's profile."""
    try:
        from backend.db_orm import orm_available, get_db
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)
