"""
Email notification system for ticket creation.
Sends email alerts to the assigned engineer when a new ticket is created.
Falls back to NOTIFICATION_EMAIL when no assignee is set.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Email Configuration
SMTP_SERVER   = os.getenv("SMTP_SERVER",   "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# Fallback recipient when ticket has no assigned_to
NOTIFICATION_EMAIL = os.getenv(
    "NOTIFICATION_EMAIL",
    "subrahmanyam.pillalamarri@cognida.ai"
)

# Human-friendly names for assignees used in the email body
ASSIGNEE_NAMES = {
    "subrahmanyam.pillalamarri@cognida.ai": "Subrahmanyam Pillalamarri",
    "aditya.kovoor@cognida.ai":             "Aditya Kovoor",
}


def send_ticket_notification(ticket: dict) -> bool:
    """
    Send email notification to the assignee when a new ticket is created.

    - Uses ticket['assigned_to'] as the primary recipient.
    - Falls back to NOTIFICATION_EMAIL if assigned_to is missing.
    - Both the assignee and NOTIFICATION_EMAIL receive the mail when they differ.

    Args:
        ticket: Dictionary containing ticket details (id, subject, description,
                priority, status, category, assigned_to, created_at, …)

    Returns:
        bool: True if email sent successfully, False otherwise.
    """
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print("[EMAIL] Email notification skipped: SMTP credentials not configured")
            return False

        # ── Determine recipients ──────────────────────────────────────────────
        assignee_email = (ticket.get("assigned_to") or "").strip()
        fallback_email = NOTIFICATION_EMAIL.strip()

        # Build a deduplicated list: assignee first, then fallback if different
        recipients = [assignee_email] if assignee_email else [fallback_email]
        if fallback_email and fallback_email not in recipients:
            recipients.append(fallback_email)

        to_header  = ", ".join(recipients)          # MIME To: header
        assignee_name = ASSIGNEE_NAMES.get(assignee_email, assignee_email or "IT Team")

        # ── Format creation time ─────────────────────────────────────────────
        created_at = ticket.get("created_at", datetime.now().isoformat())
        try:
            created_dt     = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            formatted_time = created_dt.strftime("%B %d, %Y at %I:%M %p UTC")
        except Exception:
            formatted_time = created_at[:19].replace("T", " ")

        priority      = ticket.get("priority", "Medium")
        status        = ticket.get("status",   "Open")
        category      = ticket.get("category") or "—"
        ticket_id     = ticket["id"]
        subject_text  = ticket["subject"]
        description   = ticket["description"]

        # ── Build email ───────────────────────────────────────────────────────
        msg            = MIMEMultipart("alternative")
        msg["From"]    = SMTP_USERNAME
        msg["To"]      = to_header
        msg["Subject"] = f"[Cognida IT Helpdesk] New Ticket Assigned: {ticket_id} – {subject_text}"

        # HTML body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 620px; margin: 30px auto; border-radius: 10px; overflow: hidden;
                              box-shadow: 0 4px 20px rgba(0,0,0,0.10); }}
                .header {{ background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
                           color: white; padding: 24px 28px; text-align: center; }}
                .header h2 {{ margin: 0 0 4px 0; font-size: 20px; }}
                .header p  {{ margin: 0; font-size: 13px; opacity: 0.85; }}
                .banner {{ background: #fff7ed; border-left: 5px solid #f97316;
                           padding: 14px 20px; font-size: 14px; color: #7c3a00; }}
                .content {{ background: #f8f7ff; padding: 24px 28px; }}
                .field   {{ margin-bottom: 14px; }}
                .label   {{ font-weight: bold; color: #5a67d8; font-size: 12px;
                            text-transform: uppercase; letter-spacing: 0.05em; }}
                .value   {{ margin-top: 4px; padding: 10px 14px; background: white;
                            border-left: 4px solid #5a67d8; border-radius: 4px;
                            font-size: 14px; }}
                .priority-high     {{ border-left-color: #e53e3e; color: #c53030; font-weight: bold; }}
                .priority-critical {{ border-left-color: #7b2d00; color: #7b2d00; font-weight: bold; }}
                .priority-medium   {{ border-left-color: #dd6b20; }}
                .priority-low      {{ border-left-color: #38a169; }}
                .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
                .footer {{ margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0;
                           font-size: 12px; color: #718096; text-align: center; }}
            </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎫 New Helpdesk Ticket Assigned to You</h2>
              <p>Cognida.ai IT Help Desk — automated notification</p>
            </div>

            <div class="banner">
              Hi <strong>{assignee_name}</strong>, a new ticket has been logged and assigned to you.
              Please review and respond as soon as possible.
            </div>

            <div class="content">
              <div class="grid">
                <div class="field">
                  <div class="label">Ticket ID</div>
                  <div class="value"><strong>{ticket_id}</strong></div>
                </div>
                <div class="field">
                  <div class="label">Status</div>
                  <div class="value">{status}</div>
                </div>
              </div>

              <div class="field">
                <div class="label">Subject</div>
                <div class="value">{subject_text}</div>
              </div>

              <div class="grid">
                <div class="field">
                  <div class="label">Priority</div>
                  <div class="value priority-{priority.lower()}">{priority}</div>
                </div>
                <div class="field">
                  <div class="label">Category</div>
                  <div class="value">{category}</div>
                </div>
              </div>

              <div class="field">
                <div class="label">Description</div>
                <div class="value" style="white-space: pre-wrap;">{description}</div>
              </div>

              <div class="field">
                <div class="label">Logged at</div>
                <div class="value">{formatted_time}</div>
              </div>

              <div class="footer">
                This is an automated notification from the Cognida.ai IT Help Desk system.<br>
                Please do not reply to this email. Manage the ticket directly in the Help Desk portal.
              </div>
            </div>
          </div>
        </body>
        </html>
        """

        # Plain-text fallback
        text_body = f"""
Hi {assignee_name},

A new IT Help Desk ticket has been assigned to you.

Ticket ID   : {ticket_id}
Subject     : {subject_text}
Priority    : {priority}
Category    : {category}
Status      : {status}
Logged at   : {formatted_time}

Description:
{description}

---
This is an automated notification from the Cognida.ai IT Help Desk system.
Please manage this ticket via the Help Desk portal.
        """

        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, recipients, msg.as_string())

        print(f"[EMAIL] Ticket {ticket_id} notification sent → {to_header}")
        return True

    except Exception as e:
        print(f"[EMAIL] Failed to send email notification: {e}")
        return False


def test_email_configuration() -> bool:
    """Test if email configuration is valid."""
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            return False
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        return True
    except Exception as e:
        print(f"Email configuration test failed: {e}")
        return False
