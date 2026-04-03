"""
risk.py — Requirement Risk Tagger

Classifies each extracted requirement by the consequence of non-compliance.
Runs at extraction time (no proposal needed).

Risk levels (evaluated in priority order):
  DISQUALIFYING — failure means immediate bid rejection
  HIGH_RISK     — failure is a major legal/operational issue
  STANDARD      — everything else
"""

# Evaluated first — match any of these → DISQUALIFYING
DISQUALIFYING_KEYWORDS = [
    "insurance",
    "licen",        # license, licensed, licensing
    "certif",       # certificate, certification, certified
    "accreditat",   # accreditation, accredited
    "permit",
    "gdpr",
    "comply with",
    "in compliance with",
    "regulation",
    "statutory",
    "mandatory certification",
    "legal requirement",
    "law",
    "court",
    "criminal",
    "nda",
    "non-disclosure",
    "data protection act",
    "anti-bribery",
    "anti-corruption",
]

# Evaluated second — match any of these → HIGH_RISK
HIGH_RISK_KEYWORDS = [
    "sla",
    "service level",
    "uptime",
    "availability",
    "penalty",
    "penalties",
    "liquidated damages",
    "damages",
    "indemnif",     # indemnify, indemnification
    "warrant",      # warranty, warrant
    "ip ",
    " ip,",
    "intellectual property",
    "ownership",
    "data protection",
    "confidential",
    "proprietary",
    "security clearance",
    "background check",
    "escrow",
    "audit rights",
    "liability",
    "termination",
    "breach",
]


def tag_risk_level(requirement_text: str, category: str) -> str:
    """
    Returns "DISQUALIFYING", "HIGH_RISK", or "STANDARD".
    Evaluated in priority order — DISQUALIFYING takes precedence.

    Args:
        requirement_text: The raw requirement sentence.
        category: The category already assigned by extractor.py (used as a
                  tiebreaker for Legal Compliance → bumps to DISQUALIFYING).
    """
    text_lower = requirement_text.lower()

    # Priority 1 — check DISQUALIFYING keywords
    for kw in DISQUALIFYING_KEYWORDS:
        if kw in text_lower:
            return "DISQUALIFYING"

    # Legal Compliance category is a strong signal even without keyword match
    if category == "Legal Compliance":
        return "DISQUALIFYING"

    # Priority 2 — check HIGH_RISK keywords
    for kw in HIGH_RISK_KEYWORDS:
        if kw in text_lower:
            return "HIGH_RISK"

    return "STANDARD"
