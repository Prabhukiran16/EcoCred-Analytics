from pathlib import Path

from pypdf import PdfReader


def extract_text_from_pdf(pdf_path: str) -> str:
    path = Path(pdf_path)
    if not path.exists() or path.suffix.lower() != ".pdf":
        return ""

    reader = PdfReader(str(path))
    chunks: list[str] = []

    for page in reader.pages:
        chunks.append(page.extract_text() or "")

    return "\n".join(chunks).strip()
