"""
Email Configuration Setup Helper
Run this script to configure and test email notifications.
"""
import os
from email_notifier import send_ticket_notification, test_email_configuration

def setup_email():
    print("\n" + "="*60)
    print("📧 Email Notification Setup for IT Help Desk")
    print("="*60 + "\n")
    
    # Check if .env exists
    env_path = ".env"
    if not os.path.exists(env_path):
        print("❌ .env file not found!")
        print("Creating .env file from template...\n")
        with open("env_template.txt", "r") as template:
            with open(".env", "w") as env_file:
                env_file.write(template.read())
        print("✅ .env file created. Please edit it with your SMTP settings.\n")
        return
    
    # Read current .env
    with open(env_path, "r") as f:
        env_content = f.read()
    
    # Check if SMTP is configured
    if "SMTP_USERNAME=" not in env_content or "your_email" in env_content:
        print("⚠️  SMTP credentials not configured in .env file\n")
        print("To enable email notifications, you need to:")
        print("\n1. Open the .env file")
        print("2. Add your email settings:\n")
        print("   SMTP_SERVER=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USERNAME=your.email@gmail.com")
        print("   SMTP_PASSWORD=your_app_password_here")
        print("   NOTIFICATION_EMAIL=subrahmanyam.pillalamarri@cognida.ai")
        print("\n3. For Gmail, use an App Password:")
        print("   - Go to: https://myaccount.google.com/apppasswords")
        print("   - Generate a password for 'Mail'")
        print("   - Use that 16-character password")
        print("\n4. Save the .env file and restart Streamlit")
        print("\n" + "="*60 + "\n")
        
        # Ask if user wants to configure now
        configure = input("Would you like to configure email now? (y/n): ").strip().lower()
        if configure == 'y':
            print("\n--- Email Configuration ---")
            smtp_server = input("SMTP Server [smtp.gmail.com]: ").strip() or "smtp.gmail.com"
            smtp_port = input("SMTP Port [587]: ").strip() or "587"
            smtp_username = input("Your Email Address: ").strip()
            smtp_password = input("Your App Password: ").strip()
            notification_email = input("Notification Email [subrahmanyam.pillalamarri@cognida.ai]: ").strip() or "subrahmanyam.pillalamarri@cognida.ai"
            
            # Append to .env
            with open(env_path, "a") as f:
                f.write(f"\n# Email Configuration (added by setup_email.py)\n")
                f.write(f"SMTP_SERVER={smtp_server}\n")
                f.write(f"SMTP_PORT={smtp_port}\n")
                f.write(f"SMTP_USERNAME={smtp_username}\n")
                f.write(f"SMTP_PASSWORD={smtp_password}\n")
                f.write(f"NOTIFICATION_EMAIL={notification_email}\n")
            
            print("\n✅ Email configuration saved to .env")
            print("⚠️  Please restart Streamlit for changes to take effect\n")
            
            # Reload environment
            from dotenv import load_dotenv
            load_dotenv(override=True)
            
            # Test configuration
            test_now = input("Would you like to test the email configuration? (y/n): ").strip().lower()
            if test_now == 'y':
                test_email_config()
        return
    
    # Configuration exists, test it
    print("✅ Email configuration found in .env")
    print("\nTesting email configuration...\n")
    test_email_config()


def test_email_config():
    """Test the email configuration"""
    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    print("Testing SMTP connection...")
    if test_email_configuration():
        print("✅ SMTP connection successful!\n")
        
        # Ask if user wants to send a test email
        send_test = input("Send a test ticket notification? (y/n): ").strip().lower()
        if send_test == 'y':
            test_ticket = {
                "id": "TEST-999",
                "subject": "Test Ticket - Email Configuration Check",
                "description": "This is a test notification to verify email setup is working correctly.",
                "priority": "Medium",
                "status": "Open",
                "created_at": "2024-01-01T12:00:00"
            }
            
            print("\nSending test email...")
            if send_ticket_notification(test_ticket):
                print("\n✅ Test email sent successfully!")
                print("Check subrahmanyam.pillalamarri@cognida.ai for the test notification.")
            else:
                print("\n❌ Failed to send test email. Check the error messages above.")
    else:
        print("\n❌ SMTP connection failed!")
        print("\nCommon issues:")
        print("  1. Wrong password (use App Password for Gmail, not regular password)")
        print("  2. 2FA not enabled (required for Gmail App Passwords)")
        print("  3. Firewall blocking port 587")
        print("  4. Wrong SMTP server or port")
        print("\nFor Gmail:")
        print("  - Enable 2FA: https://myaccount.google.com/security")
        print("  - Create App Password: https://myaccount.google.com/apppasswords")


if __name__ == "__main__":
    try:
        setup_email()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
