import os
import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from extractor import extract_requirements
from insights import (
    build_category_breakdown,
    build_critical_failure,
    build_top_issues,
    overall_compliance_score,
)
from matcher import match_requirements
from reporter import generate_csv, generate_pdf
from utils import extract_text_from_pdf

BASE_DIR = Path(__file__).parent
VALIDATION_MODES = {"strict", "lenient"}

# CORS origins configuration
DEFAULT_ORIGINS = ["*"]
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else DEFAULT_ORIGINS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

(BASE_DIR / "data").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

current_requirements = []
last_validation: dict = {}


@app.get("/")
def index():
    return FileResponse(str(BASE_DIR / "static" / "index.html"))


@app.post("/upload-rfp")
async def upload_rfp(file: UploadFile = File(...)):
    global current_requirements

    save_path = BASE_DIR / "data" / "rfp.pdf"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        text = extract_text_from_pdf(str(save_path))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc

    if not text.strip():
        raise HTTPException(status_code=400, detail="PDF is empty or image-only.")

    current_requirements = extract_requirements(text)
    return {"total": len(current_requirements), "requirements": current_requirements}


@app.post("/validate")
async def validate_proposal(
    file: UploadFile = File(...),
    mode: str = Form("lenient"),
):
    global current_requirements, last_validation

    if not current_requirements:
        raise HTTPException(status_code=400, detail="No requirements loaded. Please upload an RFP first.")

    mode_key = mode.lower()
    if mode_key not in VALIDATION_MODES:
        raise HTTPException(status_code=400, detail="Validation mode must be either 'strict' or 'lenient'.")

    save_path = BASE_DIR / "data" / "proposal.pdf"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        proposal_text = extract_text_from_pdf(str(save_path))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc

    if not proposal_text.strip():
        raise HTTPException(status_code=400, detail="Proposal PDF is empty.")

    try:
        results = match_requirements(current_requirements, proposal_text, mode=mode_key)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Validation engine failed: {exc}",
        ) from exc

    met = sum(1 for result in results if result["verdict"] == "MET")
    partial = sum(1 for result in results if result["verdict"] == "PARTIAL")
    not_met = sum(1 for result in results if result["verdict"] == "NOT_MET")
    weak_language = sum(1 for result in results if result.get("is_vague"))
    with_conditions = sum(1 for result in results if result.get("has_conditions"))

    disqualifying_failures = [
        {"id": result["id"], "requirement": result["requirement"], "verdict": result["verdict"]}
        for result in results
        if result.get("risk_level") == "DISQUALIFYING"
        and result["verdict"] in ("NOT_MET", "PARTIAL")
    ]
    overall_status = "DISQUALIFIED" if disqualifying_failures else "PASSED"

    critical_failure = build_critical_failure(disqualifying_failures)
    category_breakdown = build_category_breakdown(results)
    top_issues = build_top_issues(results, category_breakdown, critical_failure)
    overall_score = overall_compliance_score(results)

    payload = {
        "status": "ok",
        "mode": mode_key,
        "overall_status": overall_status,
        "overall_score": overall_score,
        "critical_failure": critical_failure,
        "disqualifying_failures": disqualifying_failures,
        "category_breakdown": category_breakdown,
        "top_issues": top_issues,
        "summary": {
            "total": len(results),
            "met": met,
            "partial": partial,
            "not_met": not_met,
            "met_but_vague": weak_language,
            "with_conditions": with_conditions,
        },
        "results": results,
    }
    last_validation = payload
    return payload


@app.get("/download-csv")
def download_csv():
    if not last_validation:
        raise HTTPException(status_code=400, detail="No validation run yet. Please validate a proposal first.")

    csv_bytes = generate_csv(
        results=last_validation["results"],
        summary=last_validation["summary"],
        overall_status=last_validation["overall_status"],
        mode=last_validation["mode"],
        overall_score=last_validation["overall_score"],
        critical_failure=last_validation["critical_failure"],
        category_breakdown=last_validation["category_breakdown"],
        top_issues=last_validation["top_issues"],
    )
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=compliance_report.csv"},
    )


@app.get("/download-pdf")
def download_pdf():
    if not last_validation:
        raise HTTPException(status_code=400, detail="No validation run yet. Please validate a proposal first.")

    pdf_bytes = generate_pdf(
        results=last_validation["results"],
        summary=last_validation["summary"],
        overall_status=last_validation["overall_status"],
        disqualifying_failures=last_validation["disqualifying_failures"],
        mode=last_validation["mode"],
        overall_score=last_validation["overall_score"],
        critical_failure=last_validation["critical_failure"],
        category_breakdown=last_validation["category_breakdown"],
        top_issues=last_validation["top_issues"],
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=compliance_report.pdf"},
    )
