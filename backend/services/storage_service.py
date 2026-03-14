from datetime import datetime
from pathlib import Path

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from config import settings


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def _cloudinary_configured() -> bool:
    return all(
        [
            settings.cloudinary_cloud_name,
            settings.cloudinary_api_key,
            settings.cloudinary_api_secret,
        ]
    )


def _configure_cloudinary() -> None:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=settings.cloudinary_secure,
    )


async def save_media_file(file: UploadFile | None, folder: str = "community_posts") -> str | None:
    if not file:
        return None

    content = await file.read()

    if _cloudinary_configured():
        _configure_cloudinary()
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type="auto",
            public_id=f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{file.filename.rsplit('.', 1)[0]}",
            overwrite=False,
        )
        return result.get("secure_url")

    safe_name = file.filename.replace(" ", "_")
    target = UPLOAD_DIR / f"{datetime.utcnow().timestamp()}_{safe_name}"

    with target.open("wb") as out_file:
        out_file.write(content)

    return str(target).replace("\\", "/")


async def save_temp_file(file: UploadFile | None, folder: str = "esg_reports") -> str | None:
    if not file:
        return None

    subdir = UPLOAD_DIR / folder
    subdir.mkdir(exist_ok=True)

    safe_name = file.filename.replace(" ", "_")
    target = subdir / f"{datetime.utcnow().timestamp()}_{safe_name}"

    with target.open("wb") as out_file:
        content = await file.read()
        out_file.write(content)

    return str(target).replace("\\", "/")
