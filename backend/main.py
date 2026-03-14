from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.analysis import router as analysis_router
from routes.auth import router as auth_router
from routes.comments import router as comments_router
from routes.companies import router as companies_router
from routes.likes import router as likes_router
from routes.news import router as news_router
from routes.posts import router as posts_router


app = FastAPI(title="EcoCred Analytics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(comments_router)
app.include_router(likes_router)
app.include_router(analysis_router)
app.include_router(news_router)
app.include_router(companies_router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    return {"message": "EcoCred Analytics backend is running"}
