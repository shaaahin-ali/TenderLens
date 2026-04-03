from risk import tag_risk_level

MANDATORY_KEYWORDS = ["must", "shall", "required", "mandatory", "is required to"]


def guess_category(text: str) -> str:
    text_lower = text.lower()

    # Legal checked first — overlapping terms (e.g. "compliance") belong here
    if any(word in text_lower for word in [
        "insurance", "nda", "non-disclosure", "regulation", "regulatory",
        "liability", "compliance", "law", "court", "legal", "statutory",
        "gdpr", "permit", "license", "certif", "accreditat", "indemnif",
        "anti-bribery", "anti-corruption", "data protection",
    ]):
        return "Legal Compliance"

    if any(word in text_lower for word in [
        "cost", "payment", "fees", "price", "pricing", "budget", "invoice",
        "financial", "revenue", "billing", "penalty", "penalties", "damages",
        "reimburs", "compensation",
    ]):
        return "Financial Terms"

    if any(word in text_lower for word in [
        "support", "system", "scalab", "scale", "scales", "scaling",
        "software", "api", "database", "uptime", "technical", "server",
        "infrastructure", "performance", "capacity", "users", "load",
        "concurrent", "availability", "sla", "service level", "integration",
        "deployment", "cloud", "network", "bandwidth", "latency", "response time",
        "backup", "recovery", "security", "encryption", "authentication",
    ]):
        return "Technical Specifications"

    if any(word in text_lower for word in [
        "eco", "energy", "environmental", "carbon", "sustainable", "emission",
        "green", "renewable", "recycl",
    ]):
        return "Environmental"

    # Explicit operational/delivery terms → Operational (prevents General fallback)
    if any(word in text_lower for word in [
        "deliver", "project", "timeline", "deadline", "milestone", "report",
        "document", "training", "staff", "personnel", "resource",
    ]):
        return "Operational"

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