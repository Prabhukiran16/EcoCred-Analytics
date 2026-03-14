from datetime import datetime

from bson import ObjectId

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from database import claims_collection, companies_collection, esg_reports_collection
from models.schemas import SaveAnalysisRequest
from services.ai_service import analyze_esg_text
from services.pdf_service import extract_text_from_pdf
from services.storage_service import save_temp_file
from services.twilio_service import send_risk_alert_sms
from utils.serializers import serialize_doc


router = APIRouter(prefix="/analysis", tags=["analysis"])


def _report_datetime(report_year: int | None) -> datetime:
    if report_year is None:
        return datetime.utcnow()
    if report_year < 2000 or report_year > 2100:
        raise HTTPException(status_code=400, detail="report_year must be between 2000 and 2100")
    return datetime(report_year, 1, 1)


async def _persist_analysis(company: str, analysis: dict):
    for claim in analysis.get("claims", []):
        await claims_collection.insert_one(
            {
                "company": company,
                "claim_text": claim.get("claim_text"),
                "risk_score": claim.get("risk_score", 0),
                "evidence_present": claim.get("evidence_present", False),
                "ai_explanation": claim.get("ai_explanation", ""),
                "created_at": datetime.utcnow(),
            }
        )

    await companies_collection.update_one(
        {"name": company},
        {
            "$set": {
                "name": company,
                "industry": "Unknown",
                "esg_score": analysis.get("credibility_score", 0),
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )


@router.get("/company")
async def analyze_company(
    company: str = Query(...),
    report_text: str = Query(default=""),
    source_language: str = Query(default="auto"),
    report_year: int | None = Query(default=None),
):
    if not company.strip():
        raise HTTPException(status_code=400, detail="Company is required")

    report_dt = _report_datetime(report_year)
    text = report_text or f"ESG statement for {company}: net-zero and recycling commitments."
    analysis = await analyze_esg_text(company, text, source_language)

    await esg_reports_collection.insert_one(
        {
            "company": company,
            "report_text": text,
            "source_language": source_language,
            "credibility_score": analysis.get("credibility_score", 0),
            "risk_score": max(0, 100 - analysis.get("credibility_score", 0)),
            "claims": analysis.get("claims", []),
            "ai_explanation": analysis.get("ai_explanation", ""),
            "report_year": report_year,
            "created_at": report_dt,
        }
    )

    await _persist_analysis(company, analysis)
    return analysis


@router.post("/company/upload")
async def analyze_company_upload(
    company: str = Form(...),
    report_file: UploadFile = File(...),
    source_language: str = Form(default="auto"),
    report_year: int | None = Form(default=None),
):
    if not company.strip():
        raise HTTPException(status_code=400, detail="Company is required")

    if not report_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_path = await save_temp_file(report_file)
    report_text = extract_text_from_pdf(file_path or "")

    report_dt = _report_datetime(report_year)
    analysis = await analyze_esg_text(company, report_text, source_language)

    await esg_reports_collection.insert_one(
        {
            "company": company,
            "report_text": report_text,
            "file_url": file_path,
            "source_language": source_language,
            "credibility_score": analysis.get("credibility_score", 0),
            "risk_score": max(0, 100 - analysis.get("credibility_score", 0)),
            "claims": analysis.get("claims", []),
            "ai_explanation": analysis.get("ai_explanation", ""),
            "report_year": report_year,
            "created_at": report_dt,
        }
    )

    await _persist_analysis(company, analysis)

    return analysis


@router.get("/history")
async def analysis_history(company: str = Query(...), years: int = Query(default=6, ge=1, le=15)):
    if not company.strip():
        raise HTTPException(status_code=400, detail="Company is required")

    current_year = datetime.utcnow().year
    from_year = current_year - years + 1

    pipeline = [
        {"$match": {"company": company, "credibility_score": {"$exists": True}, "created_at": {"$exists": True}}},
        {
            "$project": {
                "year": {"$year": "$created_at"},
                "credibility_score": "$credibility_score",
                "risk_score": {"$max": [0, {"$subtract": [100, "$credibility_score"]}]},
            }
        },
        {"$match": {"year": {"$gte": from_year}}},
        {
            "$group": {
                "_id": "$year",
                "avg_credibility": {"$avg": "$credibility_score"},
                "avg_risk": {"$avg": "$risk_score"},
                "reports_count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    rows = await esg_reports_collection.aggregate(pipeline).to_list(length=years)
    history = [
        {
            "year": row["_id"],
            "credibility_score": round(row.get("avg_credibility", 0), 1),
            "risk_score": round(row.get("avg_risk", 0), 1),
            "reports_count": row.get("reports_count", 0),
        }
        for row in rows
    ]

    return {"company": company, "history": history}


@router.get("/reports")
async def list_reports(company: str = Query(default=""), limit: int = Query(default=24, ge=1, le=100)):
    filters = {}
    if company.strip():
        filters["company"] = {"$regex": company.strip(), "$options": "i"}

    reports = []
    cursor = esg_reports_collection.find(filters).sort("created_at", -1).limit(limit)
    async for doc in cursor:
        item = serialize_doc(doc)
        item["claims_count"] = len(doc.get("claims", []))
        reports.append(item)

    return {"reports": reports}


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    try:
        object_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report id")

    report = await esg_reports_collection.find_one({"_id": object_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    item = serialize_doc(report)
    item["claims_count"] = len(report.get("claims", []))
    return {"report": item}


@router.post("/notify-risk")
async def notify_risk(payload: dict):
    phone_number = (payload.get("phone_number") or "").strip()
    company = (payload.get("company") or "").strip()
    product = (payload.get("product") or "").strip()
    risk_score = payload.get("risk_score")
    summary = (payload.get("summary") or "").strip()

    if not phone_number:
        raise HTTPException(status_code=400, detail="phone_number is required")
    if not company:
        raise HTTPException(status_code=400, detail="company is required")

    try:
        risk_value = int(float(risk_score))
    except Exception:
        raise HTTPException(status_code=400, detail="risk_score must be numeric")

    if risk_value <= 50:
        return {"sent": False, "message": "Risk is below alert threshold"}

    short_summary = summary[:180] if summary else "High greenwashing risk detected. Review ESG claims and missing evidence."
    sms = f"EcoCred Alert\nCompany: {company}\nProduct: {product or 'N/A'}\nRisk: {risk_value}/100\n{short_summary}"

    sent, detail = send_risk_alert_sms(phone_number=phone_number, message=sms)
    if not sent:
        raise HTTPException(status_code=500, detail=f"SMS could not be sent: {detail}")

    return {"sent": True, "message": f"Risk alert SMS sent ({detail})"}


@router.post("/save")
async def save_analysis(payload: SaveAnalysisRequest):
    """Directly save an AI analysis result without re-running analysis."""
    doc = {
        "company": payload.company,
        "risk_score": payload.risk_score,
        "credibility_score": max(0, 100 - payload.risk_score),
        "claims": payload.claims,
        "ai_explanation": payload.ai_explanation,
        "created_at": datetime.utcnow(),
    }
    result = await esg_reports_collection.insert_one(doc)

    await companies_collection.update_one(
        {"name": payload.company},
        {"$set": {"name": payload.company, "esg_score": doc["credibility_score"], "created_at": datetime.utcnow()}},
        upsert=True,
    )

    saved = await esg_reports_collection.find_one({"_id": result.inserted_id})
    return {"message": "Analysis saved", "data": serialize_doc(saved)}
