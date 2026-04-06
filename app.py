import shutil
from pathlib import Path
from report import generate_report
from fastapi.responses import FileResponse

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from utils import extract_text_from_pdf
from extractor import extract_requirements
from matcher import match_requirements
from reporter import generate_csv, generate_pdf

BASE_DIR = Path(__file__).parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

(BASE_DIR / "data").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

current_requirements = []
last_validation: dict = {}   # stores full /validate response for download endpoints


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
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="PDF is empty or image-only.")

    requirements = extract_requirements(text)
    current_requirements = requirements

    return {"total": len(requirements), "requirements": requirements}


@app.post("/validate")
async def validate_proposal(file: UploadFile = File(...)):
    global current_requirements, last_validation

    if not current_requirements:
        raise HTTPException(status_code=400, detail="No requirements loaded. Please upload an RFP first.")

    save_path = BASE_DIR / "data" / "proposal.pdf"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        proposal_text = extract_text_from_pdf(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not proposal_text.strip():
        raise HTTPException(status_code=400, detail="Proposal PDF is empty.")

    results = match_requirements(current_requirements, proposal_text)

    met             = sum(1 for r in results if r["verdict"] == "MET")
    partial         = sum(1 for r in results if r["verdict"] == "PARTIAL")
    not_met         = sum(1 for r in results if r["verdict"] == "NOT_MET")
    met_but_vague   = sum(1 for r in results if r["verdict"] == "MET_BUT_VAGUE")
    with_conditions = sum(1 for r in results if r.get("has_conditions"))

    # ── Disqualification check ────────────────────────────────────────────────
    # A vendor is disqualified when ANY requirement tagged DISQUALIFYING is
    # either completely absent (NOT_MET) or only partially addressed (PARTIAL).
    # PARTIAL is included because partial compliance on a legal/licensing
    # requirement still means the vendor cannot legally fulfil the contract.
    disqualifying_failures = [
        {"id": r["id"], "requirement": r["requirement"], "verdict": r["verdict"]}
        for r in results
        if r.get("risk_level") == "DISQUALIFYING"
        and r["verdict"] in ("NOT_MET", "PARTIAL")
    ]
    overall_status = "DISQUALIFIED" if disqualifying_failures else "PASSED"

    payload = {
        "status": "ok",
        "overall_status": overall_status,
        "disqualifying_failures": disqualifying_failures,
        "summary": {
            "total":           len(results),
            "met":             met,
            "partial":         partial,
            "not_met":         not_met,
            "met_but_vague":   met_but_vague,
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
        last_validation["results"],
        last_validation["summary"],
        last_validation["overall_status"],
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
        last_validation["results"],
        last_validation["summary"],
        last_validation["overall_status"],
        last_validation["disqualifying_failures"],
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=compliance_report.pdf"},
    )
@app.post("/generate-report")
def create_report():
    # Use your actual results here
    results = GLOBAL_RESULTS   # or however you're storing it
    
    file_path = "report.pdf"
    generate_report(results, file_path)
    
    return FileResponse(file_path, media_type='application/pdf', filename="report.pdf")