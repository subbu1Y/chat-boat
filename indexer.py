"""
Document Indexer for RAG System
Processes documents, creates chunks, generates embeddings, and stores in JSON
"""
import os
import json
from typing import List, Dict
from sentence_transformers import SentenceTransformer
import config


class DocumentIndexer:
    def __init__(self):
        """Initialize the document indexer with embedding model"""
        print(f"Loading embedding model: {config.EMBEDDING_MODEL}")
        self.model = SentenceTransformer(config.EMBEDDING_MODEL)
        self.chunks = []
        self.embeddings = []
        
    def read_documents(self, directory: str) -> List[Dict]:
        """Read all text documents from directory"""
        documents = []
        if not os.path.exists(directory):
            print(f"Directory {directory} does not exist. Creating it...")
            os.makedirs(directory)
            return documents
            
        for filename in os.listdir(directory):
            filepath = os.path.join(directory, filename)
            if filename.endswith(('.txt', '.md')):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        documents.append({
                            'filename': filename,
                            'content': content
                        })
                    print(f"Loaded: {filename}")
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
        return documents
    
    def create_chunks(self, documents: List[Dict]) -> List[Dict]:
        """Split documents into overlapping chunks"""
        chunks = []
        chunk_id = 0
        
        for doc in documents:
            content = doc['content']
            filename = doc['filename']
            
            # Simple character-based chunking with overlap
            start = 0
            while start < len(content):
                end = start + config.CHUNK_SIZE
                chunk_text = content[start:end]
                
                # Don't create empty chunks
                if chunk_text.strip():
                    chunks.append({
                        'id': chunk_id,
                        'text': chunk_text.strip(),
                        'source': filename,
                        'start_pos': start,
                        'end_pos': end
                    })
                    chunk_id += 1
                
                # Move forward with overlap
                start = end - config.CHUNK_OVERLAP
                
                # Break if we've reached the end
                if end >= len(content):
                    break
        
        print(f"Created {len(chunks)} chunks from {len(documents)} documents")
        return chunks
    
    def generate_embeddings(self, chunks: List[Dict]) -> List[List[float]]:
        """Generate embeddings for all chunks"""
        texts = [chunk['text'] for chunk in chunks]
        print(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = self.model.encode(texts, show_progress_bar=True)
        return embeddings.tolist()
    
    def save_index(self, chunks: List[Dict], embeddings: List[List[float]]):
        """Save chunks and embeddings to JSON files"""
        # Create knowledge_base directory if it doesn't exist
        kb_dir = os.path.dirname(config.INDEX_FILE)
        if not os.path.exists(kb_dir):
            os.makedirs(kb_dir)
        
        # Save document chunks
        with open(config.INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(chunks)} chunks to {config.INDEX_FILE}")
        
        # Save embeddings
        embeddings_data = {
            'model': config.EMBEDDING_MODEL,
            'embeddings': embeddings
        }
        with open(config.EMBEDDINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(embeddings_data, f, indent=2)
        print(f"Saved embeddings to {config.EMBEDDINGS_FILE}")
    
    def index_documents(self):
        """Main indexing pipeline"""
        print("=" * 50)
        print("Starting Document Indexing Process")
        print("=" * 50)
        
        # Step 1: Read documents
        documents = self.read_documents(config.DOCUMENTS_DIR)
        if not documents:
            print(f"\nNo documents found in {config.DOCUMENTS_DIR}")
            print("Please add .txt or .md files to the directory and run again.")
            return
        
        # Step 2: Create chunks
        chunks = self.create_chunks(documents)
        
        # Step 3: Generate embeddings
        embeddings = self.generate_embeddings(chunks)
        
        # Step 4: Save to JSON
        self.save_index(chunks, embeddings)
        
        print("=" * 50)
        print("Indexing Complete!")
        print("=" * 50)


if __name__ == "__main__":
    indexer = DocumentIndexer()
    indexer.index_documents()

