MANDATORY_KEYWORDS = ["must", "shall", "required", "mandatory", "is required to"]


def guess_category(text: str) -> str:
    text_lower = text.lower()

    if any(word in text_lower for word in ["insurance", "liability", "damages", "law", "compliance", "court"]):
        return "Legal Compliance"
    if any(word in text_lower for word in ["price", "cost", "budget", "financial", "payment", "invoice"]):
        return "Financial Terms"
    if any(word in text_lower for word in ["server", "software", "api", "database", "uptime", "support", "technical"]):
        return "Technical Specifications"
    if any(word in text_lower for word in ["deadline", "submit", "report", "manager", "admin"]):
        return "Administrative"

    return "General"


def extract_requirements(text: str) -> list[dict]:
    requirements = []
    seen = set()

    lines = text.split("\n")

    for line in lines:
        line = line.strip()

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

    for i, req in enumerate(requirements):
        req["id"] = i + 1

    return requirements