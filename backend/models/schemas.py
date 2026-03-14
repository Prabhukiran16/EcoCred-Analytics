from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    phone_number: Optional[str] = None


class CommentRequest(BaseModel):
    post_id: str
    user_id: str
    text: str = Field(min_length=1, max_length=500)


class VoteRequest(BaseModel):
    post_id: str


class CompanySearchQuery(BaseModel):
    q: str


class AnalysisResponse(BaseModel):
    company: str
    credibility_score: int
    contradiction_detected: bool
    claims: list[dict]
    ai_explanation: str


class SaveAnalysisRequest(BaseModel):
    company: str
    risk_score: int = Field(ge=0, le=100)
    claims: list[dict] = []
    ai_explanation: str = ""


class SaveNewsRequest(BaseModel):
    company: str
    title: str
    description: str = ""
    source: str = ""
    url: str
    published_at: str = ""
