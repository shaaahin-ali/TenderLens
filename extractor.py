# extractor.py
# Scans text line by line and pulls out sentences that contain mandatory keywords.
# No AI yet — just keyword detection. Simple and easy to understand.

MANDATORY_KEYWORDS = ["must", "shall", "required", "mandatory", "is required to"]


def extract_requirements(text: str) -> list[dict]:
    """
    Goes through every line in the text.
    If a line contains a mandatory keyword, we treat it as a requirement.
    Returns a list of dicts with the requirement text and the keyword found.
    """
    requirements = []
    seen = set()

    lines = text.split("\n")

    for line in lines:
        line = line.strip()

        # skip very short lines — they are usually headings or page numbers
        if len(line) < 15:
            continue

        line_lower = line.lower()

        for keyword in MANDATORY_KEYWORDS:
            if keyword in line_lower and line not in seen:
                requirements.append({
                    "requirement": line,
                    "keyword": keyword
                })
                seen.add(line)
                break  # don't add the same line twice for two keywords

    return requirements