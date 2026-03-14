from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from database import community_posts_collection, likes_collection
from utils.serializers import serialize_doc


router = APIRouter(prefix="/likes", tags=["likes"])


@router.post("/add")
async def like_post(payload: dict):
    post_id = payload.get("post_id", "")
    user_id = payload.get("user_id", "")

    if not post_id or not user_id:
        raise HTTPException(status_code=400, detail="post_id and user_id are required")

    try:
        post = await community_posts_collection.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post_id")

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Deduplication — prevent same user liking same post twice
    existing = await likes_collection.find_one({"post_id": post_id, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=409, detail="You have already liked this post")

    doc = {
        "post_id": post_id,
        "user_id": user_id,
        "created_at": datetime.utcnow(),
    }
    result = await likes_collection.insert_one(doc)

    # Increment upvotes on the post
    await community_posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"upvotes": 1}},
    )

    created = await likes_collection.find_one({"_id": result.inserted_id})
    return {"message": "Post liked", "like": serialize_doc(created)}


@router.delete("/remove")
async def unlike_post(payload: dict):
    post_id = payload.get("post_id", "")
    user_id = payload.get("user_id", "")

    if not post_id or not user_id:
        raise HTTPException(status_code=400, detail="post_id and user_id are required")

    existing = await likes_collection.find_one({"post_id": post_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Like not found")

    await likes_collection.delete_one({"post_id": post_id, "user_id": user_id})
    await community_posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"upvotes": -1}},
    )

    return {"message": "Like removed"}
