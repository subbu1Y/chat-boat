"""
IT Help Desk Chatbot - Streamlit Frontend
RAG-based chatbot using Grok LLM
"""
import streamlit as st
from rag_backend import RAGBackend
import config


# Page configuration
st.set_page_config(
    page_title="IT Help Desk Chatbot",
    page_icon=r"IT logo.png",
    layout="wide"
)

# Custom CSS
st.markdown("""
    <style>
    .main-header {
        position: relative;
        text-align: center;
        padding: 20px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 30px;
    }
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


def main():
    # ---------- TOP LEFT IMAGE ----------
    left_col, right_col = st.columns([1, 6])

    with left_col:
        st.image(
            r"image.png",
            width=120
        )

    # ---------- HEADER ----------
    st.markdown("""
        <div class="main-header">
            <h1>🤖 IT Help Desk Chatbot</h1>
            <p class="header-tagline">Powered by RAG & Grok LLM</p>
        </div>
    """, unsafe_allow_html=True)

    # Initialize session state
    initialize_session_state()

    # Main layout
    col1, col2 = st.columns([3, 1])

    with col1:
        st.markdown("### 💬 Chat-Interface view")

    # with col2:
    #     show_debug = st.checkbox("Show Debug Info", value=False)

    # Load RAG backend
    try:
        rag_backend = load_rag_backend()
    except Exception as e:
        st.error(f"Error loading RAG backend: {e}")
        st.info("Please make sure you've run `indexer.py` to create the knowledge base first.")
        st.stop()

    # Display chat history
    for message in st.session_state.messages:
        display_chat_message(
            message['role'],
            message['content'],
            message.get('sources', [])
        )

    # Chat input
    user_input = st.chat_input("Type your IT help desk question here...")

    if user_input:
        # Store user message
        st.session_state.messages.append({
            'role': 'user',
            'content': user_input
        })
        st.session_state.chat_history.append({
            'role': 'user',
            'content': user_input
        })

        display_chat_message('user', user_input)

        # Query RAG backend
        with st.spinner("🔍 Searching knowledge base and generating response..."):
            result = rag_backend.query(user_input, st.session_state.chat_history)

        # Store assistant message
        st.session_state.messages.append({
            'role': 'assistant',
            'content': result['response'],
            'sources': result['sources']
        })
        st.session_state.chat_history.append({
            'role': 'assistant',
            'content': result['response']
        })

        display_chat_message('assistant', result['response'], result['sources'])

        # Debug info
        # if show_debug and result.get('relevant_chunks'):
        #     with st.expander("🔍 Debug: Retrieved Chunks"):
        #         for i, (chunk, score) in enumerate(result['relevant_chunks'], 1):
        #             st.markdown(f"**Chunk {i}** (Similarity: {score:.3f})")
        #             st.markdown(f"*Source: {chunk['source']}*")
        #             st.text(
        #                 chunk['text'][:200] + "..."
        #                 if len(chunk['text']) > 200
        #                 else chunk['text']
        #             )
        #             st.markdown("---")

        st.rerun()

    # Welcome screen
    if not st.session_state.messages:
        st.markdown("""
            <div style="text-align:center; padding:40px; background-color:#f5f5f5; border-radius:10px;">
                <h3>👋 Welcome to IT Help Desk Chatbot!</h3>
                <p>Ask questions about password resets, troubleshooting, or system configurations.</p>
            </div>
        """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
