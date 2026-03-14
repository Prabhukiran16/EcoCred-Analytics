import httpx

from config import settings


async def fetch_company_news(company: str) -> list[dict]:
    if not settings.gnews_api_key:
        return []

    url = "https://gnews.io/api/v4/search"
    params = {
        "q": f"{company} environment",
        "token": settings.gnews_api_key,
        "lang": "en",
        "max": 10,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("articles", [])
