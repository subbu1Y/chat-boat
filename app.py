"""
IT Help Desk Chatbot - Streamlit Frontend
RAG-based chatbot using Grok LLM
"""
import urllib.parse
import streamlit as st
from rag_backend import RAGBackend
import config


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
    page_icon=r"IT logo.png",
    layout="wide"
)

# Custom CSS
st.markdown("""
    <style>
    /* App background - light blue (fill all white areas) */
    [data-testid="stAppViewContainer"],
    .stApp,
    .main .block-container,
    section[data-testid="stSidebar"],
    section.main .block-container,
    div[data-testid="stVerticalBlock"] > div,
    .stChatInputContainer,
    header[data-testid="stHeader"] { background-color: #d4e4f7 !important; }
    .main { background-color: #d4e4f7 !important; }
    .main-header {
        position: relative;
        text-align: center;
        padding: 28px 24px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 30px;
    }
    .main-header h1 { font-size: 2rem; margin: 0; }
    .header-tagline {
        position: absolute;
        bottom: 10px;
        right: 15px;
        margin: 0;
        font-size: 0.85em;
        opacity: 0.95;
    }
    .chat-message {
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 10px;
    }
    .user-message {
        background-color: #e3f2fd;
        border-left: 5px solid #2196F3;
    }
    .assistant-message {
        background-color: #f3e5f5;
        border-left: 5px solid #9c27b0;
    }
    /* Logo column - no white background, transparent so app background shows */
    [data-testid="column"]:first-child .stImage img { background: transparent !important; }
    .email-it-link { font-size: 0.9em; margin-top: 6px; }
    .email-it-link a { color: #3949ab; text-decoration: none; }
    .email-it-link a:hover { text-decoration: underline; }
    /* Typing indicator */
    .typing-indicator {
        padding: 15px 20px;
        border-radius: 10px;
        margin-bottom: 14px;
        background-color: #f3e5f5;
        border-left: 5px solid #9c27b0;
        display: inline-block;
    }
    .typing-dots span { animation: typing-blink 1.4s infinite; }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-blink { 0%, 60% { opacity: 0.3; } 100% { opacity: 1; } }
    </style>
""", unsafe_allow_html=True)


@st.cache_resource(show_spinner="Loading...")
def load_rag_backend():
    """Load and cache the RAG backend"""
    return RAGBackend()


def initialize_session_state():
    """Initialize session state variables"""
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []
    if 'messages' not in st.session_state:
        st.session_state.messages = []
    if 'pending_query' not in st.session_state:
        st.session_state.pending_query = None


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
    # ---------- TOP LEFT LOGO (watermark-style, larger & visible) ----------
    left_col, right_col = st.columns([1, 6])

    with left_col:
        st.image(r"image.png", width=150)

    # ---------- HEADER ----------
    st.markdown("""
        <div class="main-header">
            <h1> Cognida.ai IT Help Desk Chatbot</h1>
            <p class="header-tagline">Powered by RAG & Grok LLM</p>
        </div>
    """, unsafe_allow_html=True)

    # Initialize session state
    initialize_session_state()

    # ---------- LEFT SIDEBAR: New chat + Conversation view ----------
    with st.sidebar:
        if st.button("✨ New chat", use_container_width=True, type="primary"):
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
        user_messages = [m["content"] for m in st.session_state.messages if m["role"] == "user"]
        if not user_messages:
            st.caption("No messages yet. Start by typing a question below.")
        else:
            for i, msg in enumerate(user_messages, 1):
                preview = (msg[:60] + "…") if len(msg) > 60 else msg
                st.markdown(f"**{i}.** {preview}")
                st.caption("")

    # Main layout
    col1, col2 = st.columns([3, 1])

    with col1:
        st.markdown("### 💬 Chat-Interface view")

    # Load RAG backend
    try:
        rag_backend = load_rag_backend()
    except Exception as e:
        st.error(f"Error loading RAG backend: {e}")
        st.info("Please make sure you've run `indexer.py` to create the knowledge base first.")
        st.stop()

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
            result = rag_backend.query(
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
    if not st.session_state.messages:
        st.markdown("""
            <div style="text-align:center; padding:40px; background-color:#e8eaf6; border-radius:10px;">
                <h3 style="color:#3949ab;">👋 Welcome to IT Help Desk Chatbot!</h3>
            </div>
        """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
