# extractor.py
# Checkpoint 2: replaced keyword scanning with GPT-4o-mini.
#
# The problem with the keyword approach from checkpoint 1:
# It flagged things like "must be submitted by Friday" as requirements.
# GPT understands context — it knows the difference between a deadline
# note and an actual compliance requirement.
#
# New flow:
#   1. Split the full PDF text into overlapping chunks (GPT has a token limit)
#   2. Send each chunk to GPT and ask it to find mandatory requirements
#   3. GPT returns structured JSON — each requirement has a category
#   4. We combine all chunks and remove duplicates

import json
from openai import OpenAI

client = OpenAI()  # automatically reads OPENAI_API_KEY from environment

# These are the categories we ask GPT to use
CATEGORIES = ["Technical", "Legal", "Financial", "Administrative", "Other"]


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 300) -> list:
    """
    Splits the full RFP text into overlapping chunks.

    Why overlapping? A requirement sentence might start near the end of one
    chunk and finish at the start of the next. The overlap makes sure GPT
    sees the full sentence in at least one chunk.

    chunk_size = 3000 chars is roughly 500 words — comfortable for GPT.
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks


def extract_from_chunk(chunk: str) -> list:
    """
    Sends one text chunk to GPT and asks it to return mandatory requirements as JSON.

    We use temperature=0.1 (almost no randomness) so the output is consistent
    and factual rather than creative.
    """
    prompt = f"""You are reading part of a Request for Proposal (RFP) document.

Find every MANDATORY requirement in the text below.
A mandatory requirement uses words like: shall, must, required, mandatory, is required to.

Return a JSON array. Each item must have:
- "requirement": the requirement as a clear standalone sentence
- "category": one of {CATEGORIES}
- "keyword": the mandatory word you spotted (e.g. "must")

If there are no mandatory requirements in this section, return an empty array: []

TEXT:
{chunk}

Return ONLY the JSON array. No explanation, no extra text."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You extract requirements from procurement documents. Output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )

        raw = response.choices[0].message.content.strip()

        # GPT sometimes wraps the JSON in markdown code fences — strip those
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw)

    except Exception as e:
        print(f"[extractor] Error on chunk: {e}")
        return []


def deduplicate(requirements: list) -> list:
    """
    Removes exact duplicate requirement strings.
    Because we use overlapping chunks, the same sentence can appear twice.
    """
    seen = set()
    unique = []

    for req in requirements:
        text = req.get("requirement", "").strip().lower()
        if text and text not in seen:
            seen.add(text)
            unique.append(req)

    return unique


def extract_requirements(text: str) -> list:
    """
    Main function — called from app.py.
    Takes the full PDF text, returns a clean list of requirement dicts.

    Each dict looks like:
    {
        "id": 1,
        "requirement": "The vendor must hold valid public liability insurance.",
        "category": "Legal",
        "keyword": "must"
    }
    """
    print(f"[extractor] Text length: {len(text)} chars")

    chunks = chunk_text(text)
    print(f"[extractor] Split into {len(chunks)} chunks")

    all_requirements = []

    for i, chunk in enumerate(chunks):
        print(f"[extractor] Processing chunk {i + 1} of {len(chunks)}...")
        results = extract_from_chunk(chunk)
        all_requirements.extend(results)

    print(f"[extractor] {len(all_requirements)} requirements before dedup")

    cleaned = deduplicate(all_requirements)

    # Add a simple numeric ID to each requirement
    for i, req in enumerate(cleaned):
        req["id"] = i + 1

    print(f"[extractor] {len(cleaned)} unique requirements returned")
    return cleaned