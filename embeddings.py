"""
embeddings.py - HuggingFace Inference API Client for Embeddings

Uses HuggingFace Inference API with fallback to local model.
Get your free API key at: https://huggingface.co/settings/tokens
"""

import os
import time
import numpy as np
import httpx
from typing import List

# HuggingFace Router API endpoint (api-inference is deprecated)
HF_API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
HF_API_KEY = os.getenv("HF_API_KEY")

# Fallback to local model if API fails (default FALSE for production to save RAM)
USE_LOCAL_FALLBACK = os.getenv("USE_LOCAL_EMBEDDINGS", "false").lower() == "true"

# Lazy load local model
_local_model = None


def _get_local_model():
    """Lazy load the sentence transformer model (fallback) if installed."""
    global _local_model
    if _local_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _local_model = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError:
            raise RuntimeError(
                "sentence-transformers is not installed. "
                "Install it with `pip install sentence-transformers` "
                "or use HuggingFace API by setting HF_API_KEY environment variable."
            )
    return _local_model


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between two arrays."""
    a_norm = a / np.linalg.norm(a, axis=1, keepdims=True)
    b_norm = b / np.linalg.norm(b, axis=1, keepdims=True)
    return np.dot(a_norm, b_norm.T)


def _get_embeddings_api(texts: List[str]) -> np.ndarray:
    """Get embeddings from HuggingFace Inference API with retries."""
    if not HF_API_KEY:
        raise RuntimeError(
            "HF_API_KEY missing. "
            "Set HF_API_KEY in your .env file or enable USE_LOCAL_EMBEDDINGS=true."
        )
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"inputs": texts}
    
    # Retry logic for 503 and transient errors
    for attempt in range(3):
        try:
            response = httpx.post(
                HF_API_URL,
                headers=headers,
                json=payload,
                timeout=60.0  # Increased timeout for Render/Vercel
            )
            response.raise_for_status()
            embeddings = response.json()
            
            # Hugging Face sometimes returns a dict with 'error' if model is loading
            if isinstance(embeddings, dict) and "error" in embeddings:
                error_msg = embeddings["error"]
                if "is currently loading" in error_msg.lower():
                    if attempt < 2:
                        # Wait for model to load
                        wait_time = embeddings.get("estimated_time", 20)
                        print(f"HF Model loading, waiting {wait_time}s...")
                        time.sleep(min(wait_time, 20))
                        continue
                raise RuntimeError(f"HF API returned error: {error_msg}")
                
            return np.array(embeddings)
            
        except httpx.HTTPError as e:
            if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 503:
                # Model loading on HF side, wait and retry
                if attempt < 2:
                    time.sleep(5)
                    continue
            raise RuntimeError(f"HF API error: {e}")
            
        except Exception as e:
            if attempt == 2:
                raise RuntimeError(f"Failed after retries: {str(e)}")
            time.sleep(3)
    
    raise RuntimeError("All retries exhausted")


def _get_embeddings_local(texts: List[str]) -> np.ndarray:
    """Get embeddings using local sentence-transformers model."""
    model = _get_local_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings


def encode_texts(texts: List[str]) -> np.ndarray:
    """
    Get embeddings for a list of texts.
    
    Priority:
    1. Try HuggingFace API first (if HF_API_KEY is set)
    2. Fall back to local model if API fails
    3. Use local model directly if USE_LOCAL_EMBEDDINGS=true
    """
    if not texts:
        return np.array([])
    
    # Default behavior for Production: Use HF API
    if HF_API_KEY:
        try:
            return _get_embeddings_api(texts)
        except Exception as e:
            if USE_LOCAL_FALLBACK:
                print(f"API failed, using local fallback: {e}")
                return _get_embeddings_local(texts)
            raise e
    
    # Fallback for Local Development if no HF API Key
    if USE_LOCAL_FALLBACK or not HF_API_KEY:
        print("Warning: Using local model because HF_API_KEY is not set. This takes more RAM.")
        return _get_embeddings_local(texts)
    
    raise RuntimeError("No embedding method configured")


def compute_similarity(query_embedding: np.ndarray, corpus_embeddings: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between query and corpus embeddings."""
    if query_embedding.ndim == 1:
        query_embedding = query_embedding.reshape(1, -1)
    
    similarities = _cosine_similarity(query_embedding, corpus_embeddings)[0]
    return similarities
