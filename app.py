# app.py
# FastAPI backend — Checkpoint 1.
# Right now it does one thing: accept a PDF upload and return extracted requirements.

import os
import shutil
from pathlib import Path

# BASE_DIR is the folder where app.py lives.
# Using __file__ means paths work no matter where you run uvicorn from.
BASE_DIR = Path(__file__).parent

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from utils import extract_text_from_pdf
from extractor import extract_requirements

app = FastAPI()

# Make sure the data folder exists
(BASE_DIR / "data").mkdir(exist_ok=True)

# Serve the frontend from the static/ folder
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/")
def index():
    return FileResponse(str(BASE_DIR / "static" / "index.html"))


@app.post("/upload-rfp")
async def upload_rfp(file: UploadFile = File(...)):
    """
    Accepts a PDF upload.
    Extracts the text, runs keyword-based requirement detection,
    and returns the list of requirements as JSON.
    """
    save_path = BASE_DIR / "data" / "rfp.pdf"

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        text = extract_text_from_pdf(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="PDF is empty or image-only.")

    requirements = extract_requirements(text)

    return {
        "total": len(requirements),
        "requirements": requirements
    }