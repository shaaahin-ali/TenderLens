"""
conditions.py — Conditional Compliance Extractor

Runs AFTER semantic matching on the matched proposal excerpt.
Detects conditional qualifiers that restrict when/where a requirement is met.
Surfaces the specific conditional clause so reviewers can assess the restriction.

Uses Python stdlib `re` only. No cost, no API, no new packages.
"""

import re

# Each pattern targets a common conditional structure.
# Using IGNORECASE throughout.
# Patterns are ordered from most specific to broadest.
CONDITION_PATTERNS = [
    # "only when/if/for/in X"
    r"only\s+(when|if|for|in)\s+[^.,;]{3,60}",

    # "provided that X"
    r"provided\s+that\s+[^.,;]{3,60}",

    # "subject to X"
    r"subject\s+to\s+[^.,;]{3,60}",

    # "except when/where/if X"
    r"except\s+(when|where|if)\s+[^.,;]{3,60}",

    # "in cases where X" / "in case where X"
    r"in\s+cases?\s+where\s+[^.,;]{3,60}",

    # "where applicable/required/relevant"
    r"where\s+(applicable|required|relevant|necessary)",

    # "limited to X"
    r"limited\s+to\s+[^.,;]{3,60}",

    # "for [specific] contracts/clients/tiers/jurisdictions"
    r"for\s+[^.,;]{1,40}\s+(contracts?|clients?|tiers?|jurisdictions?|regions?|countries?)",

    # "excluding X" / "excludes X"
    r"exclud(?:es?|ing)\s+[^.,;]{3,60}",

    # "contingent on/upon X"
    r"contingent\s+(?:on|upon)\s+[^.,;]{3,60}",

    # "unless X"
    r"unless\s+[^.,;]{3,60}",

    # "as long as X"
    r"as\s+long\s+as\s+[^.,;]{3,60}",

    # "on the condition that X"
    r"on\s+the\s+condition\s+that\s+[^.,;]{3,60}",
]

# Pre-compile all patterns for performance
_COMPILED_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in CONDITION_PATTERNS
]


def extract_conditions(matched_text: str) -> dict:
    """
    Scans matched proposal text for conditional qualifiers.

    Args:
        matched_text: The best-matching excerpt from the proposal.

    Returns:
        {
            "has_conditions": bool,
            "conditions_found": list[str]   # the matched clause snippets, de-duplicated
        }
    """
    if not matched_text:
        return {"has_conditions": False, "conditions_found": []}

    found = []
    seen_lower = set()

    for pattern in _COMPILED_PATTERNS:
        for match in pattern.finditer(matched_text):
            clause = match.group(0).strip()
            clause_lower = clause.lower()
            if clause_lower not in seen_lower:
                found.append(clause)
                seen_lower.add(clause_lower)

    return {
        "has_conditions": len(found) > 0,
        "conditions_found": found,
    }
