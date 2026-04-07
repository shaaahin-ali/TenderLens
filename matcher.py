"""
matcher.py - Semantic Requirement Matcher

Matches each extracted RFP requirement against the best-fitting sentence
in the vendor proposal using cosine similarity on sentence embeddings.

Post-match, additional explainability checks run on the matched excerpt:
  - hedge.py      -> detects vague commitment language
  - conditions.py -> surfaces limiting clauses
  - commitment    -> checks for explicit commitment wording
"""

import re

from embeddings import encode_texts, compute_similarity
from conditions import extract_conditions
from hedge import detect_vagueness

MODE_CONFIG = {
    "lenient": {
        "met_threshold": 0.75,
        "partial_threshold": 0.50,
        "qualified_met_verdict": "PARTIAL",
    },
    "strict": {
        "met_threshold": 0.80,
        "partial_threshold": 0.60,
        "qualified_met_verdict": "NOT_MET",
    },
}

VAGUE_PENALTY = 25
CONDITION_PENALTY = 10
COMMITMENT_PENALTY = 15

COMMITMENT_PATTERNS = [
    r"\bshall\b",
    r"\bmust\b",
    r"\bwill\b",
    r"\bguarante(?:e|es|ed)\b",
    r"\bcommit(?:s|ted)?\s+to\b",
    r"\bundertak(?:e|es|ing)\s+to\b",
    r"\bagree(?:s|d)?\s+to\b",
    r"\bensure(?:s|d)?\b",
    r"\bcertif(?:y|ies|ied)\b",
    r"\bprovide(?:s|d)?\b",
    r"\bdeliver(?:s|ed)?\b",
    r"\bmaintain(?:s|ed)?\b",
]

_COMPILED_COMMITMENT_PATTERNS = [
    re.compile(pattern, re.IGNORECASE) for pattern in COMMITMENT_PATTERNS
]


def split_into_sentences(text: str) -> list[str]:
    blocks = []
    raw_parts = text.replace(".\n", ". ").split("\n\n")

    for part in raw_parts:
        part = part.strip()
        if len(part) > 20:
            sentences = part.split(". ")
            blocks.extend([f"{s.strip()}." for s in sentences if len(s.strip()) > 15])

    return blocks


def _compliance_score(
    semantic_pct: int,
    is_vague: bool,
    has_conditions: bool,
    explicit_commitment_found: bool,
) -> int:
    score = semantic_pct
    if is_vague:
        score -= VAGUE_PENALTY
    if has_conditions:
        score -= CONDITION_PENALTY
    if not explicit_commitment_found:
        score -= COMMITMENT_PENALTY
    return max(0, score)


def _detect_commitment_language(matched_text: str) -> dict:
    if not matched_text:
        return {"explicit_commitment_found": False, "commitment_phrases_found": []}

    found = []
    seen = set()

    for pattern in _COMPILED_COMMITMENT_PATTERNS:
        for match in pattern.finditer(matched_text):
            phrase = match.group(0).strip()
            key = phrase.lower()
            if key not in seen:
                found.append(phrase)
                seen.add(key)

    return {
        "explicit_commitment_found": len(found) > 0,
        "commitment_phrases_found": found,
    }


def _why_this_matters(req: dict) -> str:
    risk_level = req.get("risk_level", "STANDARD")
    category = req.get("category", "General")

    if risk_level == "DISQUALIFYING":
        return (
            "This is a mandatory eligibility or legal requirement. Weak or missing evidence can justify "
            "immediate disqualification."
        )

    if risk_level == "HIGH_RISK":
        return (
            "This item carries significant contractual or operational risk and usually needs written clarification "
            "before award."
        )

    category_messages = {
        "Environmental": "Weak environmental wording can reduce sustainability marks and create audit risk.",
        "Financial Terms": "Unclear commercial terms can lead to pricing disputes and downstream financial risk.",
        "Technical Specifications": "Technical ambiguity can create delivery, integration, and service-level risk.",
        "Operational": "Operational ambiguity can weaken accountability for delivery and timelines.",
        "Legal Compliance": "Legal compliance needs explicit evidence so reviewers can defend the decision.",
    }

    return category_messages.get(
        category,
        "Reviewers need explicit evidence here so the verdict is defensible during procurement review.",
    )


def _build_reasons(
    semantic_pct: int,
    base_verdict: str,
    final_verdict: str,
    mode: str,
    has_excerpt: bool,
    hedge_result: dict,
    condition_result: dict,
    commitment_result: dict,
) -> list[str]:
    reasons = [f"Semantic similarity: {semantic_pct}%"]

    if base_verdict == "NOT_MET":
        reasons.append("No sufficiently close match was found in the proposal")
    elif base_verdict == "PARTIAL":
        reasons.append("The proposal only partially overlaps with this requirement")

    if has_excerpt and not commitment_result["explicit_commitment_found"]:
        reasons.append("Missing explicit commitment language (for example: shall, must, will, guarantee)")

    if hedge_result["is_vague"]:
        phrases = ", ".join(hedge_result["hedge_phrases_found"][:3])
        reasons.append(f"Contains weaker phrasing: {phrases}")

    if condition_result["has_conditions"]:
        clauses = "; ".join(condition_result["conditions_found"][:2])
        reasons.append(f"Contains limiting conditions: {clauses}")

    if final_verdict != base_verdict:
        if mode == "strict":
            reasons.append("Strict mode downgraded qualified language to Not Met")
        else:
            reasons.append("Lenient mode downgraded qualified language to Partial")

    return reasons


def match_requirements(requirements: list[dict], proposal_text: str, mode: str = "lenient") -> list[dict]:
    mode_key = (mode or "lenient").lower()
    config = MODE_CONFIG.get(mode_key, MODE_CONFIG["lenient"])
    proposal_chunks = split_into_sentences(proposal_text)

    if not proposal_chunks:
        return []

    # Encode the entire proposal text (will be chunked by BATCH_SIZE inside encode_texts)
    chunk_embeddings = encode_texts(proposal_chunks)
    
    # Pre-encode all requirement texts at once to avoid n-factor API latency
    req_texts = [req["requirement"] for req in requirements]
    all_req_embeddings = encode_texts(req_texts)
    
    results = []

    for idx, req in enumerate(requirements):
        req_emb = all_req_embeddings[idx]
        cosine_scores = compute_similarity(req_emb, chunk_embeddings)

        best_idx = cosine_scores.argmax().item()
        best_score = float(cosine_scores[best_idx])
        best_chunk = proposal_chunks[best_idx]

        if best_score >= config["met_threshold"]:
            base_verdict = "MET"
        elif best_score >= config["partial_threshold"]:
            base_verdict = "PARTIAL"
        else:
            base_verdict = "NOT_MET"

        excerpt = best_chunk if base_verdict != "NOT_MET" else ""
        hedge_result = detect_vagueness(excerpt)
        condition_result = extract_conditions(excerpt)
        commitment_result = _detect_commitment_language(excerpt)

        weak_commitment = (
            bool(excerpt)
            and (
                hedge_result["is_vague"]
                or condition_result["has_conditions"]
                or not commitment_result["explicit_commitment_found"]
            )
        )

        verdict = base_verdict
        if base_verdict == "MET" and weak_commitment:
            verdict = config["qualified_met_verdict"]

        semantic_pct = int(best_score * 100)
        compliance_pct = _compliance_score(
            semantic_pct,
            hedge_result["is_vague"],
            condition_result["has_conditions"],
            commitment_result["explicit_commitment_found"],
        )

        results.append({
            **req,
            "verdict": verdict,
            "base_verdict": base_verdict,
            "semantic_similarity": semantic_pct,
            "compliance_score": compliance_pct,
            "best_match_excerpt": excerpt,
            "is_vague": hedge_result["is_vague"],
            "hedge_phrases_found": hedge_result["hedge_phrases_found"],
            "has_conditions": condition_result["has_conditions"],
            "conditions_found": condition_result["conditions_found"],
            "explicit_commitment_found": commitment_result["explicit_commitment_found"],
            "commitment_phrases_found": commitment_result["commitment_phrases_found"],
            "weak_commitment": weak_commitment,
            "verdict_reasons": _build_reasons(
                semantic_pct=semantic_pct,
                base_verdict=base_verdict,
                final_verdict=verdict,
                mode=mode_key,
                has_excerpt=bool(excerpt),
                hedge_result=hedge_result,
                condition_result=condition_result,
                commitment_result=commitment_result,
            ),
            "why_this_matters": _why_this_matters(req),
        })

    return results
