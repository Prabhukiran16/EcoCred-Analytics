import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import Layout from "../../components/Layout";
import NewsSidebar from "../../components/NewsSidebar";
import useAuthGuard from "../../hooks/useAuthGuard";
import api from "../../utils/api";

export default function ReportDetailPage() {
  const authed = useAuthGuard();
  const router = useRouter();
  const { reportId } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getRiskTone = (score) => {
    if (score <= 30) {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    }
    if (score <= 60) {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    }
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  };

  useEffect(() => {
    if (!authed || !reportId) return;

    const loadReport = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/analysis/reports/${reportId}`);
        setReport(res.data.report || null);
      } catch (err) {
        setError(err?.response?.data?.detail || "Unable to load report details.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [authed, reportId]);

  if (!authed) return null;

  return (
    <Layout
      pageTitle="Report Detail"
      pageSubtitle="Read the full ESG report text, extracted claims, and audit context"
      headerContent={<p className="text-sm text-slate-600 dark:text-slate-300">Detailed ESG report record</p>}
      rightContent={<NewsSidebar news={[]} />}
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Report Detail</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Read the full stored ESG text and all saved claim data.</p>
          </div>
          <Link href="/reports" className="btn-secondary">
            Back to Reports
          </Link>
        </div>

        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading report...</p> : null}
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        {report ? (
          <article className="card border-emerald-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{report.company || "Unknown company"}</h3>
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

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={`rounded-2xl p-4 ${getRiskTone(report.risk_score || 0)}`}>
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Risk Score</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{report.risk_score || 0}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Claims</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{report.claims_count || report.claims?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Created</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{report.created_at ? new Date(report.created_at).toLocaleString() : "Unknown"}</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">AI Explanation</p>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">{report.ai_explanation || "No explanation saved."}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Claims</p>
                <div className="mt-2 space-y-3">
                  {(report.claims || []).length ? (
                    report.claims.map((claim, index) => (
                      <div key={`${report._id}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{claim.claim_text || "Claim"}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{claim.ai_explanation || "No explanation."}</p>
                        <p className={`mt-2 inline-block rounded px-2 py-1 text-xs font-semibold ${getRiskTone(claim.risk_score || 0)}`}>Risk score: {claim.risk_score || 0}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No claims saved for this report.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Full Report Text</p>
                <div className="mt-2 rounded-2xl border border-emerald-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">{report.report_text || "No report text available."}</p>
                </div>
              </div>
            </div>
          </article>
        ) : null}
      </section>
    </Layout>
  );
}