# Email Notification Setup Guide

## Overview
When a new ticket is created in the IT Help Desk system, an automatic email notification is sent to `subrahmanyam.pillalamarri@cognida.ai`.

## Setup Instructions

### Option 1: Gmail (Recommended)

1. **Enable 2-Factor Authentication on your Gmail account**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate an App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "App" → "Mail"
   - Select "Device" → "Other" (type "Help Desk")
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Update `.env` file**
   ```
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your.email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop  # 16-char app password from step 2
   NOTIFICATION_EMAIL=subrahmanyam.pillalamarri@cognida.ai
   ```

4. **Restart Streamlit**
   ```bash
   streamlit run app.py
   ```

### Option 2: Other Email Providers

#### Outlook/Office 365
```
SMTP_SERVER=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your.email@outlook.com
SMTP_PASSWORD=your_password
```

#### Custom SMTP Server
```
SMTP_SERVER=smtp.your-domain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
```

## Testing Email Configuration

Run this Python script to test your email setup:

```python
from email_notifier import test_email_configuration, send_ticket_notification

# Test connection
if test_email_configuration():
    print("✅ Email configuration is working!")
    
    # Test sending a notification
    test_ticket = {
        "id": "TEST-001",
        "subject": "Test Ticket",
        "description": "This is a test notification",
        "priority": "Medium",
        "status": "Open",
        "created_at": "2024-01-01T12:00:00"
    }
    send_ticket_notification(test_ticket)
else:
    print("❌ Email configuration failed. Check your settings.")
```

## Email Features

### What Gets Sent
- **Ticket ID**: Unique identifier
- **Subject**: Ticket title
- **Description**: Full ticket description
- **Priority**: High/Medium/Low
- **Status**: Open/Pending/Resolved/Closed
- **Created Date**: When the ticket was created

### Email Format
- **HTML formatted** with Cognida.ai branding
- **Priority color coding**: Red (High), Orange (Medium), Green (Low)
- **Professional layout** matching the Help Desk system

## Troubleshooting

### Email not sending?

1. **Check credentials**: Verify SMTP_USERNAME and SMTP_PASSWORD in `.env`
2. **Gmail users**: Make sure you're using App Password, not regular password
3. **Check firewall**: Ensure port 587 is not blocked
4. **Check logs**: Look for error messages in the Streamlit terminal

### "Authentication failed" error?
- **Gmail**: Use App Password, not regular password
- **2FA enabled**: Generate and use App Password
- **Less secure apps**: Don't use - use App Password instead

### Email goes to spam?
- **Add to contacts**: Add the sender email to contacts
- **Check spam folder**: Mark as "Not Spam"
- **Use organizational email**: If possible, use a company SMTP server

## Security Notes

⚠️ **Important Security Considerations**:
- Never commit `.env` file to version control
- Use App Passwords, not actual account passwords
- Keep SMTP credentials secure
- Rotate passwords periodically
- Use environment variables for production deployments

## Disabling Email Notifications

To disable email notifications:
1. Leave `SMTP_USERNAME` and `SMTP_PASSWORD` empty in `.env`
2. Tickets will still be created, but no emails will be sent
3. No errors will occur - the system gracefully handles missing email config
