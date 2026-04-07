"""
embeddings.py - HuggingFace Inference API Client for Embeddings

Replaces local sentence-transformers with HuggingFace Inference API.
This eliminates the need to download and store large models (~400MB).

Get your free API key at: https://huggingface.co/settings/tokens
Free tier: 1,000 requests/month (sufficient for testing)
"""

import os
import numpy as np
import httpx
from typing import List

# HuggingFace Inference API endpoint for sentence-transformers
HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HF_API_KEY = os.getenv("HF_API_KEY", "")

# Fallback to local if no API key (for local development)
USE_LOCAL_FALLBACK = os.getenv("USE_LOCAL_EMBEDDINGS", "false").lower() == "true"


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between two arrays."""
    a_norm = a / np.linalg.norm(a, axis=1, keepdims=True)
    b_norm = b / np.linalg.norm(b, axis=1, keepdims=True)
    return np.dot(a_norm, b_norm.T)


def get_embeddings_api(texts: List[str]) -> np.ndarray:
    """
    Get embeddings from HuggingFace Inference API.
    
    Args:
        texts: List of strings to embed
        
    Returns:
        numpy array of shape (len(texts), 384) - the embedding dimension
    """
    if not HF_API_KEY:
        raise ValueError(
            "HF_API_KEY environment variable is not set. "
            "Get your free token at https://huggingface.co/settings/tokens"
        )
    
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    
    # HF API expects a dict with "inputs" key
    payload = {"inputs": texts}
    
    try:
        response = httpx.post(
            HF_API_URL,
            headers=headers,
            json=payload,
            timeout=30.0
        )
        response.raise_for_status()
        
        # Response is a list of embeddings
        embeddings = response.json()
        return np.array(embeddings)
        
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 503:
            # Model is loading on HF side
            raise RuntimeError(
                "HuggingFace model is loading. Wait 10-20 seconds and retry."
            )
        raise RuntimeError(f"HuggingFace API error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        raise RuntimeError(f"Failed to get embeddings: {str(e)}")


def get_embeddings_local(texts: List[str]) -> np.ndarray:
    """Fallback: Get embeddings using local sentence-transformers model."""
    from sentence_transformers import SentenceTransformer
    
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings


def encode_texts(texts: List[str]) -> np.ndarray:
    """
    Main entry point: Get embeddings for a list of texts.
    
    Priority:
    1. Use HuggingFace API if HF_API_KEY is set
    2. Use local model if USE_LOCAL_FALLBACK is true
    3. Raise error if neither available
    """
    if not texts:
        return np.array([])
    
    # Try API first if key is available
    if HF_API_KEY:
        try:
            return get_embeddings_api(texts)
        except Exception as e:
            if USE_LOCAL_FALLBACK:
                print(f"API failed, using local fallback: {e}")
                return get_embeddings_local(texts)
            raise
    
    # Use local model if configured
    if USE_LOCAL_FALLBACK:
        return get_embeddings_local(texts)
    
    raise ValueError(
        "No embedding method available. "
        "Set HF_API_KEY for HuggingFace API, or USE_LOCAL_EMBEDDINGS=true for local model."
    )


def compute_similarity(query_embedding: np.ndarray, corpus_embeddings: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between query and corpus embeddings.
    
    Args:
        query_embedding: Shape (embedding_dim,) or (1, embedding_dim)
        corpus_embeddings: Shape (n_docs, embedding_dim)
        
    Returns:
        Similarity scores: Shape (n_docs,)
    """
    if query_embedding.ndim == 1:
        query_embedding = query_embedding.reshape(1, -1)
    
    similarities = _cosine_similarity(query_embedding, corpus_embeddings)[0]
    return similarities
