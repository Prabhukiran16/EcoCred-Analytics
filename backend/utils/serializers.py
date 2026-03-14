from datetime import datetime


def serialize_doc(doc: dict) -> dict:
    if not doc:
        return {}

    out = {}
    for key, value in doc.items():
        if key == "_id":
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, list):
            out[key] = [str(item) for item in value]
        else:
            out[key] = value
    return out
