# Tender Compliance Validator

A tool to extract mandatory requirements from RFP (Request for Proposal) documents.

> This is Checkpoint 1 — basic PDF upload and keyword extraction.
> More features (AI extraction, semantic matching) are coming next.

---

## What it does right now

- Accepts a PDF upload through a simple web interface
- Reads all the text from the PDF
- Scans for lines that contain mandatory keywords: `must`, `shall`, `required`, `mandatory`
- Displays those lines in a table so you can see all requirements at a glance

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

---

## How to test it

Upload any PDF that contains sentences with words like "must" or "shall".
A government tender document works great, but even a Word doc exported to PDF will do.

---

## Project structure

```
tender-validator/
├── app.py          ← FastAPI server
├── extractor.py    ← Keyword-based requirement extraction
├── matcher.py      ← Placeholder for future semantic matching
├── utils.py        ← PDF reading
├── data/           ← Uploaded PDFs go here
├── static/
│   └── index.html  ← Simple web UI
└── requirements.txt
```

---

## What's next

- **Checkpoint 2:** Replace keyword extraction with GPT — so it understands context and categories requirements (Technical, Legal, Financial, etc.)
- **Checkpoint 3:** Add proposal upload and basic text matching
- **Checkpoint 4:** Add semantic matching using embeddings (so paraphrased requirements still match)
- **Checkpoint 5:** Polish the UI and add confidence scores
