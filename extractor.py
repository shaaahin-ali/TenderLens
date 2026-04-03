from risk import tag_risk_level

MANDATORY_KEYWORDS = ["must", "shall", "required", "mandatory", "is required to"]


def guess_category(text: str) -> str:
    text_lower = text.lower()

    if any(word in text_lower for word in ["insurance", "nda", "regulation", "liability", "compliance", "law", "court"]):
        return "Legal Compliance"
    if any(word in text_lower for word in ["cost", "payment", "fees", "price", "budget", "invoice", "financial"]):
        return "Financial Terms"
    if any(word in text_lower for word in ["support", "system", "scalable", "software", "api", "database", "uptime", "technical"]):
        return "Technical Specifications"
    if any(word in text_lower for word in ["eco", "energy", "environmental", "carbon", "sustainable"]):
        return "Environmental"

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
                category = guess_category(line)
                requirements.append({
                    "requirement": line,
                    "keyword": keyword,
                    "category": category,
                    "risk_level": tag_risk_level(line, category),
                })
                seen.add(line)
                break

    for i, req in enumerate(requirements):
        req["id"] = i + 1

    return requirements