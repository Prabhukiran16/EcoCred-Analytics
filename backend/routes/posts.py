from datetime import datetime
import re

from bson import ObjectId
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from database import comments_collection, community_posts_collection, users_collection
from models.schemas import CommentRequest, VoteRequest
from services.storage_service import save_media_file
from utils.serializers import serialize_doc


router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("/create")
async def create_post(
    user_id: str = Form(...),
    company: str = Form(...),
    product: str = Form(...),
    description: str = Form(...),
    media: UploadFile | None = File(default=None),
):
    """Alias for /upload — same behaviour."""
    return await upload_post(user_id=user_id, company=company, product=product,
                             description=description, media=media)


@router.post("/upload")
async def upload_post(
    user_id: str = Form(...),
    company: str = Form(...),
    product: str = Form(...),
    description: str = Form(...),
    media: UploadFile | None = File(default=None),
):
    media_url = await save_media_file(media)
    doc = {
        "user_id": user_id,
        "company": company,
        "product": product,
        "description": description,
        "media_url": media_url,
        "upvotes": 0,
        "downvotes": 0,
        "comments": [],
        "created_at": datetime.utcnow(),
    }
    result = await community_posts_collection.insert_one(doc)
    created = await community_posts_collection.find_one({"_id": result.inserted_id})
    return {"message": "Post uploaded", "post": serialize_doc(created)}


@router.get("/feed")
async def get_feed(limit: int = 30, company: str = Query(default="")):
    posts = []
    filters = {}
    if company.strip():
        filters["company"] = {"$regex": re.escape(company.strip()), "$options": "i"}

    cursor = community_posts_collection.find(filters).sort("created_at", -1).limit(limit)

    async for post in cursor:
        username = "anonymous"
        try:
            user = await users_collection.find_one({"_id": ObjectId(post.get("user_id", ""))})
            if user:
                username = user["username"]
        except Exception:
            username = "anonymous"

        item = serialize_doc(post)
        item["username"] = username
        item["comment_count"] = len(post.get("comments", []))
        posts.append(item)

    return {"posts": posts}


@router.post("/comment")
async def comment_post(payload: CommentRequest):
    post = await community_posts_collection.find_one({"_id": ObjectId(payload.post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment_doc = {
        "post_id": payload.post_id,
        "user_id": payload.user_id,
        "text": payload.text,
        "created_at": datetime.utcnow(),
    }
    result = await comments_collection.insert_one(comment_doc)

    await community_posts_collection.update_one(
        {"_id": ObjectId(payload.post_id)},
        {"$push": {"comments": str(result.inserted_id)}},
    )

    created = await comments_collection.find_one({"_id": result.inserted_id})
    return {"message": "Comment added", "comment": serialize_doc(created)}


@router.post("/upvote")
async def upvote_post(payload: VoteRequest):
    result = await community_posts_collection.update_one(
        {"_id": ObjectId(payload.post_id)}, {"$inc": {"upvotes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Upvoted"}


@router.post("/downvote")
async def downvote_post(payload: VoteRequest):
    result = await community_posts_collection.update_one(
        {"_id": ObjectId(payload.post_id)}, {"$inc": {"downvotes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Downvoted"}
