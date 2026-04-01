# extractor.py
# Reverted to keyword-based extraction as it's free, offline, and 100% reliable for a demo.
# Added basic rule-based categories so the UI looks complete without needing OpenAI.

MANDATORY_KEYWORDS = ["must", "shall", "required", "mandatory", "is required to"]

def guess_category(text: str) -> str:
    """Very simple rule-based categorization based on common RFP words."""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["insurance", "liability", "damages", "law", "compliance", "court"]):
        return "Legal"
    if any(word in text_lower for word in ["price", "cost", "budget", "financial", "payment", "invoice"]):
        return "Financial"
    if any(word in text_lower for word in ["server", "software", "api", "database", "uptime", "support", "technical"]):
        return "Technical"
    if any(word in text_lower for word in ["deadline", "submit", "report", "manager", "admin"]):
        return "Administrative"
        
    return "General"


def extract_requirements(text: str) -> list[dict]:
    """
    Goes through every line in the raw PDF text.
    If a line contains a mandatory keyword, it is flagged as a requirement.
    Uses basic word matching to guess the category.
    """
    requirements = []
    seen = set()

    lines = text.split("\n")

    for line in lines:
        line = line.strip()

        # skip very short lines (headings, page numbers, noise)
        if len(line) < 15:
            continue

        line_lower = line.lower()

        for keyword in MANDATORY_KEYWORDS:
            if keyword in line_lower and line not in seen:
                requirements.append({
                    "requirement": line,
                    "keyword": keyword,
                    "category": guess_category(line)
                })
                seen.add(line)
                break

    # Add IDs for the frontend table
    for i, req in enumerate(requirements):
        req["id"] = i + 1

    return requirements