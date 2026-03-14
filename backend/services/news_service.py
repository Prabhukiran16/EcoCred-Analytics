import httpx

from config import settings


async def fetch_company_news(company: str) -> list[dict]:
    if not settings.gnews_api_key:
        return []

    url = "https://gnews.io/api/v4/search"
    candidate_queries = [
        f"{company} environment",
        f"{company} sustainability",
        company,
    ]

    async with httpx.AsyncClient(timeout=20.0) as client:
        for query in candidate_queries:
            try:
                response = await client.get(
                    url,
                    params={
                        "q": query,
                        "token": settings.gnews_api_key,
                        "lang": "en",
                        "max": 10,
                    },
                )
                response.raise_for_status()
                data = response.json()
                articles = data.get("articles", [])
                if articles:
                    return articles
            except Exception:
                continue

    return []
