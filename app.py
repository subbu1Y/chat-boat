"""
IT Help Desk Chatbot - Streamlit Frontend
Calls FastAPI backend (/api/chat) when available; falls back to RAG directly if backend is unreachable.
"""
import base64
import urllib.parse
import streamlit as st
import requests
import config
from tickets import create_ticket, get_tickets
from dashboard import render_dashboard


def _get_logo_base64() -> str:
    """Load logo and return base64 for embedding in HTML."""
    try:
        with open("logo.png", "rb") as f:
            return base64.b64encode(f.read()).decode()
    except Exception:
        return ""


def build_email_to_it_link(user_question: str, response_preview: str = "") -> str:
    """Build mailto link for emailing the issue to IT."""
    to = "Cognida_IT@cognida.ai"
    subject = "IT Help Desk - Issue from Chatbot"
    body = f"I raised the following issue with the IT Help Desk Chatbot:\n\n{user_question}"
    if response_preview:
        body += f"\n\nChatbot response (summary):\n{response_preview}"
    body += "\n\nThe above issue is not resolved / I need further assistance."
    return f"mailto:{to}?subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(body)}"


# Page configuration
st.set_page_config(
    page_title="IT Help Desk Chatbot",
    page_icon="logo.png",
    layout="wide"
)

# Custom CSS - professional layout, full space utilization
st.markdown("""
    <style>
    [data-testid="stAppViewContainer"], .stApp,
    section[data-testid="stSidebar"], header[data-testid="stHeader"] { background-color: #e8eef5 !important; }
    .main, .main .block-container, section.main .block-container,
    div[data-testid="stVerticalBlock"] > div, .stChatInputContainer { background-color: #e8eef5 !important; }
    /* Utilize full width - wider max for professional use of space */
    .main .block-container { max-width: 100%; padding-left: 2rem; padding-right: 2rem; padding-top: 1.5rem; min-height: 70vh; }
    /* Header: logo inside, flexbox layout - logo top-left, title center, subtitle bottom-right */
    .main-header {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 38px 28px 44px 28px;
        min-height: 100px;
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        color: white;
        border-radius: 14px;
        margin-bottom: 26px;
        box-shadow: 0 4px 18px rgba(90, 103, 216, 0.28);
    }
    .header-logo {
        position: absolute;
        top: 12px;
        left: 20px;
        height: 65px;
        width: auto;
        background: transparent !important;
    }
    .header-title {
        font-size: 1.85rem;
        font-weight: 600;
        margin: 0;
        letter-spacing: -0.02em;
        flex: 1;
        text-align: center;
    }
    .header-tagline {
        position: absolute;
        bottom: 12px;
        right: 20px;
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.9;
    }
    @media (max-width: 640px) {
        .header-logo { height: 45px; top: 12px; left: 12px; }
        .header-title { font-size: 1.35rem; }
        .header-tagline { font-size: 0.7rem; right: 12px; bottom: 10px; }
    }
    .chat-section-title { font-size: 0.95rem; font-weight: 600; color: #4a5568; margin-bottom: 14px; }
    .chat-message {
        padding: 20px 22px;
        border-radius: 14px;
        margin-bottom: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        min-height: 52px;
        line-height: 1.55;
    }
    .user-message {
        background-color: #f8f7ff;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #5a67d8;
    }
    .assistant-message {
        background-color: #f8f7ff;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #6b46c1;
    }
    .email-it-link { font-size: 0.88em; margin-top: 8px; }
    .email-it-link a { color: #5a67d8; text-decoration: none; font-weight: 500; }
    .email-it-link a:hover { text-decoration: underline; }
    .welcome-card {
        background: #ffffff;
        border-radius: 18px;
        padding: 52px 60px 44px 60px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 24px rgba(90,103,216,0.08);
        min-height: 360px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .welcome-icon {
        font-size: 3rem;
        margin-bottom: 14px;
    }
    .welcome-title {
        font-size: 1.65rem;
        font-weight: 700;
        color: #2d3748;
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
    }
    .welcome-subtitle {
        font-size: 1rem;
        color: #718096;
        margin: 0 0 24px 0;
    }
    .welcome-divider {
        width: 60px;
        height: 3px;
        background: linear-gradient(135deg, #5a67d8, #6b46c1);
        border-radius: 99px;
        margin: 0 auto 28px auto;
    }
    .welcome-features {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
        max-width: 480px;
        margin-bottom: 28px;
        text-align: left;
    }
    .welcome-feature-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        background: #f8f7ff;
        border: 1px solid #e8e4ff;
        border-radius: 10px;
        padding: 14px 18px;
    }
    .feature-icon {
        font-size: 1.4rem;
        flex-shrink: 0;
        margin-top: 2px;
    }
    .welcome-feature-item strong {
        display: block;
        color: #2d3748;
        font-size: 0.95rem;
        margin-bottom: 3px;
    }
    .welcome-feature-item p {
        margin: 0;
        font-size: 0.85rem;
        color: #718096;
        line-height: 1.4;
    }
    .welcome-hint {
        font-size: 0.88rem;
        color: #a0aec0;
        margin: 0;
    }
    .welcome-hint strong {
        color: #5a67d8;
    }
    .suggestions-label { font-size: 0.9rem; color: #718096; margin: 20px 0 12px 0; }
    .ticket-card {
        background: #f8f7ff;
        border-radius: 14px;
        padding: 24px 28px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        margin-bottom: 16px;
    }
    .ticket-approval-box { border-left: 4px solid #5a67d8; padding-left: 16px; margin: 16px 0; }
    .dashboard-title { font-size: 1.1rem; font-weight: 600; color: #2d3748; margin-bottom: 16px; }
    /* White Create a ticket button */
    div:has(.create-ticket-green-marker) button {
        background-color: #ffffff !important;
        color: #2d3748 !important;
        border: 1px solid #e2e8f0 !important;
    }
    div:has(.create-ticket-green-marker) button:hover {
        background-color: #f7fafc !important;
        border-color: #cbd5e0 !important;
        color: #2d3748 !important;
    }
    /* Typing indicator */
    .typing-indicator {
        padding: 20px 24px;
        border-radius: 14px;
        margin-bottom: 14px;
        background-color: #f8f7ff;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #6b46c1;
        display: inline-block;
    }
    .typing-dots span { animation: typing-blink 1.4s infinite; }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-blink { 0%, 60% { opacity: 0.3; } 100% { opacity: 1; } }
    /* Main content: white buttons (override any green/primary) */
    section.main button,
    section.main [data-testid="baseButton-primary"],
    section.main [data-testid="baseButton-secondary"] {
        background-color: #ffffff !important;
        color: #2d3748 !important;
        border: 1px solid #e2e8f0 !important;
    }
    section.main button:hover,
    section.main [data-testid="baseButton-primary"]:hover,
    section.main [data-testid="baseButton-secondary"]:hover {
        background-color: #f7fafc !important;
        border-color: #cbd5e0 !important;
        color: #2d3748 !important;
    }
    /* Sidebar professional styling - white buttons (override green) */
    [data-testid="stSidebar"] { padding-top: 1rem; }
    [data-testid="stSidebar"] .stMarkdown { font-size: 0.9rem; }
    section[data-testid="stSidebar"] button,
    section[data-testid="stSidebar"] a[data-testid="baseButton-primary"],
    section[data-testid="stSidebar"] [data-testid="baseButton-primary"] {
        background-color: #ffffff !important;
        color: #2d3748 !important;
        border: 1px solid #e2e8f0 !important;
    }
    section[data-testid="stSidebar"] button:hover,
    section[data-testid="stSidebar"] a[data-testid="baseButton-primary"]:hover,
    section[data-testid="stSidebar"] [data-testid="baseButton-primary"]:hover {
        background-color: #f7fafc !important;
        border-color: #cbd5e0 !important;
        color: #2d3748 !important;
    }
    /* Dashboard button in header - prominent styling */
    button[data-testid*="baseButton"][kind="primary"]:has-text("📊 Dashboard"),
    button[aria-label*="Dashboard"] {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
        color: white !important;
        font-weight: 600 !important;
        border: none !important;
        box-shadow: 0 2px 8px rgba(90, 103, 216, 0.3) !important;
        border-radius: 8px !important;
    }
    /* Style all buttons with Dashboard text */
    div[data-testid="column"]:last-child button {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
        color: white !important;
        font-weight: 600 !important;
        border: none !important;
        box-shadow: 0 2px 8px rgba(90, 103, 216, 0.3) !important;
    }
    div[data-testid="column"]:last-child button:hover {
        background: linear-gradient(135deg, #4a57c8 0%, #5b36b1 100%) !important;
        color: white !important;
        box-shadow: 0 4px 12px rgba(90, 103, 216, 0.4) !important;
    }
    </style>
""", unsafe_allow_html=True)


@st.cache_resource(show_spinner="Loading...")
def _load_rag_backend_fallback():
    """Load RAG backend for fallback when FastAPI is unreachable"""
    from rag_backend import RAGBackend
    return RAGBackend()


def _query_chat(message: str, history: list) -> dict:
    """
    Query chat via FastAPI /api/chat. Falls back to RAG directly if API is unreachable.
    Returns dict with 'response' and 'sources'.
    """
    api_url = f"{config.API_BASE_URL.rstrip('/')}/api/chat"
    payload = {"message": message, "history": history}
    try:
        r = requests.post(api_url, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        return {"response": data.get("response", ""), "sources": data.get("sources", [])}
    except (requests.RequestException, ValueError) as e:
        # Fallback to direct RAG when API is down or unreachable
        try:
            rag = _load_rag_backend_fallback()
            return rag.query(message, history)
        except Exception as rag_err:
            return {
                "response": f"Unable to reach backend API ({e}). RAG fallback also failed: {rag_err}. "
                           "Start the FastAPI backend with: python backend/api.py",
                "sources": []
            }


def initialize_session_state():
    """Initialize session state variables"""
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []
    if 'messages' not in st.session_state:
        st.session_state.messages = []
    if 'pending_query' not in st.session_state:
        st.session_state.pending_query = None
    if 'show_ticket_form' not in st.session_state:
        st.session_state.show_ticket_form = False
    if 'pending_ticket' not in st.session_state:
        st.session_state.pending_ticket = None
    if 'ticket_created' not in st.session_state:
        st.session_state.ticket_created = None
    if 'show_dashboard' not in st.session_state:
        st.session_state.show_dashboard = False


def display_chat_message(role: str, content: str, sources: list = None):
    """Display a chat message with styling"""
    css_class = "user-message" if role == "user" else "assistant-message"
    icon = "👤" if role == "user" else "🤖"

    st.markdown(f"""
        <div class="chat-message {css_class}">
            <strong>{icon} {role.capitalize()}:</strong><br>
            {content}
        </div>
    """, unsafe_allow_html=True)


def display_typing_indicator():
    """Show assistant typing indicator (animated dots)."""
    st.markdown("""
        <div class="typing-indicator">
            <strong>🤖 Assistant:</strong>
            <span class="typing-dots"> <span>.</span><span>.</span><span>.</span></span>
        </div>
    """, unsafe_allow_html=True)


def main():
    initialize_session_state()

    # ---------- Header: logo left | title center | Dashboard button top-right ----------
    logo_b64 = _get_logo_base64()
    logo_img = f'<img class="header-logo" src="data:image/png;base64,{logo_b64}" alt="Cognida" />' if logo_b64 else ""
    
    col_header_main, col_header_btn = st.columns([6, 1])
    with col_header_main:
        st.markdown(f"""
            <div class="main-header">
                {logo_img}
                <h1 class="header-title">Cognida.ai IT Help Desk Chatbot</h1>
                <p class="header-tagline">Powered by RAG & Grok LLM</p>
            </div>
        """, unsafe_allow_html=True)
    
    with col_header_btn:
        st.markdown('<div style="height: 28px;"></div>', unsafe_allow_html=True)
        if st.button("📊 Ticket Dashboard", use_container_width=True, key="header_dashboard"):
            st.session_state.show_dashboard = True
            st.rerun()

    # ---------- LEFT SIDEBAR: New chat + Conversation view ----------
    with st.sidebar:
        if st.button("✨ New chat", use_container_width=True):
            st.session_state.messages = []
            st.session_state.chat_history = []
            st.session_state.pending_query = None
            st.rerun()
        st.divider()
        st.markdown("### 📋 Conversation view")
        st.markdown("*Your questions to the chatbot*")
        if st.button("🗑️ Clear conversation", use_container_width=True):
            st.session_state.messages = []
            st.session_state.chat_history = []
            st.session_state.pending_query = None
            st.rerun()
        st.divider()
        if st.session_state.show_ticket_form:
            if st.button("✖ Cancel", use_container_width=True):
                st.session_state.show_ticket_form = False
                st.session_state.pending_ticket = None
                st.rerun()
        if st.session_state.show_dashboard:
            if st.button("← Back to chat", use_container_width=True):
                st.session_state.show_dashboard = False
                st.rerun()
        st.divider()
        st.markdown("### 📌 My tickets")
        recent = get_tickets(limit=5)
        if not recent:
            st.caption("No tickets yet.")
        else:
            for t in recent:
                st.caption(f"**{t['id']}** — {t['subject'][:40]}…" if len(t['subject']) > 40 else f"**{t['id']}** — {t['subject']}")
        st.divider()
        user_messages = [m["content"] for m in st.session_state.messages if m["role"] == "user"]
        if not user_messages:
            st.caption("No messages yet. Start by typing a question below.")
        else:
            for i, msg in enumerate(user_messages, 1):
                preview = (msg[:60] + "…") if len(msg) > 60 else msg
                st.markdown(f"**{i}.** {preview}")
                st.caption("")

    # Main layout - same width as header card
    st.markdown('<p class="chat-section-title">💬 Chat-Interface view</p>', unsafe_allow_html=True)

    # ---------- Dashboard view: professional dashboard ----------
    if st.session_state.show_dashboard:
        render_dashboard()
        st.divider()
        if st.button("← Back to chat", key="back_from_dashboard"):
            st.session_state.show_dashboard = False
            st.rerun()
        st.stop()

    # ---------- Ticket tool: form + approval flow ----------
    if st.session_state.ticket_created:
        st.success(f"✅ Ticket **{st.session_state.ticket_created['id']}** created successfully!")
        if st.button("Create another ticket", key="create_another"):
            st.session_state.ticket_created = None
            st.session_state.show_ticket_form = True
            st.rerun()

    elif st.session_state.pending_ticket:
        # Approval step: chatbot asks for confirmation before submitting
        pt = st.session_state.pending_ticket
        st.markdown("""
            <div class="ticket-card ticket-approval-box">
                <p><strong>🤖 Assistant:</strong> Please review and approve this ticket before I submit it to IT.</p>
            </div>
        """, unsafe_allow_html=True)
        st.markdown(f"""
            <div class="ticket-card">
                <p><strong>Subject:</strong> {pt['subject']}</p>
                <p><strong>Description:</strong> {pt['description']}</p>
                <p><strong>Priority:</strong> {pt['priority']}</p>
            </div>
        """, unsafe_allow_html=True)
        col1, col2, col3 = st.columns([1, 1, 2])
        with col1:
            if st.button("✓ Approve & Submit", key="approve_ticket"):
                ticket = create_ticket(pt["subject"], pt["description"], pt["priority"])
                st.session_state.pending_ticket = None
                st.session_state.ticket_created = ticket
                st.session_state.show_ticket_form = False
                st.rerun()
        with col2:
            if st.button("✖ Cancel", key="cancel_approval"):
                st.session_state.pending_ticket = None
                st.rerun()

    elif st.session_state.show_ticket_form:
        with st.form("ticket_form", clear_on_submit=False):
            st.markdown("#### 🎫 Create IT ticket")
            subject = st.text_input("Subject", placeholder="e.g., Cannot access email")
            description = st.text_area("Description", placeholder="Describe your issue in detail...")
            priority = st.selectbox("Priority", ["Low", "Medium", "High"])
            submitted = st.form_submit_button("Submit for approval")
            if submitted and subject.strip():
                st.session_state.pending_ticket = {
                    "subject": subject.strip(),
                    "description": description.strip() or "(No description)",
                    "priority": priority,
                }
                st.rerun()
            elif submitted and not subject.strip():
                st.warning("Please enter a subject.")

    # Display chat history (with "Email this issue to IT" after each assistant reply)
    for i, message in enumerate(st.session_state.messages):
        display_chat_message(
            message['role'],
            message['content'],
            message.get('sources', [])
        )
        # After each assistant message, show link to email this issue to IT
        if message['role'] == 'assistant' and i > 0:
            user_question = st.session_state.messages[i - 1]['content']
            response_preview = (message['content'][:300] + "...") if len(message['content']) > 300 else message['content']
            mailto_url = build_email_to_it_link(user_question, response_preview)
            st.markdown(
                f'<p class="email-it-link">📧 <a href="{mailto_url}">Email this issue to IT (Cognida_IT@cognida.ai)</a></p>',
                unsafe_allow_html=True
            )

    # If we have a pending query, show typing indicator and fetch response
    if st.session_state.pending_query is not None:
        display_typing_indicator()
        with st.spinner("Searching knowledge base and generating response..."):
            result = _query_chat(
                st.session_state.pending_query,
                st.session_state.chat_history
            )
        st.session_state.messages.append({
            'role': 'assistant',
            'content': result['response'],
            'sources': result['sources']
        })
        st.session_state.chat_history.append({
            'role': 'assistant',
            'content': result['response']
        })
        st.session_state.pending_query = None
        st.rerun()

    user_input = st.chat_input("Type your IT help desk question here...")

    if user_input:
        # Detect ticket intent - show ticket form instead of sending to chatbot
        ticket_phrases = ["create a ticket", "create ticket", "raise a ticket", "submit a ticket", "open a ticket", "new ticket"]
        if any(phrase in user_input.lower() for phrase in ticket_phrases):
            st.session_state.show_ticket_form = True
            st.session_state.pending_ticket = None
            st.rerun()
        else:
            # Store user message and set pending query (show typing on next run)
            st.session_state.messages.append({
                'role': 'user',
                'content': user_input
            })
            st.session_state.chat_history.append({
                'role': 'user',
                'content': user_input
            })
            st.session_state.pending_query = user_input
            st.rerun()

    # Welcome screen
    if not st.session_state.messages and not st.session_state.show_ticket_form and not st.session_state.pending_ticket:
        st.markdown("""
            <div class="welcome-card">
                <div class="welcome-icon">🤖</div>
                <h2 class="welcome-title">Welcome to Cognida.ai IT Help Desk</h2>
                <p class="welcome-subtitle">Your intelligent IT support assistant — available 24/7</p>
                <div class="welcome-divider"></div>
                <div class="welcome-features">
                    <div class="welcome-feature-item">
                        <span class="feature-icon">💬</span>
                        <div>
                            <strong>Ask IT Questions</strong>
                            <p>Get instant answers on passwords, VPN, email, hardware and more</p>
                        </div>
                    </div>
                    <div class="welcome-feature-item">
                        <span class="feature-icon">🎫</span>
                        <div>
                            <strong>Raise a Ticket</strong>
                            <p>Can't find your answer? Create a support ticket in seconds</p>
                        </div>
                    </div>
                    <div class="welcome-feature-item">
                        <span class="feature-icon">📊</span>
                        <div>
                            <strong>Track Your Tickets</strong>
                            <p>View all tickets and their status from the dashboard</p>
                        </div>
                    </div>
                </div>
                <p class="welcome-hint">Type a question below or click <strong>Create a ticket</strong> to get started</p>
            </div>
        """, unsafe_allow_html=True)
        st.markdown('<div class="create-ticket-green-marker"></div>', unsafe_allow_html=True)
        if st.button("Create a ticket", use_container_width=True, key="welcome_create_ticket"):
            st.session_state.show_ticket_form = True
            st.session_state.pending_ticket = None
            st.rerun()


if __name__ == "__main__":
    main()
