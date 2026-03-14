from motor.motor_asyncio import AsyncIOMotorClient

from config import settings


client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.db_name]

users_collection = db["users"]
companies_collection = db["companies"]
esg_reports_collection = db["esg_reports"]
claims_collection = db["claims"]
community_posts_collection = db["community_posts"]
comments_collection = db["comments"]
news_collection = db["news"]
likes_collection = db["likes"]
