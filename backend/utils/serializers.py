from datetime import datetime

from bson import ObjectId


def serialize_value(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}
    return value


def serialize_doc(doc: dict) -> dict:
    if not doc:
        return {}

    return {key: serialize_value(value) for key, value in doc.items()}
