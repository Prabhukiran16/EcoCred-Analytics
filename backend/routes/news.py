from datetime import datetime

from fastapi import APIRouter, Query

from database import news_collection
from models.schemas import SaveNewsRequest
from services.news_service import fetch_company_news
from utils.serializers import serialize_doc


router = APIRouter(prefix="/news", tags=["news"])


@router.get("/company")
async def get_company_news(company: str = Query(...)):
    articles = await fetch_company_news(company)

    stored_items = []
    for article in articles:
        doc = {
            "company": company,
            "title": article.get("title", ""),
            "description": article.get("description", ""),
            "source": article.get("source", {}).get("name", ""),
            "url": article.get("url", ""),
            "image": article.get("image", ""),
            "published_at": article.get("publishedAt", ""),
            "created_at": datetime.utcnow(),
        }

        existing = await news_collection.find_one({"url": doc["url"]})
        if not existing and doc["url"]:
            result = await news_collection.insert_one(doc)
            inserted = await news_collection.find_one({"_id": result.inserted_id})
            stored_items.append(serialize_doc(inserted))

    latest = []
    cursor = news_collection.find({"company": company}).sort("created_at", -1).limit(10)
    async for item in cursor:
        latest.append(serialize_doc(item))

    return {"company": company, "news": latest, "new_items": stored_items}


@router.post("/save")
async def save_news(payload: SaveNewsRequest):
    """Manually save a news article fetched from GNews or any source."""
    existing = await news_collection.find_one({"url": payload.url})
    if existing:
        return {"message": "Article already saved", "data": serialize_doc(existing)}

    doc = {
        "company": payload.company,
        "title": payload.title,
        "description": payload.description,
        "source": payload.source,
        "url": payload.url,
        "published_at": payload.published_at,
        "created_at": datetime.utcnow(),
    }
    result = await news_collection.insert_one(doc)
    saved = await news_collection.find_one({"_id": result.inserted_id})
    return {"message": "News saved", "data": serialize_doc(saved)}
