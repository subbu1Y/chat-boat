"""
RAG Backend for IT Help Desk Chatbot
Handles document retrieval and LLM interaction with Grok
"""
import json
import os
import numpy as np
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer
from openai import OpenAI
import httpx
import config

# HTTP client that ignores proxy env vars (HTTP_PROXY, HTTPS_PROXY) to avoid proxy errors
_http_client = httpx.Client(trust_env=False)


class RAGBackend:
    def __init__(self):
        """Initialize RAG backend with embedding model and vector store"""
        try:
            self.model = SentenceTransformer(config.EMBEDDING_MODEL)
        except Exception as e:
            print(f"Warning: could not load embedding model: {e}")
            self.model = None
        self.chunks = []
        self.embeddings = []
        self.load_index()
        self.init_error = None
        
        # Initialize LLM client based on provider
        self.llm_provider = config.LLM_PROVIDER
        self.client = None
        self.model_name = None
        
        if self.llm_provider == "grok":
            if config.GROK_API_KEY:
                try:
                    self.client = OpenAI(
                        api_key=config.GROK_API_KEY,
                        base_url=config.GROK_API_BASE,
                        http_client=_http_client
                    )
                    self.model_name = config.GROK_MODEL
                    print(f"Using Grok LLM: {self.model_name}")
                except Exception as e:
                    self.client = None
                    self.init_error = str(e)
                    print(f"Error initializing Grok client: {e}")
            else:
                print("Warning: GROK_API_KEY not set. Please set it in .env file")
        
        elif self.llm_provider == "openai":
            if config.OPENAI_API_KEY:
                try:
                    self.client = OpenAI(
                        api_key=config.OPENAI_API_KEY,
                        http_client=_http_client
                    )
                    self.model_name = config.OPENAI_MODEL
                    print(f"Using OpenAI: {self.model_name}")
                except Exception as e:
                    self.client = None
                    self.init_error = str(e)
                    print(f"Error initializing OpenAI client: {e}")
            else:
                print("Warning: OPENAI_API_KEY not set. Please set it in .env file")
        
        elif self.llm_provider == "groq":
            if config.GROQ_API_KEY:
                try:
                    self.client = OpenAI(
                        api_key=config.GROQ_API_KEY,
                        base_url=config.GROQ_API_BASE,
                        http_client=_http_client
                    )
                    self.model_name = config.GROQ_MODEL
                    print(f"Using Groq: {self.model_name}")
                except Exception as e:
                    self.client = None
                    self.init_error = str(e)
                    print(f"Error initializing Groq client: {e}")
            else:
                print("Warning: GROQ_API_KEY not set. Please set it in .env file")
        
        if not self.client:
            print(f"No valid API key found or client failed to initialize for provider: {self.llm_provider}")
    
    def load_index(self):
        """Load document chunks and embeddings from JSON files"""
        try:
            # Load chunks
            if os.path.exists(config.INDEX_FILE):
                with open(config.INDEX_FILE, 'r', encoding='utf-8') as f:
                    self.chunks = json.load(f)
                print(f"Loaded {len(self.chunks)} chunks")
            else:
                print(f"Index file not found: {config.INDEX_FILE}")
                print("Please run indexer.py first to create the knowledge base")
            
            # Load embeddings
            if os.path.exists(config.EMBEDDINGS_FILE):
                with open(config.EMBEDDINGS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.embeddings = np.array(data['embeddings'])
                print(f"Loaded {len(self.embeddings)} embeddings")
            else:
                print(f"Embeddings file not found: {config.EMBEDDINGS_FILE}")
                
        except Exception as e:
            print(f"Error loading index: {e}")
    
    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        return dot_product / (norm1 * norm2) if norm1 and norm2 else 0.0
    
    def retrieve_relevant_chunks(self, query: str, top_k: int = None) -> List[Tuple[Dict, float]]:
        """Retrieve most relevant chunks for a query"""
        if not self.chunks or len(self.embeddings) == 0:
            return []
        
        top_k = top_k or config.TOP_K_RESULTS
        
        # Generate query embedding
        query_embedding = self.model.encode(query)
        
        # Calculate similarities
        similarities = []
        for i, chunk_embedding in enumerate(self.embeddings):
            similarity = self.cosine_similarity(query_embedding, chunk_embedding)
            if similarity >= config.SIMILARITY_THRESHOLD:
                similarities.append((i, similarity))
        
        # Sort by similarity and get top k
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_results = similarities[:top_k]
        
        # Return chunks with their scores
        results = [
            (self.chunks[idx], score) 
            for idx, score in top_results
        ]
        
        return results
    
    def build_context(self, relevant_chunks: List[Tuple[Dict, float]]) -> str:
        """Build context string from retrieved chunks"""
        if not relevant_chunks:
            return "No relevant information found in the knowledge base."
        
        context_parts = []
        for chunk, score in relevant_chunks:
            context_parts.append(
                f"[Source: {chunk['source']}, Relevance: {score:.2f}]\n{chunk['text']}"
            )
        
        return "\n\n---\n\n".join(context_parts)
    
    def create_prompt(self, query: str, context: str, chat_history: List[Dict] = None) -> str:
        """Create prompt for LLM with clear instructions for better responses"""
        system_prompt = """You are an expert IT Help Desk assistant. Your job is to help users with IT-related questions and issues.

Instructions for your response:
1. Use the KNOWLEDGE BASE CONTEXT below as the primary source. Base your answer on it when it is relevant.
2. Structure your answer clearly: use short paragraphs, bullet points or numbered steps when explaining procedures.
3. Be specific and actionable (e.g. exact steps, links, or options) instead of vague advice.
4. If the context does not contain enough information, say so briefly and give the best general guidance you can.
5. Stay professional, clear, and concise. Do not make up information; if unsure, say so."""

        context_section = f"\n\nKNOWLEDGE BASE CONTEXT:\n{context}\n"
        
        history_section = ""
        if chat_history:
            history_section = "\n\nCHAT HISTORY:\n"
            for msg in chat_history[-config.MAX_HISTORY:]:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                history_section += f"{role.upper()}: {content}\n"
        
        user_query = f"\n\nUSER QUESTION:\n{query}\n\nProvide a helpful, well-structured response based on the context above."
        
        return system_prompt + context_section + history_section + user_query
    
    def query(self, user_query: str, chat_history: List[Dict] = None) -> Dict:
        """
        Process a user query and return response with sources
        
        Returns:
            Dict with 'response', 'sources', and 'relevant_chunks'
        """
        # Retrieve relevant chunks
        relevant_chunks = self.retrieve_relevant_chunks(user_query)
        
        # Build context
        context = self.build_context(relevant_chunks)
        
        # Create prompt
        prompt = self.create_prompt(user_query, context, chat_history)
        
        # Get response from LLM
        if not self.client:
            err_msg = f"Error: {self.llm_provider.upper()} API key not configured. Please set the appropriate API key in your .env file."
            if getattr(self, 'init_error', None):
                err_msg = f"Initialization error for {self.llm_provider.upper()}: {self.init_error}\n\n{err_msg}"
            return {
                'response': err_msg,
                'sources': [],
                'relevant_chunks': []
            }
        
        try:
            system_instruction = (
                "You are an expert IT Help Desk assistant. Give clear, structured answers. "
                "Use bullet points or numbered steps when explaining procedures. "
                "Base answers on the provided context; if context is missing, say so and give brief general guidance."
            )
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                temperature=config.TEMPERATURE,
                max_tokens=config.MAX_TOKENS
            )
            
            answer = response.choices[0].message.content

            # Footer line at the end of every assistant response
            footer = "\n\n---\nIf the issue is not resolved or it is an access-based issue, please reach out or send an email to Cognida_IT@cognida.ai"
            answer = answer.strip() + footer

            # Extract unique sources
            sources = list(set([chunk['source'] for chunk, _ in relevant_chunks]))
            
            return {
                'response': answer,
                'sources': sources,
                'relevant_chunks': relevant_chunks
            }
            
        except Exception as e:
            error_msg = f"Error querying {self.llm_provider.upper()} API: {str(e)}"
            print(error_msg)
            
            # Provide helpful error messages based on common issues
            if "403" in str(e) or "credits" in str(e).lower():
                error_msg += "\n\n💡 Solution: Your account needs credits. Either:\n"
                error_msg += "1. Add credits to your account\n"
                error_msg += "2. Try a different LLM provider (OpenAI, Groq) by changing LLM_PROVIDER in .env"
            elif "401" in str(e):
                error_msg += "\n\n💡 Check your API key is correct in .env file"
            
            return {
                'response': error_msg,
                'sources': [],
                'relevant_chunks': []
            }


if __name__ == "__main__":
    # Test the RAG backend
    rag = RAGBackend()
    
    test_query = "How do I reset my password?"
    print(f"\nTest Query: {test_query}")
    print("=" * 50)
    
    result = rag.query(test_query)
    
    print(f"\nResponse: {result['response']}")
    print(f"\nSources: {result['sources']}")
    print(f"\nRelevant Chunks: {len(result['relevant_chunks'])}")

