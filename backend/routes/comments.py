from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from database import comments_collection, community_posts_collection, users_collection
from utils.serializers import serialize_doc


router = APIRouter(prefix="/comments", tags=["comments"])


@router.post("/add")
async def add_comment(payload: dict):
    post_id = payload.get("post_id", "")
    user_id = payload.get("user_id", "")
    comment_text = payload.get("comment", "")
    username = payload.get("username", "")

    if not post_id or not comment_text:
        raise HTTPException(status_code=400, detail="post_id and comment are required")

    try:
        post = await community_posts_collection.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post_id")

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Resolve username from user_id if not provided
    if not username and user_id:
        try:
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                username = user["username"]
        except Exception:
            pass

    doc = {
        "post_id": post_id,
        "user_id": user_id,
        "username": username or "anonymous",
        "comment": comment_text,
        "created_at": datetime.utcnow(),
    }
    result = await comments_collection.insert_one(doc)

    await community_posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$push": {"comments": str(result.inserted_id)}},
    )

    created = await comments_collection.find_one({"_id": result.inserted_id})
    return {"message": "Comment added", "comment": serialize_doc(created)}


@router.get("/{post_id}")
async def get_comments(post_id: str):
    try:
        ObjectId(post_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post_id")

    items = []
    cursor = comments_collection.find({"post_id": post_id}).sort("created_at", 1)
    async for doc in cursor:
        item = serialize_doc(doc)
        username = item.get("username", "")
        if not username and item.get("user_id"):
            try:
                user = await users_collection.find_one({"_id": ObjectId(item.get("user_id"))})
                if user:
                    username = user.get("username", "anonymous")
            except Exception:
                username = "anonymous"

        items.append({
            "username": username or "anonymous",
            "comment": item.get("comment") or item.get("text", ""),
            "text": item.get("text") or item.get("comment", ""),
            "timestamp": item.get("created_at", ""),
        })

    return {"post_id": post_id, "comments": items}
