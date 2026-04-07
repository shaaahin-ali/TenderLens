#!/bin/bash
# Start script for Render deployment

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Download sentence transformer model cache (optional - speeds up first request)
# python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Start the FastAPI application with gunicorn
# Using uvicorn workers for async support
exec gunicorn app:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
