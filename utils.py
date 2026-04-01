# utils.py
# Reads a PDF file and returns the text from every page.

import pdfplumber


def extract_text_from_pdf(file_path: str) -> str:
    """Opens a PDF and returns all its text as one string."""
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)

    return "\n".join(pages)
