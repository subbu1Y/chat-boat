"""
Email notification system for ticket creation.
Sends email alerts when new tickets are created.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "subrahmanyam.pillalamarri@cognida.ai aditya.kovoor@cognida.ai")


def send_ticket_notification(ticket: dict) -> bool:
    """
    Send email notification when a new ticket is created.
    
    Args:
        ticket: Dictionary containing ticket details (id, subject, description, priority, etc.)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Check if SMTP is configured
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print("[EMAIL] Email notification skipped: SMTP credentials not configured")
            return False

        # Create email message
        msg = MIMEMultipart('alternative')
        msg['From'] = SMTP_USERNAME
        msg['To'] = NOTIFICATION_EMAIL
        msg['Subject'] = f"New IT Help Desk Ticket: {ticket['id']} - {ticket['subject']}"

        # Format creation time
        created_at = ticket.get('created_at', datetime.now().isoformat())
        try:
            created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            formatted_time = created_dt.strftime('%B %d, %Y at %I:%M %p')
        except:
            formatted_time = created_at[:19].replace('T', ' ')

        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%); 
                           color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f8f7ff; padding: 25px; border: 1px solid #e2e8f0; 
                           border-top: none; border-radius: 0 0 8px 8px; }}
                .field {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; color: #5a67d8; }}
                .value {{ margin-top: 5px; padding: 10px; background: white; 
                         border-left: 4px solid #5a67d8; border-radius: 4px; }}
                .priority-high {{ border-left-color: #e53e3e; }}
                .priority-medium {{ border-left-color: #dd6b20; }}
                .priority-low {{ border-left-color: #38a169; }}
                .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; 
                          font-size: 0.9em; color: #718096; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">New IT Help Desk Ticket</h2>
                    <p style="margin: 5px 0 0 0;">Cognida.ai Help Desk System</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="label">Ticket ID:</div>
                        <div class="value">{ticket['id']}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Subject:</div>
                        <div class="value">{ticket['subject']}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Description:</div>
                        <div class="value">{ticket['description']}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Priority:</div>
                        <div class="value priority-{ticket.get('priority', 'Medium').lower()}">{ticket.get('priority', 'Medium')}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Status:</div>
                        <div class="value">{ticket.get('status', 'Open')}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Created:</div>
                        <div class="value">{formatted_time}</div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated notification from the Cognida.ai IT Help Desk system.</p>
                        <p>Please do not reply to this email. To respond to this ticket, please use the Help Desk system.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text alternative
        text_body = f"""
New IT Help Desk Ticket Created
================================

Ticket ID: {ticket['id']}
Subject: {ticket['subject']}
Description: {ticket['description']}
Priority: {ticket.get('priority', 'Medium')}
Status: {ticket.get('status', 'Open')}
Created: {formatted_time}

---
This is an automated notification from the Cognida.ai IT Help Desk system.
        """

        # Attach both HTML and plain text versions
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"[EMAIL] Email notification sent to {NOTIFICATION_EMAIL} for ticket {ticket['id']}")
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
