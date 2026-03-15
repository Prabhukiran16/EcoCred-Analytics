import { useEffect, useState } from "react";
import Link from "next/link";

import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import useAuthGuard from "../hooks/useAuthGuard";
import api from "../utils/api";

export default function ReportsPage() {
  const authed = useAuthGuard();
  const [reports, setReports] = useState([]);
  const [company, setCompany] = useState("");
  const [alertPhone, setAlertPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingFromWebsite, setFetchingFromWebsite] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");
  const [fetchError, setFetchError] = useState("");

  const getRiskTone = (score) => {
    if (score <= 30) {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    }
    if (score <= 60) {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    }
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  };

  const loadReports = async (companyFilter = "", exact = true) => {
    setLoading(true);
    try {
      const trimmedCompany = companyFilter.trim();
      const limit = trimmedCompany && exact ? 1 : 24;
      const res = await api.get("/analysis/reports", { params: { company: companyFilter, exact, limit } });
      setReports(res.data.reports || []);
      setFetchError("");
    } catch (err) {
      setReports([]);
      setFetchError(err?.response?.data?.detail || "Could not load reports. Check that backend is running on port 8001.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFromCompanyWebsite = async () => {
    const companyName = company.trim();
    if (!companyName) {
      setFetchError("Enter a company name to fetch ESG file from its website.");
      return;
    }

    setFetchStatus("");
    setFetchError("");
    setFetchingFromWebsite(true);
    try {
      const res = await api.post("/analysis/fetch-report-from-website", {
        company: companyName,
        phone_number: alertPhone.trim(),
      });
      const mainMsg = res.data?.message || "ESG report fetched and analyzed.";
      const smsMsg = res.data?.sms?.message ? ` ${res.data.sms.message}` : "";
      setFetchStatus(`${mainMsg}${smsMsg}`.trim());
      await loadReports(companyName, true);
    } catch (err) {
      setFetchError(err?.response?.data?.detail || "Could not fetch ESG file from company website.");
    } finally {
      setFetchingFromWebsite(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    const lastCompany = typeof window !== "undefined" ? localStorage.getItem("ecocred_last_company") || "" : "";
    setCompany(lastCompany);
    loadReports(lastCompany, true);
  }, [authed]);

  if (!authed) return null;

  return (
    <Layout
      pageTitle="ESG Reports"
      pageSubtitle="Browse saved analyses, extracted claims, and full report text"
      headerContent={
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-sm"
            placeholder="Filter by company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            className="input max-w-xs"
            placeholder="Alert phone (+91...)"
            value={alertPhone}
            onChange={(e) => setAlertPhone(e.target.value)}
          />
          <button className="btn-primary" type="button" onClick={() => loadReports(company)}>
            Search Reports
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={fetchFromCompanyWebsite}
            disabled={fetchingFromWebsite}
          >
            {fetchingFromWebsite ? "Fetching ESG File..." : "Fetch ESG File From Website"}
          </button>
        </div>
      }
      rightContent={<NewsSidebar news={[]} />}
    >
      <section className="space-y-4">
        <div className="card border-emerald-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Saved ESG Reports</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This view shows actual analyses saved by EcoCred, including the extracted text, AI summary, score, and claims count.
          </p>
          {fetchStatus ? <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{fetchStatus}</p> : null}
          {fetchError ? <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{fetchError}</p> : null}
        </div>

        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading reports...</p> : null}
        {!loading && reports.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No saved ESG reports found.</p> : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <article key={report._id} className="card border-emerald-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{report.company || "Unknown company"}</h3>
                  <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {report.report_year || "No year"} • {report.source_language || "auto"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Score {report.credibility_score || 0}
                  </div>
                  <div className={`rounded-full px-3 py-1 text-sm font-semibold ${getRiskTone(report.risk_score || 0)}`}>
                    Risk {report.risk_score || 0}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-emerald-50 p-3 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Claims</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">{report.claims_count || 0}</p>
                </div>
                <div className={`rounded-xl p-3 ${getRiskTone(report.risk_score || 0)}`}>
                  <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Risk</p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">{report.risk_score || 0}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">AI Explanation</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{report.ai_explanation || "No AI explanation saved."}</p>
                </div>
                {report.file_url || report.source_website ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Source</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {report.file_url ? (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
                        >
                          Open Source PDF
                        </a>
                      ) : null}
                      {report.source_website ? (
                        <a
                          href={report.source_website}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                        >
                          Company Website
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Report Text</p>
                  <p className="mt-1 line-clamp-6 text-sm text-slate-600 dark:text-slate-300">{report.report_text || "No report text available."}</p>
                </div>
              </div>

              <div className="mt-4">
                {report.file_url ? (
                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary inline-flex items-center"
                  >
                    Open Full Report
                  </a>
                ) : (
                  <Link href={`/reports/${report._id}`} className="btn-secondary inline-flex items-center">
                    Open Full Report
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}