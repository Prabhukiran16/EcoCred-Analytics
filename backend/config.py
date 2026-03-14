from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mongo_uri: str = "mongodb://localhost:27017"
    db_name: str = "ecocred"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    gnews_api_key: str = ""
    sarvam_api_key: str = ""
    sarvam_api_base: str = "https://api.sarvam.ai"

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_secure: bool = True

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""


settings = Settings()
