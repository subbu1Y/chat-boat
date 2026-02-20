# IT Help Desk RAG Chatbot 🤖

A Retrieval-Augmented Generation (RAG) based chatbot for IT Help Desk support, powered by Google Gemini (or Grok/Groq) and built with **React + Vite** frontend and FastAPI backend.

## Features ✨

- 🔍 **Intelligent Document Search**: Uses semantic search with embeddings to find relevant information
- 💬 **Conversational AI**: Powered by Gemini/Grok/Groq for natural, context-aware responses
- 📚 **Knowledge Base Management**: Process and index your IT documentation
- 🎨 **Modern UI**: React + Vite frontend with Chat, Dashboard, and Ticket Management
- 📊 **Ticket Dashboard**: KPI cards, charts, and ticket tracking
- 💾 **JSON Storage**: Lightweight storage for document chunks and embeddings
- 🔐 **Source Attribution**: Shows which documents were used to generate responses

## Architecture 🏗️

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                     IT Help Desk Chatbot                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   ┌────▼────┐               ┌─────▼─────┐               ┌─────▼─────┐
   │ React   │               │  FastAPI  │               │  Indexer  │
   │ (Vite)  │◄── /api/* ────┤  Backend  │◄──────────────┤(indexer)  │
   │ :5173   │               │  :8000    │               └───────────┘
   └─────────┘               └─────┬─────┘
        │                           │
        │                    ┌──────┴──────┐
        │                    │ RAG Backend │
        │                    │ (rag_backend)│
        │                    └──────┬──────┘
        │                           │
        │               ┌────────────┴────────────┐
        │               │                        │
        │         ┌─────▼─────┐          ┌──────▼──────┐
        │         │ Gemini/   │          │ Embeddings  │
        │         │ Grok/Groq │          │(SentenceTr.)│
        │         └───────────┘          └─────────────┘
        │
   ┌────▼────┐  (optional - legacy)
   │Streamlit│  streamlit run app.py
   │ app.py  │
   └─────────┘
```

### How RAG Works in This System

1. **Indexing Phase** (Run once or when documents change):
   ```
   Documents → Chunking → Embedding → JSON Storage
   ```

2. **Query Phase** (Each user question):
   ```
   User Query → Embed Query → Find Similar Chunks → Build Context → 
   Send to Grok LLM → Generate Response → Display with Sources
   ```

## Installation 🚀

### Prerequisites

- Python 3.8 or higher
- Node.js 18+ (for React frontend)
- API Key: **Gemini** ([aistudio.google.com](https://aistudio.google.com/apikey)), **Groq** ([console.groq.com](https://console.groq.com/keys)), or **Grok** ([console.x.ai](https://console.x.ai/))
- Internet connection for downloading models

### Setup Steps

1. **Clone or download this repository**

2. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

3. **Create .env file** in the project root (copy from `env_template.txt`):
```bash
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your_google_api_key_here
```

4. **Install frontend dependencies** (for React):
```bash
cd frontend && npm install
```

5. **Add your IT documentation** to the `sample_documents/` folder:
   - Supported formats: `.txt`, `.md`
   - Files already included as examples

## Usage 📖

### Step 1: Index Your Documents

Before using the chatbot, you need to create the knowledge base index:

```bash
python indexer.py
```

This process will:
1. Read all documents from `sample_documents/` folder
2. Split documents into chunks (500 characters with 50 character overlap)
3. Generate embeddings using `all-MiniLM-L6-v2` model
4. Save chunks to `knowledge_base/document_index.json`
5. Save embeddings to `knowledge_base/embeddings.json`

**Expected Output**:
```
==================================================
Starting Document Indexing Process
==================================================
Loading embedding model: all-MiniLM-L6-v2
Loaded: password_reset.txt
Loaded: vpn_access.txt
Loaded: printer_troubleshooting.txt
Loaded: email_issues.txt
Loaded: hardware_issues.txt
Created 245 chunks from 5 documents
Generating embeddings for 245 chunks...
Saved 245 chunks to knowledge_base/document_index.json
Saved embeddings to knowledge_base/embeddings.json
==================================================
Indexing Complete!
==================================================
```

### Step 2: Run the Chatbot

**Option A: React + Vite (Recommended)**

1. Start the FastAPI backend:
```bash
python backend/api.py
```

2. Start the React frontend:
```bash
cd frontend && npm run dev
```

3. Open **http://localhost:5173** in your browser

**Option B: Streamlit (Legacy)**

```bash
streamlit run app.py
```

Opens at `http://localhost:8501`. Streamlit calls the backend when running; if backend is down, it falls back to direct RAG.

### Step 3: Ask Questions

Try these example questions:
- "How do I reset my password?"
- "My computer won't turn on, what should I do?"
- "How to connect to VPN?"
- "Printer is not printing, help!"
- "I can't send emails from Outlook"

## Document Indexing Deep Dive 📚

### Chunking Strategy

The system uses **overlapping fixed-size chunking**:

- **Chunk Size**: 500 characters
  - Small enough for focused context
  - Large enough to maintain semantic meaning
  - Adjustable in `config.py`

- **Overlap**: 50 characters
  - Prevents information loss at chunk boundaries
  - Ensures continuous concepts aren't split
  - Maintains context across chunks

**Example Chunking**:
```
Document: "How to reset password. Step 1: Go to portal... Step 2: Click forgot..."
                                    ↓
Chunk 1: "How to reset password. Step 1: Go to portal..."
Chunk 2: "...Go to portal... Step 2: Click forgot..."
         [←---- 50 char overlap ----→]
```

### Embedding Model

Uses **all-MiniLM-L6-v2** from Sentence Transformers:
- **Size**: 22.7 MB (lightweight)
- **Speed**: Fast inference (~3ms per sentence on CPU)
- **Quality**: 384-dimensional embeddings
- **Performance**: Good balance between speed and accuracy
- **Local**: Runs entirely on your machine (no API calls for embeddings)

### JSON Storage Format

**Document Index** (`knowledge_base/document_index.json`):
```json
[
  {
    "id": 0,
    "text": "Password Reset Guide - IT Help Desk...",
    "source": "password_reset.txt",
    "start_pos": 0,
    "end_pos": 500
  },
  {
    "id": 1,
    "text": "If you've forgotten your password...",
    "source": "password_reset.txt",
    "start_pos": 450,
    "end_pos": 950
  }
]
```

**Embeddings** (`knowledge_base/embeddings.json`):
```json
{
  "model": "all-MiniLM-L6-v2",
  "embeddings": [
    [0.123, -0.456, 0.789, ...], // 384 dimensions for chunk 0
    [-0.234, 0.567, -0.890, ...] // 384 dimensions for chunk 1
  ]
}
```

### Retrieval Process

1. **Query Embedding**: Convert user question to 384-dimensional vector
2. **Similarity Calculation**: Compute cosine similarity between query and all chunk embeddings
3. **Filtering**: Only keep chunks with similarity >= 0.3 (configurable threshold)
4. **Ranking**: Sort by similarity score (highest first)
5. **Selection**: Return top 3 most relevant chunks (configurable)

**Cosine Similarity Formula**:
```
similarity = (A · B) / (||A|| × ||B||)
where A = query embedding, B = chunk embedding
```

## Configuration ⚙️

Edit `config.py` to customize:

```python
# Document Processing
CHUNK_SIZE = 500              # Characters per chunk
CHUNK_OVERLAP = 50            # Overlap between chunks
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Retrieval
TOP_K_RESULTS = 3             # Number of chunks to retrieve
SIMILARITY_THRESHOLD = 0.3    # Minimum similarity score

# Grok LLM
TEMPERATURE = 0.7             # Response creativity (0-1)
MAX_TOKENS = 1000             # Maximum response length
```

## Project Structure 📁

```
Chat-bot 2.0/
├── backend/                        # FastAPI backend
│   └── api.py                     # REST API (chat, tickets, dashboard)
├── frontend/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/            # Chat, Dashboard, TicketForm, Sidebar, Header
│   │   └── services/api.js        # Axios API client
│   ├── package.json
│   └── vite.config.js
├── app.py                          # Streamlit frontend (legacy)
├── rag_backend.py                  # RAG logic & LLM integration
├── indexer.py                      # Document processing & indexing
├── config.py                       # Configuration settings
├── tickets.py                      # Ticket storage & dashboard stats
├── requirements.txt
├── .env                            # API keys (create this)
├── RUN_INSTRUCTIONS.md             # Run commands
├── sample_documents/
└── knowledge_base/
```

## Adding New Documents 📄

1. Add `.txt` or `.md` files to `sample_documents/` folder
2. Run indexer again:
   ```bash
   python indexer.py
   ```
3. Restart the Streamlit app (or click "Reload Knowledge Base" in sidebar)

**Best Practices**:
- Use clear, descriptive filenames
- Structure documents with headings
- Include step-by-step instructions
- Add relevant keywords for better retrieval
- Keep documents focused on specific topics

## Troubleshooting 🔧

### "GROK_API_KEY not set" Error
- Create `.env` file in project root
- Add: `GROK_API_KEY=your_actual_api_key`
- Restart the application

### "Index file not found" Error
- Run `python indexer.py` first
- Ensure `knowledge_base/` directory is created
- Check that documents exist in `sample_documents/`

### Poor Response Quality
- Add more relevant documents to knowledge base
- Increase `TOP_K_RESULTS` in config.py
- Lower `SIMILARITY_THRESHOLD` to retrieve more chunks
- Improve document quality and structure

### Slow Performance
- First run downloads embedding model (~23MB) - one time only
- Reduce `CHUNK_SIZE` for faster embedding generation
- Consider upgrading to GPU-enabled machine for large document sets

### Embedding Model Download Issues
- Requires internet connection on first run
- Model cached locally after first download
- Location: `~/.cache/torch/sentence_transformers/`

## API Costs 💰

- **Sentence Transformers**: Free (runs locally)
- **Grok API**: Pay per use
  - Check pricing at [X.AI Pricing](https://x.ai/pricing)
  - Monitor usage in X.AI console
  - Average cost per query: ~$0.001-0.01 (depending on context size)

## Performance Optimization 🚀

### For Large Document Sets (1000+ documents):

1. **Use Vector Database** instead of JSON:
   - Consider Chroma, Pinecone, or Weaviate
   - Faster similarity search
   - Better scalability

2. **Batch Processing**:
   - Process documents in batches
   - Use multi-threading for embedding generation

3. **Caching**:
   - Cache frequent queries
   - Implement query similarity to avoid duplicate LLM calls

4. **Hybrid Search**:
   - Combine semantic search with keyword search
   - Use BM25 + vector similarity

## Security Considerations 🔒

- ⚠️ Never commit `.env` file to version control
- 🔐 Keep API keys secure
- 🛡️ Validate and sanitize user inputs
- 📝 Implement logging for audit trails
- 🔑 Use environment-specific configurations
- 👥 Implement user authentication for production use

## Limitations & Future Improvements 🔮

### Current Limitations:
- JSON storage not optimal for large scale (use vector DB for production)
- Simple chunking (doesn't respect sentence/paragraph boundaries)
- No caching mechanism
- Limited file format support (.txt, .md only)

### Planned Improvements:
- [ ] Support for PDF, DOCX, HTML documents
- [ ] Semantic chunking (respecting document structure)
- [ ] Query caching and response history
- [ ] User feedback mechanism (thumbs up/down)
- [ ] Multi-language support
- [ ] Hybrid search (keyword + semantic)
- [ ] Admin dashboard for knowledge base management
- [ ] Export conversation history

## Contributing 🤝

To extend this chatbot:

1. **Add new document formats**: Modify `indexer.py` `read_documents()` method
2. **Change chunking strategy**: Update `create_chunks()` method
3. **Use different LLM**: Replace Grok API calls in `rag_backend.py`
4. **Improve UI**: Customize `app.py` Streamlit components
5. **Add features**: Extend functionality in respective modules

## Tech Stack 🛠️

- **Frontend**: React + Vite (primary), Streamlit (legacy)
- **Backend**: FastAPI
- **LLM**: Google Gemini, Grok, Groq, or OpenAI (configurable)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Storage**: JSON files (or PostgreSQL optional)
- **Vector Search**: NumPy (cosine similarity)

## License 📄

This project is open-source and available for educational and commercial use.

## Support 💬

For questions or issues:
1. Check this README thoroughly
2. Review `config.py` for customization options
3. Test with sample documents first
4. Check Grok API status at [X.AI Status](https://status.x.ai/)

## Acknowledgments 🙏

- X.AI for Grok LLM API
- Sentence Transformers team for embedding models
- Streamlit for the amazing UI framework
- Open source community for inspiration

---

**Made with ❤️ for IT Help Desks everywhere**

*Last Updated: January 2026*

