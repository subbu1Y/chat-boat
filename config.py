"""
Configuration file for RAG Chatbot
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (parent of this file) - ensures correct path when backend runs
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path, override=True)

# LLM Provider Selection - groq (free), gemini, grok, openai
LLM_PROVIDER = (os.getenv("LLM_PROVIDER", "groq") or "groq").strip().lower()

# Google Gemini API Configuration (AIzaSy... key from https://aistudio.google.com/apikey)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Grok API Configuration
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_API_BASE = "https://api.x.ai/v1"
GROK_MODEL = "grok-3"

# OpenAI API Configuration (alternative)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-3.5-turbo"  # or "gpt-4"

# Groq API Configuration (free tier available)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_BASE = "https://api.groq.com/openai/v1"
# For better quality use: llama-3.1-70b-versatile (slower). For speed: llama-3.1-8b-instant
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# Document Processing Configuration
CHUNK_SIZE = 500  # characters per chunk
CHUNK_OVERLAP = 50  # overlap between chunks
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # sentence-transformers model

# Storage Configuration
DOCUMENTS_DIR = "sample_documents"
INDEX_FILE = "knowledge_base/document_index.json"
EMBEDDINGS_FILE = "knowledge_base/embeddings.json"

# RAG Configuration (more chunks = better context for LLM)
TOP_K_RESULTS = 5  # number of relevant chunks to retrieve
SIMILARITY_THRESHOLD = 0.25  # slightly lower to include more relevant context

# Chat Configuration
MAX_HISTORY = 10  # maximum chat history to maintain
TEMPERATURE = 0.4  # lower = more focused and consistent answers
MAX_TOKENS = 1500  # allow longer, complete responses

# API Configuration (React frontend proxies /api to FastAPI backend)
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Email Notification Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "subrahmanyam.pillalamarri@cognida.ai")