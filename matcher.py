"""
matcher.py — Semantic Requirement Matcher

Matches each extracted RFP requirement against the best-fitting sentence
in the vendor proposal using cosine similarity on sentence embeddings.

Post-match, two additional classifiers run on the matched excerpt:
  - hedge.py      → detects vague commitment language → MET_BUT_VAGUE
  - conditions.py → detects conditional qualifiers → surfaces restriction clauses

Score model:
  semantic_similarity — raw cosine score (0–100). Answers: "Is this topic covered?"
  compliance_score    — penalised score (0–100). Answers: "How confident are we
                        the requirement is truly fulfilled?" Deducted for vagueness
                        (-25) and conditional restrictions (-10).
"""

from sentence_transformers import SentenceTransformer, util
from hedge import detect_vagueness
from conditions import extract_conditions

model = SentenceTransformer("all-MiniLM-L6-v2")

# ── Verdict thresholds (calibrated) ──────────────────────────────────────────
# 0.75+ → topic is clearly, directly addressed in the proposal           → MET
# 0.50+ → topic is related but paraphrased / partially addressed         → PARTIAL
# <0.50 → no substantive match found                                     → NOT_MET
MET_THRESHOLD     = 0.75
PARTIAL_THRESHOLD = 0.50

# ── Compliance score penalties ────────────────────────────────────────────────
VAGUE_PENALTY      = 25   # "best efforts", "where possible", etc.
CONDITION_PENALTY  = 10   # "only for Tier 1", "subject to availability", etc.


def split_into_sentences(text: str) -> list[str]:
    blocks = []
    raw_parts = text.replace(".\n", ". ").split("\n\n")

    for part in raw_parts:
        part = part.strip()
        if len(part) > 20:
            sentences = part.split(". ")
            blocks.extend([s.strip() + "." for s in sentences if len(s.strip()) > 15])

    return blocks


def _compliance_score(semantic_pct: int, is_vague: bool, has_conditions: bool) -> int:
    """
    Derives a compliance certainty score from the raw semantic similarity.
    Penalises for vague/conditional language so the UI can show both numbers
    and the user understands WHY they differ.
    """
    score = semantic_pct
    if is_vague:
        score -= VAGUE_PENALTY
    if has_conditions:
        score -= CONDITION_PENALTY
    return max(0, score)


def match_requirements(requirements: list[dict], proposal_text: str) -> list[dict]:
    proposal_chunks = split_into_sentences(proposal_text)

    if not proposal_chunks:
        return []

    chunk_embeddings = model.encode(proposal_chunks, convert_to_tensor=True)
    results = []

    for req in requirements:
        req_emb = model.encode(req["requirement"], convert_to_tensor=True)
        cosine_scores = util.cos_sim(req_emb, chunk_embeddings)[0]

        best_idx   = cosine_scores.argmax().item()
        best_score = float(cosine_scores[best_idx])
        best_chunk = proposal_chunks[best_idx]

        # ── Base verdict from calibrated thresholds ──────────────────────────
        if best_score >= MET_THRESHOLD:
            verdict = "MET"
        elif best_score >= PARTIAL_THRESHOLD:
            verdict = "PARTIAL"
        else:
            verdict = "NOT_MET"

        # ── Post-match qualitative analysis ──────────────────────────────────
        excerpt = best_chunk if verdict != "NOT_MET" else ""
        hedge_result     = detect_vagueness(excerpt)
        condition_result = extract_conditions(excerpt)

        # Promote MET → MET_BUT_VAGUE only when hedge language is found
        if verdict == "MET" and hedge_result["is_vague"]:
            verdict = "MET_BUT_VAGUE"

        # ── Compute both scores ───────────────────────────────────────────────
        semantic_pct   = int(best_score * 100)
        compliance_pct = _compliance_score(
            semantic_pct,
            hedge_result["is_vague"],
            condition_result["has_conditions"],
        )

        results.append({
            **req,
            "verdict":             verdict,
            # Two distinct scores — clearly separated
            "semantic_similarity": semantic_pct,   # raw cosine % — "topic coverage"
            "compliance_score":    compliance_pct, # penalised %  — "actual compliance certainty"
            "best_match_excerpt":  excerpt,
            # Vagueness fields
            "is_vague":            hedge_result["is_vague"],
            "hedge_phrases_found": hedge_result["hedge_phrases_found"],
            # Condition fields
            "has_conditions":      condition_result["has_conditions"],
            "conditions_found":    condition_result["conditions_found"],
        })

    return results