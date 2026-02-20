"""
Ticket storage for IT Help Desk.
Supports both PostgreSQL database and JSON file storage (backward compatible).
"""
import json
import os
from datetime import datetime, date
from typing import List, Dict, Optional
from email_notifier import send_ticket_notification

# Try to import database module
try:
    from database import USE_DATABASE, execute_query
    DATABASE_AVAILABLE = True
except ImportError:
    DATABASE_AVAILABLE = False
    USE_DATABASE = False

TICKETS_FILE = "tickets.json"

# Categories for dashboard grouping
CATEGORIES = ["Network", "Software", "Hardware", "Other"]
PRIORITIES = ["High", "Medium", "Low"]
STATUSES = ["Open", "Pending", "Resolved", "Closed"]


def _load_tickets_json() -> List[Dict]:
    """Load all tickets from JSON file."""
    if not os.path.exists(TICKETS_FILE):
        return []
    try:
        with open(TICKETS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _save_tickets_json(tickets: List[Dict]) -> None:
    """Save tickets to JSON file."""
    with open(TICKETS_FILE, "w", encoding="utf-8") as f:
        json.dump(tickets, f, indent=2, ensure_ascii=False)


def _load_tickets_db() -> List[Dict]:
    """Load all tickets from PostgreSQL database."""
    query = """
        SELECT ticket_id as id, subject, description, priority, status, 
               category, assigned_to, due_at, created_at
        FROM tickets
        ORDER BY created_at DESC
    """
    results = execute_query(query)
    if results is None:
        return []
    
    # Convert to dict format matching JSON structure
    tickets = []
    for row in results:
        ticket = dict(row)
        # Convert datetime to ISO format string
        if ticket.get('created_at'):
            ticket['created_at'] = ticket['created_at'].isoformat()
        if ticket.get('due_at'):
            ticket['due_at'] = ticket['due_at'].isoformat()
        tickets.append(ticket)
    return tickets


def _save_ticket_db(ticket: Dict) -> bool:
    """Save a single ticket to PostgreSQL database."""
    query = """
        INSERT INTO tickets (ticket_id, subject, description, priority, status, category, assigned_to, due_at, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        ticket['id'],
        ticket['subject'],
        ticket['description'],
        ticket.get('priority', 'Medium'),
        ticket.get('status', 'Open'),
        ticket.get('category'),
        ticket.get('assigned_to'),
        ticket.get('due_at'),
        ticket.get('created_at', datetime.now().isoformat())
    )
    result = execute_query(query, params, fetch=False)
    return result is not None


def _parse_date(d: str) -> Optional[date]:
    """Parse ISO date string to date object."""
    if not d:
        return None
    try:
        return datetime.fromisoformat(d.replace("Z", "+00:00")).date()
    except (ValueError, TypeError):
        return None


def _infer_category(description: str) -> str:
    """Infer category from description keywords."""
    desc_lower = (description or "").lower()
    if any(kw in desc_lower for kw in ["network", "vpn", "wifi", "internet", "connection"]):
        return "Network"
    if any(kw in desc_lower for kw in ["software", "app", "application", "install", "license"]):
        return "Software"
    if any(kw in desc_lower for kw in ["hardware", "laptop", "monitor", "keyboard", "mouse"]):
        return "Hardware"
    return "Other"


def create_ticket(subject: str, description: str, priority: str = "Medium", category: str = None) -> Dict:
    """Create a new ticket and return it. Sends email notification."""
    # Generate ticket ID
    if USE_DATABASE and DATABASE_AVAILABLE:
        existing = _load_tickets_db()
    else:
        existing = _load_tickets_json()
    
    ticket_id = f"TKT-{len(existing) + 1000}"
    ticket = {
        "id": ticket_id,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "Open",
        "created_at": datetime.now().isoformat(),
    }
    if category:
        ticket["category"] = category
    
    # Save to database or JSON
    if USE_DATABASE and DATABASE_AVAILABLE:
        if not _save_ticket_db(ticket):
            print("[TICKETS] Failed to save to database, falling back to JSON")
            existing.append(ticket)
            _save_tickets_json(existing)
    else:
        existing.append(ticket)
        _save_tickets_json(existing)
    
    # Send email notification (non-blocking - won't fail ticket creation if email fails)
    try:
        print(f"[EMAIL] Attempting to send email notification for ticket {ticket_id}...")
        email_sent = send_ticket_notification(ticket)
        if email_sent:
            print(f"[EMAIL] Email notification sent successfully for ticket {ticket_id}")
        else:
            print(f"[EMAIL] Email notification was not sent for ticket {ticket_id} (check SMTP configuration)")
    except Exception as e:
        print(f"[EMAIL] Email notification failed (ticket still created): {e}")
        import traceback
        traceback.print_exc()
    
    return ticket


def get_tickets(limit: int = 10) -> List[Dict]:
    """Get recent tickets (newest first)."""
    if USE_DATABASE and DATABASE_AVAILABLE:
        tickets = _load_tickets_db()
    else:
        tickets = _load_tickets_json()
        tickets.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return tickets[:limit]


def get_all_tickets() -> List[Dict]:
    """Get all tickets for dashboard."""
    if USE_DATABASE and DATABASE_AVAILABLE:
        return _load_tickets_db()
    else:
        return _load_tickets_json()


def get_dashboard_stats() -> Dict:
    """Compute dashboard statistics from tickets."""
    tickets = get_all_tickets()
    today = date.today()

    overdue = 0
    due_today = 0
    open_count = 0
    on_hold = 0
    unassigned = 0

    by_priority = {p: 0 for p in PRIORITIES}
    by_status = {s: 0 for s in STATUSES}
    by_category = {c: 0 for c in CATEGORIES}

    for t in tickets:
        status = t.get("status", "Open")
        by_status[status] = by_status.get(status, 0) + 1

        # Unresolved = Open or Pending
        if status in ("Open", "Pending"):
            open_count += 1 if status == "Open" else 0
            on_hold += 1 if status == "Pending" else 0
            prio = t.get("priority", "Medium")
            by_priority[prio] = by_priority.get(prio, 0) + 1

            cat = t.get("category") or _infer_category(t.get("description", ""))
            by_category[cat] = by_category.get(cat, 0) + 1

        if not t.get("assigned_to"):
            unassigned += 1

        due_d = _parse_date(t.get("due_at", ""))
        if due_d and status not in ("Resolved", "Closed"):
            if due_d < today:
                overdue += 1
            elif due_d == today:
                due_today += 1

    return {
        "overdue": overdue,
        "due_today": due_today,
        "open": by_status.get("Open", 0),
        "on_hold": by_status.get("Pending", 0),
        "unassigned": unassigned,
        "all": len(tickets),
        "by_priority": by_priority,
        "by_status": by_status,
        "by_category": by_category,
    }
