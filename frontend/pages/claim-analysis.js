import { useEffect, useMemo, useState } from "react";

import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import useAuthGuard from "../hooks/useAuthGuard";
import api from "../utils/api";

export default function ClaimAnalysisPage() {
  const authed = useAuthGuard();
  const [company, setCompany] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const claims = useMemo(() => report?.claims || [], [report]);

  const primaryClaim = useMemo(() => {
    if (!claims.length) return null;

    const currentYear = new Date().getFullYear();
    const presentKeywords = ["is", "are", "currently", "today", "now", "has", "have", "this year"];

    const scoreClaim = (claim) => {
      const text = `${claim?.claim_text || ""}`.toLowerCase();
      const risk = Number(claim?.risk_score || 50);
      let score = 0;

      if (presentKeywords.some((word) => text.includes(word))) score += 2;
      if ([currentYear - 1, currentYear, currentYear + 1].some((y) => text.includes(String(y)))) score += 3;
      if (["%", "co2", "emission", "renewable", "recycl", "waste", "water"].some((k) => text.includes(k))) score += 2;
      if (claim?.evidence_present) score += 2;
      score += Math.max(0, Math.min(100, risk)) / 20;

      return score;
    };

    return [...claims].sort((a, b) => scoreClaim(b) - scoreClaim(a))[0];
  }, [claims]);

  const focusedClaims = useMemo(() => (primaryClaim ? [primaryClaim] : []), [primaryClaim]);

  const getRiskTone = (score) => {
    if (score <= 30) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40";
    if (score <= 60) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40";
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40";
  };

  const claimSummary = useMemo(() => {
    const buckets = {
      "Carbon Emissions Reduction": 0,
      "Renewable Energy Usage": 0,
      "Recycling / Packaging": 0,
      "Sustainable Supply Chain": 0,
      "Other ESG Claims": 0,
    };

    focusedClaims.forEach((claim) => {
      const text = (claim.claim_text || "").toLowerCase();
      if (/emission|carbon|co2|net[- ]?zero/.test(text)) buckets["Carbon Emissions Reduction"] += 1;
      else if (/renewable|solar|wind|clean energy/.test(text)) buckets["Renewable Energy Usage"] += 1;
      else if (/recycl|packag|biodegrad|plastic|waste/.test(text)) buckets["Recycling / Packaging"] += 1;
      else if (/supply chain|supplier|sourcing|ethical/.test(text)) buckets["Sustainable Supply Chain"] += 1;
      else buckets["Other ESG Claims"] += 1;
    });

    return Object.entries(buckets).map(([type, count]) => ({ type, count }));
  }, [focusedClaims]);

  const evidenceRows = useMemo(() => {
    return focusedClaims.map((claim) => {
      const combined = `${claim.claim_text || ""} ${claim.ai_explanation || ""}`;
      const lower = combined.toLowerCase();
      const hasNumeric = /\d+%|\d+\.?\d*/.test(combined);
      const hasCert = /certif|iso|audit|third[- ]party|verified|assured/.test(lower);

      let evidenceType = "Not provided";
      if (hasNumeric) evidenceType = "Data / percentage";
      else if (hasCert) evidenceType = "Certification / assurance";
      else if (claim.evidence_present) evidenceType = "General reference";

      let evidenceFound = "No";
      if (claim.evidence_present && (hasNumeric || hasCert)) evidenceFound = "Yes";
      else if (claim.evidence_present) evidenceFound = "Partial";

      return {
        claimText: claim.claim_text || "Claim",
        evidenceFound,
        evidenceType,
      };
    });
  }, [focusedClaims]);

  const riskyStatements = useMemo(() => {
    return focusedClaims
      .map((claim) => {
        const text = claim.claim_text || "";
        const lower = text.toLowerCase();
        const reasons = [];

        if (!claim.evidence_present) reasons.push("no supporting evidence");
        if (!/\d+%|\d+\.?\d*/.test(text)) reasons.push("no measurable data");
        if (!/certif|iso|audit|verified|assured/.test(lower)) reasons.push("no certification mentioned");

        return {
          text,
          riskScore: typeof claim.risk_score === "number" ? claim.risk_score : claim.evidence_present ? 45 : 70,
          reasons: reasons.slice(0, 3),
        };
      })
      .filter((item) => item.riskScore >= 55 || item.reasons.length >= 2)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8);
  }, [focusedClaims]);

  const contradictionInsight = useMemo(() => {
    if (!focusedClaims.length) return { detected: false, topic: "N/A", impact: "N/A" };
    const hasReduce = focusedClaims.some((c) => /reduce|reduced|decrease|lower/.test((c.claim_text || "").toLowerCase()));
    const hasIncrease = focusedClaims.some((c) => /increase|increased|grew|higher/.test((c.claim_text || "").toLowerCase()));
    if (hasReduce && hasIncrease) return { detected: true, topic: "Directional performance claims", impact: "Medium" };
    return { detected: false, topic: "No direct contradiction", impact: "Low" };
  }, [focusedClaims]);

  const buzzwordFindings = useMemo(() => {
    const dictionary = ["eco-friendly", "green initiative", "sustainable practices", "environmentally responsible", "planet positive"];
    const hits = [];

    focusedClaims.forEach((claim) => {
      const text = (claim.claim_text || "").toLowerCase();
      dictionary.forEach((word) => {
        if (text.includes(word)) {
          hits.push({ phrase: word, note: "Needs measurable evidence to avoid greenwashing risk." });
        }
      });
    });

    return hits.slice(0, 10);
  }, [focusedClaims]);

  const loadCompanyReport = async (companyName) => {
    if (!companyName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/analysis/reports", {
        params: {
          company: companyName.trim(),
          exact: true,
          limit: 1,
        },
      });
      const latest = (res.data?.reports || [])[0] || null;
      setReport(latest);
      if (!latest) setError("No fetched ESG report found for this company yet. Fetch it from ESG Reports first.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load report for this company.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    const lastCompany = typeof window !== "undefined" ? localStorage.getItem("ecocred_last_company") || "" : "";
    setCompany(lastCompany);
    if (lastCompany) loadCompanyReport(lastCompany);
  }, [authed]);

  if (!authed) return null;

  return (
    <Layout
      pageTitle="ESG Claim Analysis"
      pageSubtitle="Company-specific claim extraction, evidence checks, and greenwashing risk flags"
      headerContent={
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-sm"
            placeholder="Enter exact company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <button className="btn-primary" type="button" onClick={() => loadCompanyReport(company)}>
            Load Claim Analysis
          </button>
        </div>
      }
      rightContent={<NewsSidebar news={[]} />}
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400 xl:col-span-12">Loading claim analysis...</p> : null}
        {error ? <p className="text-sm text-rose-600 dark:text-rose-300 xl:col-span-12">{error}</p> : null}

        <article className="card border-emerald-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 xl:col-span-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">ESG Claim Summary</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-[1fr_auto] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <span>Claim Type</span>
              <span>Count</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {claimSummary.map((item) => (
                <div key={item.type} className="grid grid-cols-[1fr_auto] px-3 py-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{item.type}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Main ESG Claim Displayed: {focusedClaims.length}</p>
        </article>

        <article className="card border-emerald-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 xl:col-span-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Evidence Verification Analysis</h2>
          <div className="mt-3 space-y-2">
            {evidenceRows.length ? (
              evidenceRows.map((row, idx) => (
                <div key={`${row.claimText}-${idx}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{row.claimText}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Evidence: {row.evidenceFound}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{row.evidenceType}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No claim rows to verify.</p>
            )}
          </div>
        </article>

        <article className="card border-emerald-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 xl:col-span-12">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Risky Statements, Contradictions, Buzzwords</h2>

          <div className="mt-3 space-y-2">
            {riskyStatements.length ? (
              riskyStatements.map((item, idx) => (
                <div key={`${item.text}-${idx}`} className={`rounded-xl border p-3 ${getRiskTone(item.riskScore)}`}>
                  <p className="text-sm font-semibold">{item.text}</p>
                  <p className="mt-1 text-xs">Risk score: {item.riskScore}</p>
                  <p className="text-xs">Reason: {item.reasons.join(", ") || "high claim risk"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No high-risk statements detected.</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Contradiction detected: {contradictionInsight.detected ? "Yes" : "No"}</p>
            <p className="text-slate-600 dark:text-slate-300">Topic: {contradictionInsight.topic}</p>
            <p className="text-slate-600 dark:text-slate-300">Impact: {contradictionInsight.impact}</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Buzzwords</p>
            {buzzwordFindings.length ? (
              <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                {buzzwordFindings.map((item, idx) => (
                  <li key={`${item.phrase}-${idx}`}>"{item.phrase}" - {item.note}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-600 dark:text-slate-300">No major buzzwords flagged.</p>
            )}
          </div>
        </article>
      </section>
    </Layout>
  );
}
