from typing import Any
import json
import re

import httpx

from config import settings


LANGUAGE_HINTS = {
    "auto": "auto-detect",
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "ta": "Tamil",
    "bn": "Bengali",
    "mr": "Marathi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
}


def _build_local_analysis(company: str, report_text: str) -> dict[str, Any]:
    text = report_text.lower()
    claim_lines = [
        line.strip("- ")
        for line in report_text.splitlines()
        if any(keyword in line.lower() for keyword in ["claim", "commit", "net-zero", "recycle", "carbon"])
    ]

    if not claim_lines:
        claim_lines = [
            f"{company} claims carbon-neutral operations by 2030.",
            f"{company} claims 100% recyclable packaging.",
        ]

    claims: list[dict[str, Any]] = []
    for claim in claim_lines[:5]:
        lower_claim = claim.lower()
        has_evidence_words = any(k in text for k in ["audited", "verified", "assured", "third-party", "evidence"])
        future_language = any(k in lower_claim for k in ["will", "target", "2030", "2040", "aspire"])

        risk_score = 35
        if future_language:
            risk_score += 20
        if not has_evidence_words:
            risk_score += 20
        risk_score = min(risk_score, 95)

        claims.append(
            {
                "claim_text": claim,
                "risk_score": risk_score,
                "evidence_present": has_evidence_words,
                "ai_explanation": "Risk increases when commitments are forward-looking and not backed by verifiable evidence markers.",
            }
        )

    avg_risk = int(sum(item["risk_score"] for item in claims) / len(claims))
    return {
        "company": company,
        "credibility_score": max(0, 100 - avg_risk),
        "contradiction_detected": any(not c["evidence_present"] for c in claims),
        "claims": claims,
        "ai_explanation": "Score is inferred from extracted claim language, evidence signals, and possible contradiction patterns.",
    }


def _extract_json_from_text(text: str) -> dict[str, Any] | None:
    fenced = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    raw = fenced.group(1) if fenced else text.strip()
    try:
        return json.loads(raw)
    except Exception:
        return None


def _normalize_claims(raw_claims: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_claims, list):
        return []

    claims: list[dict[str, Any]] = []
    for item in raw_claims:
        if isinstance(item, str):
            claims.append(
                {
                    "claim_text": item,
                    "risk_score": 50,
                    "evidence_present": False,
                    "ai_explanation": "Mapped from text-only claim.",
                }
            )
            continue

        if not isinstance(item, dict):
            continue

        claim_text = item.get("claim_text") or item.get("claim") or item.get("text") or ""
        risk_score = item.get("risk_score") or item.get("risk") or item.get("score") or 50
        evidence_present = item.get("evidence_present")
        if evidence_present is None:
            evidence_present = bool(item.get("evidence") or item.get("supporting_evidence"))
        explanation = item.get("ai_explanation") or item.get("explanation") or ""

        if claim_text:
            claims.append(
                {
                    "claim_text": str(claim_text),
                    "risk_score": max(0, min(int(risk_score), 100)),
                    "evidence_present": bool(evidence_present),
                    "ai_explanation": str(explanation),
                }
            )

    return claims


def _parse_sarvam_payload(company: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    claims = (
        data.get("claims")
        or data.get("sustainability_claims")
        or data.get("extracted_claims")
        or []
    )

    if not claims and isinstance(data.get("choices"), list) and data["choices"]:
        content = (
            data["choices"][0].get("message", {}).get("content")
            or data["choices"][0].get("text")
            or ""
        )
        parsed = _extract_json_from_text(content)
        if parsed:
            data = parsed
            claims = parsed.get("claims") or parsed.get("sustainability_claims") or []

    norm_claims = _normalize_claims(claims)
    if not norm_claims:
        return None

    credibility_score = (
        data.get("credibility_score")
        or data.get("esg_credibility_score")
        or data.get("score")
    )
    if credibility_score is None:
        avg_risk = int(sum(c["risk_score"] for c in norm_claims) / len(norm_claims))
        credibility_score = max(0, 100 - avg_risk)

    contradiction_detected = data.get("contradiction_detected")
    if contradiction_detected is None:
        contradiction_detected = any(not c["evidence_present"] for c in norm_claims)

    ai_explanation = (
        data.get("ai_explanation")
        or data.get("summary")
        or data.get("explanation")
        or "External AI analysis completed."
    )

    return {
        "company": company,
        "credibility_score": max(0, min(int(credibility_score), 100)),
        "contradiction_detected": bool(contradiction_detected),
        "claims": norm_claims,
        "ai_explanation": str(ai_explanation),
    }


async def analyze_esg_text(company: str, report_text: str, source_language: str = "auto") -> dict[str, Any]:
    normalized_text = report_text

    if source_language and source_language.lower() not in {"", "auto", "en"}:
        normalized_text = await translate_to_english(report_text, source_language)

    # Local analysis path for MVP when external AI is not configured.
    if not settings.sarvam_api_key:
        result = _build_local_analysis(company, normalized_text)
        result["input_language"] = source_language
        return result

    # External AI call with graceful fallback to local parser.
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.sarvam_api_base.rstrip('/')}/v1/analyze",
                headers={"Authorization": f"Bearer {settings.sarvam_api_key}"},
                json={"company": company, "text": normalized_text},
            )
            response.raise_for_status()
            payload = response.json() if response.content else {}
    except Exception:
        result = _build_local_analysis(company, normalized_text)
        result["input_language"] = source_language
        return result

    parsed = _parse_sarvam_payload(company, payload if isinstance(payload, dict) else {})
    result = parsed or _build_local_analysis(company, normalized_text)
    result["input_language"] = source_language
    return result


async def translate_to_english(text: str, source_language: str = "auto") -> str:
    if not text.strip():
        return text

    if source_language.lower() in {"en", "auto", ""}:
        return text

    if not settings.sarvam_api_key:
        return text

    source_label = LANGUAGE_HINTS.get(source_language.lower(), source_language)
    prompt = (
        "Translate the following sustainability report text to English. "
        "Preserve numbers, percentages, years, and named entities exactly. "
        "Return only translated plain text.\n\n"
        f"Source language: {source_label}\n"
        f"Text:\n{text}"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.sarvam_api_base.rstrip('/')}/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.sarvam_api_key}"},
                json={
                    "model": "sarvam-m",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                },
            )
            response.raise_for_status()
            payload = response.json() if response.content else {}
    except Exception:
        return text

    choices = payload.get("choices") if isinstance(payload, dict) else None
    if not isinstance(choices, list) or not choices:
        return text

    content = choices[0].get("message", {}).get("content") or choices[0].get("text") or ""
    return content.strip() or text
