from collections import defaultdict

VERDICT_WEIGHTS = {
    "MET": 1.0,
    "MET_BUT_VAGUE": 0.75,
    "PARTIAL": 0.50,
    "NOT_MET": 0.0,
}

RISK_PRIORITY = {
    "DISQUALIFYING": 0,
    "HIGH_RISK": 1,
    "STANDARD": 2,
}

SHORT_LABEL_KEYWORDS = [
    ("non-disclosure", "NDA"),
    ("nda", "NDA"),
    ("insurance", "Insurance"),
    ("gdpr", "GDPR"),
    ("data protection", "Data Protection"),
    ("anti-bribery", "Anti-Bribery"),
    ("anti-corruption", "Anti-Corruption"),
    ("license", "Licensing"),
    ("licen", "Licensing"),
    ("certif", "Certification"),
    ("permit", "Permits"),
    ("security clearance", "Security Clearance"),
    ("liability", "Liability"),
    ("fees", "Fees"),
    ("fee", "Fees"),
    ("pricing", "Pricing"),
    ("price", "Pricing"),
    ("payment", "Payment Terms"),
    ("invoice", "Invoicing"),
    ("eco", "Environmental"),
    ("sustain", "Environmental"),
    ("carbon", "Environmental"),
    ("green", "Environmental"),
    ("sla", "SLA"),
    ("uptime", "Uptime"),
    ("availability", "Availability"),
]


def overall_compliance_score(results: list[dict]) -> int:
    if not results:
        return 0

    total = sum(VERDICT_WEIGHTS.get(r.get("verdict", "NOT_MET"), 0.0) for r in results)
    return int(round((total / len(results)) * 100))


def short_requirement_label(requirement: str) -> str:
    text_lower = requirement.lower()

    for keyword, label in SHORT_LABEL_KEYWORDS:
        if keyword in text_lower:
            return label

    compact = " ".join(requirement.split())
    if len(compact) <= 36:
        return compact
    return compact[:33].rstrip() + "..."


def build_critical_failure(disqualifying_failures: list[dict]) -> dict | None:
    if not disqualifying_failures:
        return None

    labels = []
    seen = set()

    for failure in disqualifying_failures:
        label = short_requirement_label(failure.get("requirement", ""))
        label_key = label.lower()
        if label_key not in seen:
            labels.append(label)
            seen.add(label_key)

    label_text = ", ".join(labels[:3]) if labels else "mandatory legal requirements"

    return {
        "title": "CRITICAL FAILURE",
        "message": (
            f"Vendor failed mandatory legal requirements ({label_text}). "
            "Immediate disqualification recommended."
        ),
        "labels": labels,
        "count": len(disqualifying_failures),
    }


def build_category_breakdown(results: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)

    for result in results:
        grouped[result.get("category") or "General"].append(result)

    breakdown = []

    for category, items in grouped.items():
        score = int(round(
            sum(VERDICT_WEIGHTS.get(item.get("verdict", "NOT_MET"), 0.0) for item in items) / len(items) * 100
        ))

        breakdown.append({
            "category": category,
            "score": score,
            "total": len(items),
            "met": sum(1 for item in items if item.get("verdict") == "MET"),
            "partial": sum(1 for item in items if item.get("verdict") == "PARTIAL"),
            "not_met": sum(1 for item in items if item.get("verdict") == "NOT_MET"),
            "weak_commitments": sum(1 for item in items if item.get("weak_commitment")),
            "highest_risk": min(
                (RISK_PRIORITY.get(item.get("risk_level", "STANDARD"), 2) for item in items),
                default=2,
            ),
        })

    return sorted(
        breakdown,
        key=lambda item: (item["score"], item["highest_risk"], -item["total"], item["category"]),
    )


def _category_issue_title(category: str, items: list[dict]) -> str:
    category_titles = {
        "Legal Compliance": "Missing legal compliance",
        "Environmental": "Weak environmental commitment",
        "Financial Terms": "Unclear fee transparency",
        "Technical Specifications": "Technical commitments need clarification",
        "Operational": "Delivery commitments need clarification",
        "General": "Requirements need clarification",
    }

    if category in category_titles:
        return category_titles[category]

    if any(item.get("risk_level") == "DISQUALIFYING" for item in items):
        return f"{category} failures need urgent review"

    return f"{category} gaps need clarification"


def _issue_detail(items: list[dict]) -> str:
    labels = []
    seen = set()

    for item in items:
        label = short_requirement_label(item.get("requirement", ""))
        label_key = label.lower()
        if label_key not in seen:
            labels.append(label)
            seen.add(label_key)

    if not labels:
        return "Review the supporting requirements."

    return ", ".join(labels[:3])


def build_top_issues(
    results: list[dict],
    category_breakdown: list[dict],
    critical_failure: dict | None,
) -> list[dict]:
    issues = []
    seen_titles = set()

    if critical_failure:
        title = "Missing legal compliance"
        issues.append({
            "title": title,
            "detail": ", ".join(critical_failure.get("labels", [])[:3]) or critical_failure["message"],
            "severity": "critical",
        })
        seen_titles.add(title.lower())

    for category in category_breakdown:
        category_name = category["category"]
        category_items = [
            item for item in results
            if (item.get("category") or "General") == category_name
            and item.get("verdict") != "MET"
        ]

        if not category_items:
            continue

        title = _category_issue_title(category_name, category_items)
        if title.lower() in seen_titles:
            continue

        severity = "critical" if any(
            item.get("risk_level") == "DISQUALIFYING" for item in category_items
        ) else "moderate"

        issues.append({
            "title": title,
            "detail": _issue_detail(category_items),
            "severity": severity,
        })
        seen_titles.add(title.lower())

        if len(issues) == 3:
            break

    if len(issues) < 3:
        weak_items = [item for item in results if item.get("weak_commitment")]
        if weak_items and "vague commitments weaken coverage" not in seen_titles:
            issues.append({
                "title": "Vague commitments weaken coverage",
                "detail": _issue_detail(weak_items),
                "severity": "moderate",
            })

    return issues[:3]
