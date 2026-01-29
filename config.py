"""
Configuration file for RAG Chatbot
"""
import os
from dotenv import load_dotenv

load_dotenv()

# LLM Provider Selection
# Options: "grok", "openai", "groq"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "grok")

# Grok API Configuration
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_API_BASE = "https://api.x.ai/v1"
GROK_MODEL = "grok-beta"

# OpenAI API Configuration (alternative)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-3.5-turbo"  # or "gpt-4"

# Groq API Configuration (free tier available)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_BASE = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.1-8b-instant"  # Llama 3.1 - Fast, optimized for instant responses

# Document Processing Configuration
CHUNK_SIZE = 500  # characters per chunk
CHUNK_OVERLAP = 50  # overlap between chunks
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # sentence-transformers model

# Storage Configuration
DOCUMENTS_DIR = "sample_documents"
INDEX_FILE = "knowledge_base/document_index.json"
EMBEDDINGS_FILE = "knowledge_base/embeddings.json"

# RAG Configuration
TOP_K_RESULTS = 3  # number of relevant chunks to retrieve
SIMILARITY_THRESHOLD = 0.3  # minimum similarity score

# Chat Configuration
MAX_HISTORY = 10  # maximum chat history to maintain
TEMPERATURE = 0.7
MAX_TOKENS = 1000

