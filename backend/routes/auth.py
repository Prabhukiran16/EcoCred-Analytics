from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from database import users_collection
from models.schemas import LoginRequest, RegisterRequest
from services.twilio_service import send_login_sms
from utils.security import create_access_token, hash_password, verify_password
from utils.serializers import serialize_doc


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(payload: RegisterRequest):
    existing = await users_collection.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    doc = {
        "username": payload.username,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.utcnow(),
    }
    result = await users_collection.insert_one(doc)
    user = await users_collection.find_one({"_id": result.inserted_id})
    return {"message": "Registered successfully", "user": serialize_doc(user)}


@router.post("/signup")
async def signup(payload: RegisterRequest):
    """Alias for /register — same behaviour."""
    return await register(payload)


@router.post("/login")
async def login(payload: LoginRequest):
    user = await users_collection.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user["_id"]))
    sms_sent = send_login_sms(payload.phone_number or "", payload.email)

    return {
        "access_token": token,
        "token_type": "bearer",
        "sms_sent": sms_sent,
        "user": serialize_doc(user),
    }
