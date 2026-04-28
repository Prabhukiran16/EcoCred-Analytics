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

KNOWN_COMPANY_WEBSITES = {
    "apple": "https://www.apple.com/",
    "microsoft": "https://www.microsoft.com/",
    "google": "https://about.google/",
    "alphabet": "https://abc.xyz/",
    "amazon": "https://www.amazon.com/",
    "meta": "https://about.meta.com/",
}

KNOWN_COMPANY_REPORT_SOURCES = {
    "apple": [
        "https://images.apple.com/ca/environment/pdf/Apple_Environmental_Progress_Report_2025.pdf",
        "https://www.apple.com/environment/pdf/Apple_Environmental_Progress_Report_2025.pdf",
        "https://www.apple.com/environment/",
    ],
    "microsoft": [
        "https://www.microsoft.com/en-us/corporate-responsibility/sustainability/report",
        "https://www.microsoft.com/en-us/corporate-responsibility/sustainability",
        "https://www.microsoft.com/en-us/corporate-responsibility",
    ],
}

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
TAG_RE = re.compile(r"<[^>]+>")


def _clean_company_name(company: str) -> str:
    cleaned = re.sub(r"\b(inc|ltd|limited|corp|corporation|plc|llc|co)\b", "", company, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _company_key(company: str) -> str:
    return re.sub(r"[^a-z0-9]", "", company.lower())


def _extract_links(html: str, base_url: str) -> list[str]:
    links: list[str] = []
    for raw in HREF_RE.findall(html or ""):
        full = urljoin(base_url, raw.strip())
        if full.startswith("http://") or full.startswith("https://"):
            links.append(full)
    return links


def _base_domain(url: str) -> str:
    host = urlparse(url).netloc.lower().replace("www.", "")
    parts = host.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


def _is_same_domain(url_a: str, url_b: str) -> bool:
    a = urlparse(url_a).netloc.replace("www.", "").lower()
    b = urlparse(url_b).netloc.replace("www.", "").lower()
    return bool(a) and a == b


def _is_related_domain(url_a: str, url_b: str) -> bool:
    a = urlparse(url_a).netloc.lower().replace("www.", "")
    b = urlparse(url_b).netloc.lower().replace("www.", "")
    if not a or not b:
        return False
    if a == b:
        return True
    return a.endswith(f".{b}") or b.endswith(f".{a}")


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


def _score_report_page_link(url: str, company_name: str = "", company_website: str = "") -> int:
    lower = url.lower()
    score = 0

    if any(token in lower for token in ["sustain", "esg", "responsibility", "impact", "environment"]):
        score += 20
    if "report" in lower:
        score += 10
    if "annual" in lower:
        score += 8

    year_match = re.findall(r"20\d{2}", lower)
    if year_match:
        score += int(year_match[-1]) - 2000

    if company_name:
        key = _company_key(_clean_company_name(company_name))
        if key and key in re.sub(r"[^a-z0-9]", "", lower):
            score += 18

    if company_website and _is_related_domain(url, company_website):
        score += 30

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


def _extract_visible_text_from_html(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = TAG_RE.sub(" ", text)
    text = re.sub(r"&nbsp;|&#160;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def fetch_webpage_text(url: str) -> str:
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        html = await _fetch_text(client, url)
    return _extract_visible_text_from_html(html)


async def _search_web_links(client: httpx.AsyncClient, query: str, max_results: int = 40) -> list[str]:
    try:
        html = await _fetch_text(client, f"https://duckduckgo.com/html/?q={query}")
    except Exception:
        return []

    links = [_unwrap_duckduckgo_url(link) for link in _extract_links(html, "https://duckduckgo.com")]
    deduped: list[str] = []
    seen: set[str] = set()
    for link in links:
        if not link.startswith("http"):
            continue
        host = urlparse(link).netloc.lower()
        if "duckduckgo.com" in host:
            continue
        if link in seen:
            continue
        seen.add(link)
        deduped.append(link)
        if len(deduped) >= max_results:
            break
    return deduped


async def _is_url_reachable(client: httpx.AsyncClient, url: str) -> bool:
    try:
        response = await client.get(url, follow_redirects=True)
        return response.status_code < 400
    except Exception:
        return False


async def discover_company_website(company: str) -> str | None:
    company_name = _clean_company_name(company)
    key = _company_key(company_name)
    for known_key, known_url in KNOWN_COMPANY_WEBSITES.items():
        if known_key == key or known_key in key or key in known_key:
            return known_url

    query = f"{company_name} official website"

    async with httpx.AsyncClient(
        timeout=20.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        try:
            links = await _search_web_links(client, query, max_results=30)
            if links:
                token = company_name.split(" ")[0].lower()
                scored = sorted(
                    links,
                    key=lambda link: (
                        token in urlparse(link).netloc.lower(),
                        _score_pdf_link(link),
                    ),
                    reverse=True,
                )
                return scored[0]
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


async def find_esg_pdf_url(company_website: str, company_name: str = "") -> str | None:
    async with httpx.AsyncClient(
        timeout=25.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        key = _company_key(company_name) if company_name else ""
        if key:
            for known_key, known_links in KNOWN_COMPANY_REPORT_SOURCES.items():
                if known_key == key or known_key in key or key in known_key:
                    for link in known_links:
                        if ".pdf" in link.lower() and await _is_url_reachable(client, link):
                            return link

        candidate_pages: list[str] = [company_website]
        candidate_pages.extend(urljoin(company_website, path) for path in COMMON_ESG_PATHS)
        root_domain = _base_domain(company_website)

        # Crawl homepage links first for likely sustainability/investor sections.
        try:
            home_html = await _fetch_text(client, company_website)
            for link in _extract_links(home_html, company_website):
                lower = link.lower()
                if _is_related_domain(link, company_website) and any(
                    key in lower for key in ["sustain", "esg", "investor", "report", "impact", "responsibility"]
                ):
                    candidate_pages.append(link)
        except Exception:
            pass

        # Search fallback for sites where report links are hidden behind JS or separate investor subdomains.
        search_queries = [
            f'site:{root_domain} sustainability report pdf',
            f'site:{root_domain} esg report pdf',
        ]
        if company_name.strip():
            search_queries.extend(
                [
                    f'"{company_name}" sustainability report pdf',
                    f'"{company_name}" esg report pdf',
                ]
            )

        for query in search_queries:
            for link in await _search_web_links(client, query, max_results=25):
                lower = link.lower()
                if ".pdf" in lower:
                    if root_domain in urlparse(link).netloc.lower() or "cdn" in urlparse(link).netloc.lower():
                        candidate_pages.append(link)
                elif any(token in lower for token in ["sustain", "esg", "annual", "investor", "report"]):
                    candidate_pages.append(link)

        seen_pages: set[str] = set()
        pdf_candidates: list[str] = []

        for page in candidate_pages:
            if page in seen_pages:
                continue
            seen_pages.add(page)
            if ".pdf" in page.lower():
                pdf_candidates.append(page)
            else:
                pdf_candidates.extend(await _find_pdf_links_on_page(client, page))

        if not pdf_candidates:
            return None

        ranked = sorted(set(pdf_candidates), key=_score_pdf_link, reverse=True)
        return ranked[0]


async def find_esg_report_page_url(company_website: str, company_name: str = "") -> str | None:
    async with httpx.AsyncClient(
        timeout=25.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        key = _company_key(company_name) if company_name else ""
        if key:
            for known_key, known_links in KNOWN_COMPANY_REPORT_SOURCES.items():
                if known_key == key or known_key in key or key in known_key:
                    for link in known_links:
                        if ".pdf" not in link.lower() and await _is_url_reachable(client, link):
                            return link

        root_domain = _base_domain(company_website)
        queries = [
            f"site:{root_domain} sustainability report",
            f"site:{root_domain} esg report",
            f"site:{root_domain} corporate responsibility report",
        ]
        if company_name.strip():
            queries.extend(
                [
                    f'"{company_name}" sustainability report',
                    f'"{company_name}" esg report',
                ]
            )

        candidates: list[str] = []
        for query in queries:
            candidates.extend(await _search_web_links(client, query, max_results=20))

        scored: list[tuple[int, str]] = []
        for link in candidates:
            lower = link.lower()
            if ".pdf" in lower:
                continue
            if any(block in lower for block in ["learn.microsoft.com", "training", "docs.microsoft.com"]):
                continue
            if not _is_related_domain(link, company_website) and root_domain not in urlparse(link).netloc.lower():
                continue
            if not any(k in lower for k in ["sustain", "esg", "responsibility", "impact", "report", "environment"]):
                continue

            score = 0
            if "sustain" in lower:
                score += 20
            if "esg" in lower:
                score += 20
            if "report" in lower:
                score += 10
            if "responsibility" in lower:
                score += 8
            scored.append((score, link))

        if not scored:
            return None

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]


async def find_esg_source_for_any_company(company_name: str, company_website: str = "") -> dict | None:
    cleaned_name = _clean_company_name(company_name)
    if not cleaned_name:
        return None

    async with httpx.AsyncClient(
        timeout=25.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        queries = [
            f'"{cleaned_name}" sustainability report pdf',
            f'"{cleaned_name}" esg report pdf',
            f'"{cleaned_name}" annual report sustainability pdf',
            f'"{cleaned_name}" sustainability report',
            f'"{cleaned_name}" esg report',
            f'"{cleaned_name}" corporate responsibility report',
        ]

        all_links: list[str] = []
        seen: set[str] = set()
        for query in queries:
            for link in await _search_web_links(client, query, max_results=30):
                if link in seen:
                    continue
                seen.add(link)
                all_links.append(link)

        if not all_links:
            return None

        pdf_candidates: list[str] = []
        page_candidates: list[str] = []

        for link in all_links:
            lower = link.lower()
            if ".pdf" in lower:
                if await _is_url_reachable(client, link):
                    pdf_candidates.append(link)
                continue

            if any(k in lower for k in ["sustain", "esg", "responsibility", "impact", "environment", "report"]):
                page_candidates.append(link)

        if pdf_candidates:
            best_pdf = sorted(
                set(pdf_candidates),
                key=lambda u: _score_pdf_link(u) + (30 if company_website and _is_related_domain(u, company_website) else 0),
                reverse=True,
            )[0]
            return {"type": "pdf", "url": best_pdf}

        if page_candidates:
            best_page = sorted(
                set(page_candidates),
                key=lambda u: _score_report_page_link(u, company_name=cleaned_name, company_website=company_website),
                reverse=True,
            )[0]
            return {"type": "page", "url": best_page}

    return None


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