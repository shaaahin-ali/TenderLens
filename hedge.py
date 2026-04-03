"""
hedge.py — Vagueness & Hedge Phrase Detector

Runs AFTER semantic matching on the matched proposal excerpt.
If hedge phrases are found in a MET match → verdict becomes MET_BUT_VAGUE.

All detection is case-insensitive string search. No ML, no API, no cost.
"""

# Ordered from most to least specific to allow more precise reporting.
# Phrases with trailing space avoid partial-word matches (e.g., "may " won't
# hit "payment"). Checked case-insensitively so casing doesn't matter.
HEDGE_PHRASES = [
    # Commitment softeners
    "best efforts",
    "best endeavours",
    "best endeavors",
    "reasonable efforts",
    "commercially reasonable efforts",
    "commercially reasonable",
    "reasonable endeavours",
    "reasonable endeavors",

    # Aspiration language
    "we endeavor",
    "we endeavour",
    "we aim to",
    "we intend to",
    "we strive to",
    "we will endeavor",
    "we will endeavour",
    "we will try",

    # Conditionality / availability-based hedges
    "where possible",
    "as far as possible",
    "to the extent possible",
    "where applicable",
    "as applicable",
    "as appropriate",
    "as needed",
    "if required",
    "if necessary",
    "where necessary",
    "subject to availability",
    "subject to resource availability",
    "subject to",
    "as resources permit",
    "resources permitting",

    # Frequency/typicality hedges
    "generally",
    "typically",
    "normally",
    "in most cases",
    "in general",

    # Modal verb hedges — space-padded to avoid substring hits
    # e.g., " may " won't fire on "payment"
    " may ",
    " might ",
    " could ",
    "may be provided",
    "may be available",
    "may be subject to",
    "support will be available",

    # Vague promise language
    "as soon as practicable",
    "reasonable time",
    "reasonable notice",
    "reasonable basis",
    "on a best-effort basis",
    "on a best effort basis",
]


def detect_vagueness(matched_text: str) -> dict:
    """
    Scans matched proposal text for hedge phrases.

    Args:
        matched_text: The best-matching excerpt from the proposal.

    Returns:
        {
            "is_vague": bool,
            "hedge_phrases_found": list[str]   # de-duplicated, in order found
        }
    """
    if not matched_text:
        return {"is_vague": False, "hedge_phrases_found": []}

    text_lower = matched_text.lower()
    found = []

    for phrase in HEDGE_PHRASES:
        if phrase in text_lower and phrase.strip() not in found:
            found.append(phrase.strip())

    return {
        "is_vague": len(found) > 0,
        "hedge_phrases_found": found,
    }
