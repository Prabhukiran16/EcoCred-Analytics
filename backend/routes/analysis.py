from datetime import datetime
from pathlib import Path
import re

from bson import ObjectId

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from database import claims_collection, companies_collection, esg_reports_collection
from models.schemas import SaveAnalysisRequest
from services.ai_service import analyze_esg_text, translate_text
from services.pdf_service import extract_text_from_pdf
from services.storage_service import save_temp_file
from services.twilio_service import send_risk_alert_sms
from services.web_report_service import (
    discover_company_website,
    download_pdf_to_temp,
    estimate_report_year,
    fetch_webpage_text,
    find_esg_pdf_url,
    find_esg_report_page_url,
)
from utils.serializers import serialize_doc


router = APIRouter(prefix="/analysis", tags=["analysis"])


def _derive_scores_from_claims(claims: list[dict]) -> tuple[int, int]:
    if not claims:
        return 50, 50

    risks: list[int] = []
    for claim in claims:
        try:
            risks.append(max(0, min(int(claim.get("risk_score", 50) or 50), 100)))
        except Exception:
            risks.append(50)

    avg_risk = int(round(sum(risks) / len(risks)))
    credibility = max(0, min(100, 100 - avg_risk))
    return avg_risk, credibility


def _select_primary_present_claim(claims: list[dict]) -> list[dict]:
    if not claims:
        return []

    current_year = datetime.utcnow().year
    present_keywords = ["is", "are", "currently", "today", "now", "has", "have", "this year"]

    def score(claim: dict) -> int:
        text = str(claim.get("claim_text", "")).lower()
        risk_score = int(claim.get("risk_score", 50) or 50)

        s = 0
        if any(word in text for word in present_keywords):
            s += 2
        if any(str(y) in text for y in [current_year - 1, current_year, current_year + 1]):
            s += 3
        if any(token in text for token in ["%", "co2", "emission", "renewable", "recycl", "waste", "water"]):
            s += 2
        if claim.get("evidence_present"):
            s += 2

        # Slight tie-break toward higher-risk claims for audit visibility.
        s += max(0, min(risk_score, 100)) // 20
        return s

    best = max(claims, key=score)
    return [best]


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
    analysis = await analyze_esg_text(company, report_text, source_language, strict_claim_extraction=True)

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
async def list_reports(
    company: str = Query(default=""),
    limit: int = Query(default=24, ge=1, le=100),
    exact: bool = Query(default=False),
):
    filters = {}
    if company.strip():
        if exact:
            filters["company"] = company.strip()
        else:
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


@router.post("/translate-content")
async def translate_content(payload: dict):
    target_language = (payload.get("target_language") or "").strip().lower()
    ai_explanation = str(payload.get("ai_explanation") or "")
    claims = payload.get("claims") or []

    if target_language in {"", "en", "auto"}:
        return {"ai_explanation": ai_explanation, "claims": claims}

    translated_summary = await translate_text(ai_explanation, target_language=target_language)

    translated_claims: list[dict] = []
    for claim in claims:
        if not isinstance(claim, dict):
            continue

        claim_text = str(claim.get("claim_text") or "")
        claim_explanation = str(claim.get("ai_explanation") or "")

        translated_claim = {
            **claim,
            "claim_text": await translate_text(claim_text, target_language=target_language),
            "ai_explanation": await translate_text(claim_explanation, target_language=target_language),
        }
        translated_claims.append(translated_claim)

    return {"ai_explanation": translated_summary, "claims": translated_claims}


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


@router.post("/fetch-report-from-website")
async def fetch_report_from_company_website(payload: dict):
    company = (payload.get("company") or "").strip()
    phone_number = (payload.get("phone_number") or "").strip()
    requested_source_language = (payload.get("source_language") or "auto").strip().lower() or "auto"
    force_refresh = bool(payload.get("force_refresh", False))
    if not company:
        raise HTTPException(status_code=400, detail="company is required")

    cached_filter = {"company": {"$regex": f"^{re.escape(company)}$", "$options": "i"}}
    cached_doc = None
    if not force_refresh:
        cached_doc = await esg_reports_collection.find_one(cached_filter, sort=[("created_at", -1)])

    if cached_doc and cached_doc.get("report_text"):
        cached_claims = cached_doc.get("claims", []) or []
        recalculated_risk, recalculated_cred = _derive_scores_from_claims(cached_claims)

        # Keep previously cached records consistent with current claim-based scoring.
        if (
            int(cached_doc.get("risk_score", recalculated_risk) or recalculated_risk) != recalculated_risk
            or int(cached_doc.get("credibility_score", recalculated_cred) or recalculated_cred) != recalculated_cred
        ):
            await esg_reports_collection.update_one(
                {"_id": cached_doc["_id"]},
                {"$set": {"risk_score": recalculated_risk, "credibility_score": recalculated_cred}},
            )
            cached_doc["risk_score"] = recalculated_risk
            cached_doc["credibility_score"] = recalculated_cred

        cached_report = serialize_doc(cached_doc)
        sms_status = {"sent": False, "message": "No SMS sent"}
        cached_risk = int(cached_doc.get("risk_score", 0) or 0)
        if phone_number and cached_risk > 50:
            main_claim = (cached_doc.get("claims") or [{}])[0].get("claim_text", "")
            short_claim = (main_claim[:140] + "...") if len(main_claim) > 140 else main_claim
            sms = (
                "EcoCred Alert\n"
                f"Company: {cached_doc.get('company', company)}\n"
                f"Risk: {cached_risk}/100\n"
                f"Main claim: {short_claim or 'No main claim extracted'}"
            )
            sent, detail = send_risk_alert_sms(phone_number=phone_number, message=sms)
            sms_status = {
                "sent": bool(sent),
                "message": f"Risk alert SMS sent ({detail})" if sent else f"SMS could not be sent: {detail}",
            }
        elif phone_number and cached_risk <= 50:
            sms_status = {"sent": False, "message": "Risk is below alert threshold"}

        return {
            "message": "Loaded cached ESG report from storage",
            "report": cached_report,
            "source": {
                "company_website": cached_doc.get("source_website", ""),
                "pdf_url": cached_doc.get("file_url", ""),
            },
            "sms": sms_status,
            "cache": {"used": True},
        }

    website_url = await discover_company_website(company)
    if not website_url:
        raise HTTPException(status_code=404, detail="Could not find an official website for this company")

    pdf_url = await find_esg_pdf_url(website_url, company_name=company)

    report_text = ""
    source_url = ""

    if pdf_url:
        temp_path: Path | None = None
        try:
            temp_path = await download_pdf_to_temp(pdf_url)
            report_text = extract_text_from_pdf(str(temp_path))
            source_url = pdf_url
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except Exception:
            raise HTTPException(status_code=502, detail="Failed to download or parse ESG PDF")
        finally:
            if temp_path and temp_path.exists():
                temp_path.unlink(missing_ok=True)
    else:
        page_url = await find_esg_report_page_url(website_url, company_name=company)
        if not page_url:
            raise HTTPException(status_code=404, detail="Could not find ESG/Sustainability report page on the company website")
        try:
            report_text = await fetch_webpage_text(page_url)
            source_url = page_url
        except Exception:
            raise HTTPException(status_code=502, detail="Failed to fetch ESG report web page")

    if not report_text.strip():
        raise HTTPException(status_code=422, detail="ESG source was found, but text extraction returned empty content")

    analysis = await analyze_esg_text(
        company,
        report_text,
        source_language=requested_source_language,
        strict_claim_extraction=True,
    )
    analysis["claims"] = _select_primary_present_claim(analysis.get("claims", []))
    derived_risk, derived_credibility = _derive_scores_from_claims(analysis.get("claims", []))
    analysis["credibility_score"] = derived_credibility
    report_year = estimate_report_year(source_url, website_url)

    doc = {
        "company": company,
        "report_text": report_text,
        "file_url": source_url,
        "source_website": website_url,
        "source_language": requested_source_language,
        "credibility_score": derived_credibility,
        "risk_score": derived_risk,
        "claims": analysis.get("claims", []),
        "ai_explanation": analysis.get("ai_explanation", ""),
        "report_year": report_year,
        "created_at": datetime.utcnow(),
    }
    existing = await esg_reports_collection.find_one({"company": company, "file_url": source_url})
    if existing:
        await esg_reports_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "report_text": doc["report_text"],
                    "source_website": doc["source_website"],
                    "source_language": doc["source_language"],
                    "credibility_score": doc["credibility_score"],
                    "risk_score": doc["risk_score"],
                    "claims": doc["claims"],
                    "ai_explanation": doc["ai_explanation"],
                    "report_year": doc["report_year"],
                    "created_at": datetime.utcnow(),
                }
            },
        )
        saved = await esg_reports_collection.find_one({"_id": existing["_id"]})
    else:
        result = await esg_reports_collection.insert_one(doc)
        saved = await esg_reports_collection.find_one({"_id": result.inserted_id})
    await _persist_analysis(company, analysis)

    sms_status = {"sent": False, "message": "No SMS sent"}
    risk_value = int(doc.get("risk_score", 0) or 0)
    if phone_number and risk_value > 50:
        main_claim = (analysis.get("claims") or [{}])[0].get("claim_text", "")
        short_claim = (main_claim[:140] + "...") if len(main_claim) > 140 else main_claim
        sms = (
            "EcoCred Alert\n"
            f"Company: {company}\n"
            f"Risk: {risk_value}/100\n"
            f"Main claim: {short_claim or 'No main claim extracted'}"
        )
        sent, detail = send_risk_alert_sms(phone_number=phone_number, message=sms)
        sms_status = {
            "sent": bool(sent),
            "message": f"Risk alert SMS sent ({detail})" if sent else f"SMS could not be sent: {detail}",
        }
    elif phone_number and risk_value <= 50:
        sms_status = {"sent": False, "message": "Risk is below alert threshold"}

    return {
        "message": "ESG report fetched from company website and analyzed",
        "report": serialize_doc(saved),
        "source": {
            "company_website": website_url,
            "pdf_url": source_url,
        },
        "sms": sms_status,
        "cache": {"used": False},
    }
