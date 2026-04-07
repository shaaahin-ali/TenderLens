# TenderLens

AI-powered tender compliance validator — because manually checking 100-page RFPs against vendor proposals is nobody's idea of fun.

## The Problem

Procurement teams spend 20-30 hours on every tender manually cross-referencing requirements with vendor submissions. It's repetitive, inconsistent, and someone always misses that critical compliance clause hidden on page 47. The result? Bad vendor picks, compliance gaps, and pulled all-nighters before deadlines.

## The Solution

TenderLens automates the grunt work. Upload an RFP PDF and a vendor proposal, get instant compliance scoring with semantic matching not just keyword hunting .

**Key features:**

- **Auto-extracts** mandatory requirements from RFPs (must, shall, required, etc.)
- **Semantic matching** using ML embeddings understands paraphrasing, not just exact keywords
- **Compliance scoring** — Met, Partial, Not Met with confidence percentages
- **Vagueness detection** — flags hedged language like "we aim to" or "ideally"
- **Report generation** — clean PDF/CSV exports for stakeholders
- **Lenient vs Strict modes** — adjust scoring sensitivity based on procurement needs

## Tech Stack

**Backend:**

- Python 3.11+
- FastAPI (async API framework)
- Hugging Face Inference API (for zero-memory embeddings)
  - *Optional constraint local fallbacks with sentence-transformers*
- pdfplumber (PDF text extraction)
- ReportLab (PDF report generation)
- NumPy (similarity computations)

**Frontend:**

- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icons)

**Deployment:**

- Backend: Render (Gunicorn + Uvicorn workers)
- Frontend: Vercel

## Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/shaaahin-ali/TenderLens.git
cd TenderLens
```

### 2. Backend setup

```bash
# Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start dev server
uvicorn app:app --reload
```

Backend runs at `http://127.0.0.1:8000`

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### 4. Environment variables

Backend (`.env` in root):

```
CORS_ORIGINS=http://localhost:3000
HF_API_KEY=your_huggingface_key_here
```

Frontend (`frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## How to use

1. **Upload RFP** → Click "Extract Requirements"
2. **Upload Vendor Proposal** → Click "Validate Proposal"
3. **Review results** → Check compliance scores, download reports

> Uses Hugging Face Inference API to compute embeddings at lightning speed with zero RAM overhead.

## Project Structure

```
TenderLens/
├── app.py              # FastAPI main entry
├── matcher.py          # Semantic matching logic
├── embeddings.py       # Vector embedding handler
├── extractor.py        # RFP requirement extraction
├── conditions.py       # Conditional requirement parsing
├── hedge.py            # Vague language detection
├── insights.py         # Analytics & scoring
├── reporter.py         # PDF/CSV report generation
├── frontend/           # Next.js app
│   ├── app/
│   └── components/
└── requirements.txt
```

## Demo

Live: [https://tender-lens.vercel.app/]

Backend: [https://tenderlens-rhtk.onrender.com]

---

Built this after watching friends in procurement suffer through manual vendor checks. Figured AI could do it better.
