#!/bin/bash
# Start script for Render deployment

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Hugging Face Inference API is used for Embeddings to save RAM
# Make sure HF_API_KEY is set in your Render environment variables

# Start the FastAPI application with gunicorn
# Using uvicorn workers for async support
exec gunicorn app:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
