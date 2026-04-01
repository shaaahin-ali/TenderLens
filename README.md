# Tender Compliance Validator (Free & Offline Edition)

A tool to extract mandatory requirements from RFP documents and semantic-match them against vendor proposals.

> **Checkpoint 3 — Fully local, free, and offline processing.**
> - Reverted to keyword extraction (100% reliable, no API limits)
> - Added local semantic matching using `sentence-transformers` (Free AI)

---

## What it does right now

1. **Step 1:** Upload an RFP PDF. The system extracts logic-based mandatory requirements (lines with "must", "shall", etc.) and auto-assigns basic categories (Technical, Legal, etc.).
2. **Step 2:** Upload a vendor proposal PDF. The system uses a local AI embedding model (`all-MiniLM-L6-v2`) to perform semantic matching. It finds the closest match for each requirement even if paraphrased, and scores it as Met, Partial, or Missing.

Everything runs locally on your machine. **No API keys required.**

---

## Setup

**1. Install Python dependencies**
```bash
pip install -r requirements.txt
```

**2. Run the server**
```bash
uvicorn app:app --reload
```

**3. Open in browser**
```
http://localhost:8000
```
*(Note: The first time you validate a proposal, it will take 10-15 seconds to download the 90MB local AI model. After that, it's instant and offline).*

---

## How to test it

Create two text files and save them as PDFs:

**Sample RFP:**
"The vendor must provide 24/7 technical support."

**Sample Proposal:**
"Our helpdesk is operational round the clock."

Because the matcher uses semantic embeddings instead of simple text search, it will successfully link "24/7" with "round the clock" and mark it as **Met**.

---

## Project structure

```
tender-validator/
├── app.py          <- FastAPI server
├── extractor.py    <- Keyword-based requirement extraction (Free, Offline)
├── matcher.py      <- Semantic matching using sentence-transformers (Free, Offline)
├── utils.py        <- PDF reading
├── data/           <- Uploaded PDFs go here (git ignored)
├── static/
|   └── index.html  <- Simple 2-step web UI
└── requirements.txt
```
