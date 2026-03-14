from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from database import claims_collection, companies_collection, esg_reports_collection
from models.schemas import SaveAnalysisRequest
from services.ai_service import analyze_esg_text
from services.pdf_service import extract_text_from_pdf
from services.storage_service import save_temp_file


router = APIRouter(prefix="/analysis", tags=["analysis"])


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
async def analyze_company(company: str = Query(...), report_text: str = Query(default="")):
    if not company.strip():
        raise HTTPException(status_code=400, detail="Company is required")

    if report_text:
        await esg_reports_collection.insert_one(
            {
                "company": company,
                "report_text": report_text,
                "created_at": datetime.utcnow(),
            }
        )

    text = report_text or f"ESG statement for {company}: net-zero and recycling commitments."
    analysis = await analyze_esg_text(company, text)
    await _persist_analysis(company, analysis)
    return analysis


@router.post("/company/upload")
async def analyze_company_upload(company: str = Form(...), report_file: UploadFile = File(...)):
    if not company.strip():
        raise HTTPException(status_code=400, detail="Company is required")

    if not report_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_path = await save_temp_file(report_file)
    report_text = extract_text_from_pdf(file_path or "")

    await esg_reports_collection.insert_one(
        {
            "company": company,
            "report_text": report_text,
            "file_url": file_path,
            "created_at": datetime.utcnow(),
        }
    )

    analysis = await analyze_esg_text(company, report_text)
    await _persist_analysis(company, analysis)

    return analysis


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

    from utils.serializers import serialize_doc
    saved = await esg_reports_collection.find_one({"_id": result.inserted_id})
    return {"message": "Analysis saved", "data": serialize_doc(saved)}
