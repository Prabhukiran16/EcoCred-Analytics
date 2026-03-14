import re
import tempfile
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import httpx


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

COMMON_ESG_PATHS = [
    "/sustainability",
    "/sustainability/reports",
    "/esg",
    "/esg-report",
    "/esg/reports",
    "/investors",
    "/investor-relations",
    "/responsibility",
    "/our-impact",
]

HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', flags=re.IGNORECASE)


def _clean_company_name(company: str) -> str:
    cleaned = re.sub(r"\b(inc|ltd|limited|corp|corporation|plc|llc|co)\b", "", company, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _extract_links(html: str, base_url: str) -> list[str]:
    links: list[str] = []
    for raw in HREF_RE.findall(html or ""):
        full = urljoin(base_url, raw.strip())
        if full.startswith("http://") or full.startswith("https://"):
            links.append(full)
    return links


def _is_same_domain(url_a: str, url_b: str) -> bool:
    a = urlparse(url_a).netloc.replace("www.", "").lower()
    b = urlparse(url_b).netloc.replace("www.", "").lower()
    return bool(a) and a == b


def _score_pdf_link(url: str) -> int:
    lower = url.lower()
    score = 0
    if lower.endswith(".pdf"):
        score += 50
    if "sustain" in lower:
        score += 20
    if "esg" in lower:
        score += 25
    if "annual" in lower:
        score += 10
    if "report" in lower:
        score += 15
    year_match = re.findall(r"20\d{2}", lower)
    if year_match:
        score += int(year_match[-1]) - 2000
    return score


def _unwrap_duckduckgo_url(url: str) -> str:
    parsed = urlparse(url)
    if "duckduckgo.com" not in parsed.netloc.lower():
        return url
    query = parse_qs(parsed.query)
    uddg = query.get("uddg")
    if not uddg:
        return url
    return unquote(uddg[0])


async def _fetch_text(client: httpx.AsyncClient, url: str) -> str:
    response = await client.get(url, follow_redirects=True)
    response.raise_for_status()
    return response.text


async def discover_company_website(company: str) -> str | None:
    company_name = _clean_company_name(company)
    query = f"{company_name} official website"

    async with httpx.AsyncClient(
        timeout=20.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        try:
            html = await _fetch_text(client, f"https://duckduckgo.com/html/?q={query}")
            links = [_unwrap_duckduckgo_url(link) for link in _extract_links(html, "https://duckduckgo.com")]
            links = [link for link in links if link.startswith("http") and "duckduckgo.com" not in urlparse(link).netloc]
            if links:
                return links[0]
        except Exception:
            pass

        base = re.sub(r"\s+", "", company_name.lower())
        for domain in (f"https://{base}.com", f"https://www.{base}.com", f"https://{base}.co"):
            try:
                response = await client.get(domain)
                if response.status_code < 400:
                    return str(response.url)
            except Exception:
                continue

    return None


async def _find_pdf_links_on_page(client: httpx.AsyncClient, page_url: str) -> list[str]:
    try:
        html = await _fetch_text(client, page_url)
    except Exception:
        return []

    links = _extract_links(html, page_url)
    return [link for link in links if ".pdf" in link.lower()]


async def find_esg_pdf_url(company_website: str) -> str | None:
    async with httpx.AsyncClient(
        timeout=25.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        candidate_pages: list[str] = [company_website]
        candidate_pages.extend(urljoin(company_website, path) for path in COMMON_ESG_PATHS)

        # Crawl homepage links first for likely sustainability/investor sections.
        try:
            home_html = await _fetch_text(client, company_website)
            for link in _extract_links(home_html, company_website):
                lower = link.lower()
                if _is_same_domain(link, company_website) and any(
                    key in lower for key in ["sustain", "esg", "investor", "report", "impact", "responsibility"]
                ):
                    candidate_pages.append(link)
        except Exception:
            pass

        seen_pages: set[str] = set()
        pdf_candidates: list[str] = []

        for page in candidate_pages:
            if page in seen_pages:
                continue
            seen_pages.add(page)
            pdf_candidates.extend(await _find_pdf_links_on_page(client, page))

        if not pdf_candidates:
            return None

        ranked = sorted(set(pdf_candidates), key=_score_pdf_link, reverse=True)
        return ranked[0]


async def download_pdf_to_temp(pdf_url: str) -> Path:
    async with httpx.AsyncClient(
        timeout=40.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        response = await client.get(pdf_url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if "pdf" not in content_type and not pdf_url.lower().endswith(".pdf"):
            raise ValueError("Resolved ESG link is not a PDF file")

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.write(response.content)
        tmp.flush()
        tmp.close()
        return Path(tmp.name)


def estimate_report_year(*urls: Iterable[str]) -> int | None:
    best = None
    for url in urls:
        if not url:
            continue
        years = re.findall(r"20\d{2}", str(url))
        for year in years:
            year_i = int(year)
            if 2000 <= year_i <= 2100 and (best is None or year_i > best):
                best = year_i
    return best