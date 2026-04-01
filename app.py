# app.py
# Checkpoint 3 / Free Version.
# Uses offline keyword extraction and local offline semantic matching.

import os
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from utils import extract_text_from_pdf
from extractor import extract_requirements
from matcher import match_requirements

# BASE_DIR is the folder where app.py lives.
BASE_DIR = Path(__file__).parent

app = FastAPI()

# Make sure the data folder exists
(BASE_DIR / "data").mkdir(exist_ok=True)

# Serve the frontend from the static/ folder
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Global state to store extracted requirements for the validation step
# (In production, this would go in a real database, but memory works for a demo)
current_requirements = []


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
    global current_requirements
    
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
    current_requirements = requirements

    return {
        "total": len(requirements),
        "requirements": requirements
    }


@app.post("/validate")
async def validate_proposal(file: UploadFile = File(...)):
    """
    Accepts the vendor proposal PDF.
    Runs the offline semantic matcher against the requirements we saved from step 1.
    """
    global current_requirements

    if not current_requirements:
        raise HTTPException(
            status_code=400,
            detail="No requirements loaded. Please upload an RFP first."
        )

    save_path = BASE_DIR / "data" / "proposal.pdf"
    
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        proposal_text = extract_text_from_pdf(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not proposal_text.strip():
        raise HTTPException(status_code=400, detail="Proposal PDF is empty.")

    # Match meaning locally with sentence-transformers
    results = match_requirements(current_requirements, proposal_text)

    # Calculate summary stats for the UI
    met = sum(1 for r in results if r["verdict"] == "MET")
    partial = sum(1 for r in results if r["verdict"] == "PARTIAL")
    not_met = sum(1 for r in results if r["verdict"] == "NOT_MET")

    return {
        "status": "ok",
        "summary": {
            "total": len(results),
            "met": met,
            "partial": partial,
            "not_met": not_met
        },
        "results": results
    }