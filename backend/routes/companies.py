from fastapi import APIRouter, Query

from database import companies_collection
from utils.serializers import serialize_doc


router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/search")
async def search_companies(q: str = Query(..., min_length=1)):
    cursor = companies_collection.find({"name": {"$regex": q, "$options": "i"}}).limit(20)
    items = []
    async for company in cursor:
        items.append(serialize_doc(company))
    return {"results": items}
