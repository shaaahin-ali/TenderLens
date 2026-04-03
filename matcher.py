"""
matcher.py — Semantic Requirement Matcher

Matches each extracted RFP requirement against the best-fitting sentence
in the vendor proposal using cosine similarity on sentence embeddings.

Post-match, two additional classifiers run on the matched excerpt:
  - hedge.py  → detects vague commitment language → MET_BUT_VAGUE
  - conditions.py → detects conditional qualifiers → surfaces restriction clauses
"""

from sentence_transformers import SentenceTransformer, util
from hedge import detect_vagueness
from conditions import extract_conditions

model = SentenceTransformer("all-MiniLM-L6-v2")


def split_into_sentences(text: str) -> list[str]:
    blocks = []
    raw_parts = text.replace(".\n", ". ").split("\n\n")

    for part in raw_parts:
        part = part.strip()
        if len(part) > 20:
            sentences = part.split(". ")
            blocks.extend([s.strip() + "." for s in sentences if len(s.strip()) > 15])

    return blocks


def match_requirements(requirements: list[dict], proposal_text: str) -> list[dict]:
    proposal_chunks = split_into_sentences(proposal_text)

    if not proposal_chunks:
        return []

    chunk_embeddings = model.encode(proposal_chunks, convert_to_tensor=True)
    results = []

    for req in requirements:
        req_emb = model.encode(req["requirement"], convert_to_tensor=True)
        cosine_scores = util.cos_sim(req_emb, chunk_embeddings)[0]

        best_idx = cosine_scores.argmax().item()
        best_score = float(cosine_scores[best_idx])
        best_chunk = proposal_chunks[best_idx]

        # --- Base verdict from semantic similarity ---
        if best_score >= 0.65:
            verdict = "MET"
        elif best_score >= 0.40:
            verdict = "PARTIAL"
        else:
            verdict = "NOT_MET"

        # --- Post-match: Vagueness & Hedge Detection ---
        excerpt_for_analysis = best_chunk if verdict != "NOT_MET" else ""
        hedge_result = detect_vagueness(excerpt_for_analysis)
        condition_result = extract_conditions(excerpt_for_analysis)

        # Upgrade MET → MET_BUT_VAGUE if hedge phrases were found
        if verdict == "MET" and hedge_result["is_vague"]:
            verdict = "MET_BUT_VAGUE"

        results.append({
            **req,
            "verdict": verdict,
            "confidence": int(best_score * 100),
            "best_match_excerpt": excerpt_for_analysis,
            "similarity_score": round(best_score, 4),
            # Vagueness fields
            "is_vague": hedge_result["is_vague"],
            "hedge_phrases_found": hedge_result["hedge_phrases_found"],
            # Condition fields
            "has_conditions": condition_result["has_conditions"],
            "conditions_found": condition_result["conditions_found"],
        })

    return results