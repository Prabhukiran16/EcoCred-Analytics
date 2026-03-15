import { AlertTriangle, Mic } from "lucide-react";
import { useMemo, useState } from "react";

import AnalysisCharts from "../components/AnalysisCharts";
import CommentsDrawer from "../components/CommentsDrawer";
import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import PostCard from "../components/PostCard";
import useAuthGuard from "../hooks/useAuthGuard";
import api from "../utils/api";

export default function DashboardPage() {
  const authed = useAuthGuard();

  const [company, setCompany] = useState("");
  const [product, setProduct] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [posts, setPosts] = useState([]);
  const [news, setNews] = useState([]);
  const [newsMessage, setNewsMessage] = useState("Search a company to load news.");
  const [newsStatus, setNewsStatus] = useState("idle");
  const [latestCompanyReport, setLatestCompanyReport] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");
  const [isCompanyListening, setIsCompanyListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertPhone, setAlertPhone] = useState("");
  const [smsStatus, setSmsStatus] = useState("");

  const [activeCommentsPost, setActiveCommentsPost] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const claims = useMemo(() => analysis?.claims || [], [analysis]);

  const riskScore = useMemo(() => {
    if (!analysis) return 0;
    if (typeof analysis.risk_score === "number") return Math.max(0, Math.min(100, analysis.risk_score));
    return Math.max(0, Math.min(100, 100 - (analysis.credibility_score || 0)));
  }, [analysis]);

  const riskLevel = useMemo(() => {
    if (riskScore <= 30) return "Low Risk";
    if (riskScore <= 60) return "Moderate Risk";
    return "High Risk";
  }, [riskScore]);

  const getRiskTone = (score) => {
    if (score <= 30) {
      return {
        pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        soft: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300",
      };
    }
    if (score <= 60) {
      return {
        pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        soft: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300",
      };
    }
    return {
      pill: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      soft: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300",
    };
  };

  const companyPosts = useMemo(() => {
    if (!company.trim()) return [];
    return posts;
  }, [posts, company]);

  const overview = useMemo(() => {
    const reportTextSource = (latestCompanyReport?.report_text || "").trim();
    const combined = `${company} ${product} ${latestCompanyReport?.company || ""} ${reportTextSource}`.toLowerCase();
    let industry = "General Consumer";
    if (/pack|bottle|plastic|food|beverage/.test(combined)) industry = "Consumer Packaging";
    if (/energy|power|solar|wind|oil|gas/.test(combined)) industry = "Energy";
    if (/tech|software|cloud|ai|data/.test(combined)) industry = "Technology";
    if (/bank|finance|insurance|loan/.test(combined)) industry = "Financial Services";

    const source = latestCompanyReport?.file_url
      ? latestCompanyReport.file_url
      : latestCompanyReport?.source_website
      ? latestCompanyReport.source_website
      : "No ESG source file linked";

    const words = reportTextSource ? reportTextSource.split(/\s+/).length : 0;
    const estimatedPages = words ? Math.max(1, Math.round(words / 450)) : claims.length ? Math.max(1, Math.ceil(claims.length / 2)) : 1;

    const primaryClaimText = `${claims[0]?.claim_text || ""}`.toLowerCase();
    let productFocus = "Not explicitly specified in ESG file";
    if (/packag|plastic|bottle|recycl/.test(primaryClaimText)) productFocus = "Packaging and recycling initiatives";
    else if (/energy|renewable|solar|wind|electric/.test(primaryClaimText)) productFocus = "Energy and emissions initiatives";
    else if (/supply chain|supplier|sourcing/.test(primaryClaimText)) productFocus = "Supply chain and sourcing practices";

    const reportYearValue = latestCompanyReport?.report_year || reportYear;

    return { industry, source, estimatedPages, productFocus, reportYearValue };
  }, [company, product, claims, latestCompanyReport, reportYear]);

  const claimSummary = useMemo(() => {
    const buckets = {
      "Carbon Emissions Reduction": 0,
      "Renewable Energy Usage": 0,
      "Recycling / Packaging": 0,
      "Sustainable Supply Chain": 0,
      "Other ESG Claims": 0,
    };

    claims.forEach((claim) => {
      const text = (claim.claim_text || "").toLowerCase();
      if (/emission|carbon|co2|net[- ]?zero/.test(text)) buckets["Carbon Emissions Reduction"] += 1;
      else if (/renewable|solar|wind|clean energy/.test(text)) buckets["Renewable Energy Usage"] += 1;
      else if (/recycl|packag|biodegrad|plastic|waste/.test(text)) buckets["Recycling / Packaging"] += 1;
      else if (/supply chain|supplier|sourcing|ethical/.test(text)) buckets["Sustainable Supply Chain"] += 1;
      else buckets["Other ESG Claims"] += 1;
    });

    return Object.entries(buckets).map(([type, count]) => ({ type, count }));
  }, [claims]);

  const evidenceRows = useMemo(
    () =>
      claims.map((claim) => {
        const combined = `${claim.claim_text || ""} ${claim.ai_explanation || ""}`;
        const lower = combined.toLowerCase();
        const hasNumeric = /\d+%|\d+\.?\d*/.test(combined);
        const hasCert = /certif|iso|audit|third[- ]party/.test(lower);
        const hasStudy = /study|research|scientific|peer/.test(lower);

        let evidenceType = "Not provided";
        if (hasNumeric) evidenceType = "Data / percentage";
        else if (hasCert) evidenceType = "Certification / audit";
        else if (hasStudy) evidenceType = "Scientific reference";
        else if (claim.evidence_present) evidenceType = "General reference";

        let evidenceFound = "No";
        if (claim.evidence_present && (hasNumeric || hasCert || hasStudy)) evidenceFound = "Yes";
        else if (claim.evidence_present) evidenceFound = "Partial";

        return {
          claimText: claim.claim_text || "Claim",
          evidenceFound,
          evidenceType,
        };
      }),
    [claims]
  );

  const riskyStatements = useMemo(() => {
    const buzzwords = ["eco-friendly", "green initiative", "sustainable practices", "environmentally responsible", "fully environmentally friendly"];
    return claims
      .map((claim) => {
        const text = claim.claim_text || "";
        const lower = text.toLowerCase();
        const reasons = [];
        if (buzzwords.some((word) => lower.includes(word))) reasons.push("vague language");
        if (!claim.evidence_present) reasons.push("no supporting evidence");
        if (!/\d+%|\d+\.?\d*/.test(text)) reasons.push("no measurable data");
        if (!/certif|iso|audit/.test(lower)) reasons.push("no certification mentioned");

        return {
          text,
          riskScore: typeof claim.risk_score === "number" ? claim.risk_score : claim.evidence_present ? 45 : 70,
          reasons: reasons.slice(0, 3),
        };
      })
      .filter((item) => item.riskScore >= 55 || item.reasons.length >= 2)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [claims]);

  const contradictionInsight = useMemo(() => {
    if (!analysis) return { detected: false, topic: "N/A", impact: "N/A" };
    if (analysis.contradiction_detected) return { detected: true, topic: "Cross-claim consistency", impact: riskScore > 70 ? "High" : "Medium" };

    const hasReduce = claims.some((c) => /reduce|reduced|decrease|lower/.test((c.claim_text || "").toLowerCase()));
    const hasIncrease = claims.some((c) => /increase|increased|grew|higher/.test((c.claim_text || "").toLowerCase()));
    if (hasReduce && hasIncrease) return { detected: true, topic: "Directional performance claims", impact: "Medium" };
    return { detected: false, topic: "No direct contradiction", impact: "Low" };
  }, [analysis, claims, riskScore]);

  const buzzwordFindings = useMemo(() => {
    const dictionary = ["eco-friendly", "green initiative", "sustainable practices", "environmentally responsible", "planet positive"];
    const hits = [];
    claims.forEach((claim) => {
      const text = (claim.claim_text || "").toLowerCase();
      dictionary.forEach((word) => {
        if (text.includes(word)) {
          hits.push({ phrase: word, note: "No supporting technical details provided." });
        }
      });
    });
    return hits.slice(0, 5);
  }, [claims]);

  const esgBreakdown = useMemo(() => {
    const buckets = { Environmental: [], Social: [], Governance: [] };
    claims.forEach((claim) => {
      const text = (claim.claim_text || "").toLowerCase();
      const score = typeof claim.risk_score === "number" ? claim.risk_score : 50;
      if (/emission|waste|packag|energy|plastic|recycl|carbon/.test(text)) buckets.Environmental.push(score);
      else if (/worker|employee|safety|community|labor|diversity/.test(text)) buckets.Social.push(score);
      else buckets.Governance.push(score);
    });

    return Object.entries(buckets).map(([category, values]) => ({
      category,
      riskScore: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
    }));
  }, [claims]);

  const communityInsights = useMemo(() => {
    const reportsSubmitted = companyPosts.length;
    const upvotes = companyPosts.reduce((sum, post) => sum + (post.upvotes || 0), 0);
    const downvotes = companyPosts.reduce((sum, post) => sum + (post.downvotes || 0), 0);
    const complaints = companyPosts.filter((post) => {
      const text = `${post.description || ""}`.toLowerCase();
      return (post.downvotes || 0) > (post.upvotes || 0) || /did not|failed|false|not true|mislead|complaint/.test(text);
    }).length;
    return { reportsSubmitted, upvotes, downvotes, complaints };
  }, [companyPosts]);

  const credibilityRanking = useMemo(
    () =>
      claims
        .map((claim) => {
          const score = typeof claim.risk_score === "number" ? claim.risk_score : claim.evidence_present ? 45 : 70;
          let credibility = "Low";
          if (score < 35 && claim.evidence_present) credibility = "High";
          else if (score <= 60 || claim.evidence_present) credibility = "Medium";
          return { text: claim.claim_text || "Claim", credibility, score };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 8),
    [claims]
  );

  const transparency = useMemo(() => {
    if (!claims.length) return 0;
    const metrics = claims.filter((c) => /\d+%|\d+\.?\d*/.test(`${c.claim_text || ""} ${c.ai_explanation || ""}`)).length;
    const certs = claims.filter((c) => /certif|iso|audit|third[- ]party/.test(`${c.claim_text || ""} ${c.ai_explanation || ""}`.toLowerCase())).length;
    const timeline = claims.filter((c) => /20\d\d|year|timeline|by 20/.test(`${c.claim_text || ""} ${c.ai_explanation || ""}`.toLowerCase())).length;
    const consistency = contradictionInsight.detected ? 45 : 85;

    const metricsPct = Math.round((metrics / claims.length) * 100);
    const certPct = Math.round((certs / claims.length) * 100);
    const timelinePct = Math.round((timeline / claims.length) * 100);
    return Math.round(metricsPct * 0.35 + certPct * 0.25 + timelinePct * 0.2 + consistency * 0.2);
  }, [claims, contradictionInsight]);

  const comparisonMetrics = useMemo(() => {
    const highRiskClaims = claims.filter((claim) => (claim.risk_score || 0) > 60).length;
    const evidenceSupportedClaims = claims.filter((claim) => claim.evidence_present).length;
    return {
      totalClaims: claims.length,
      highRiskClaims,
      evidenceSupportedClaims,
      userComplaints: communityInsights.complaints,
      greenwashingRiskScore: riskScore,
    };
  }, [claims, communityInsights, riskScore]);

  const contributingFactors = useMemo(
    () => ({
      unsupportedClaims: claims.filter((claim) => !claim.evidence_present).length,
      vagueLanguage: buzzwordFindings.length,
      contradictoryStatements: contradictionInsight.detected ? 1 : 0,
      negativeUserReports: communityInsights.complaints,
    }),
    [claims, buzzwordFindings, contradictionInsight, communityInsights]
  );

  const auditSummary = useMemo(() => {
    if (!analysis) return "Run analysis to generate the ESG audit summary.";
    const worst = [...esgBreakdown].sort((a, b) => b.riskScore - a.riskScore)[0];
    return `The company makes ${claims.length} sustainability claims with an overall greenwashing risk score of ${riskScore}. The highest concern appears in ${worst?.category || "Environmental"} risk, while transparency is estimated at ${transparency}%. Community complaints recorded: ${communityInsights.complaints}.`;
  }, [analysis, claims, riskScore, esgBreakdown, transparency, communityInsights]);

  const languageToSpeechTag = {
    en: "en-US",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    bn: "bn-IN",
    mr: "mr-IN",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    auto: "en-US",
  };

  const search = async () => {
    if (!company.trim()) return;

    setLoading(true);
    setError("");
    setSmsStatus("");
    try {
      const analysisPromise = api.post("/analysis/fetch-report-from-website", {
        company,
        source_language: sourceLanguage,
        force_refresh: false,
      });

      const [analysisRes, latestReportsRes, newsRes, postsRes, historyRes] = await Promise.allSettled([
        analysisPromise,
        api.get("/analysis/reports", { params: { company, exact: true, limit: 1 } }),
        api.get("/news/company", { params: { company } }),
        api.get("/posts/feed", { params: { company } }),
        api.get("/analysis/history", { params: { company, years: 7 } }),
      ]);

      let analysisData = null;
      const latestSavedReport = latestReportsRes.status === "fulfilled" ? (latestReportsRes.value.data?.reports || [])[0] || null : null;
      setLatestCompanyReport(latestSavedReport);

      if (analysisRes.status === "fulfilled") {
        const fetchedReport = analysisRes.value.data?.report;
        if (fetchedReport) {
          setLatestCompanyReport(fetchedReport);
          analysisData = {
            company: fetchedReport.company,
            credibility_score: fetchedReport.credibility_score || 0,
            risk_score: fetchedReport.risk_score,
            claims: fetchedReport.claims || [],
            ai_explanation: fetchedReport.ai_explanation || analysisRes.value.data?.message || "",
            contradiction_detected: (fetchedReport.claims || []).some((claim) => !claim.evidence_present),
          };
        }
      }

      if (!analysisData && latestSavedReport) {
        const latest = latestSavedReport;
        if (latest) {
          analysisData = {
            company: latest.company,
            credibility_score: latest.credibility_score || 0,
            risk_score: latest.risk_score,
            claims: latest.claims || [],
            ai_explanation: latest.ai_explanation || "",
            contradiction_detected: (latest.claims || []).some((claim) => !claim.evidence_present),
          };
        }
      }

      if (!analysisData) {
        throw new Error("Could not load ESG analysis for this company.");
      }

      if (!["", "auto", "en"].includes((sourceLanguage || "").toLowerCase())) {
        try {
          const translated = await api.post("/analysis/translate-content", {
            target_language: sourceLanguage,
            ai_explanation: analysisData.ai_explanation || "",
            claims: analysisData.claims || [],
          });
          analysisData = {
            ...analysisData,
            ai_explanation: translated.data?.ai_explanation || analysisData.ai_explanation,
            claims: translated.data?.claims || analysisData.claims,
          };
        } catch {
          // Keep original analysis content if translation service is unavailable.
        }
      }

      setAnalysis(analysisData);

      if (newsRes.status === "fulfilled") {
        setNews(newsRes.value.data.news || []);
        setNewsStatus(newsRes.value.data.status || "ok");
        setNewsMessage(newsRes.value.data.message || "Recent environmental headlines for this company.");
      } else {
        setNews([]);
        setNewsStatus("warning");
        setNewsMessage("News could not be loaded right now. The rest of the analysis is still available.");
      }

      setPosts(postsRes.status === "fulfilled" ? postsRes.value.data.posts || [] : []);
      setHistory(historyRes.status === "fulfilled" ? historyRes.value.data.history || [] : []);

      const normalizedRisk = typeof analysisData?.risk_score === "number"
        ? Math.max(0, Math.min(100, analysisData.risk_score))
        : Math.max(0, Math.min(100, 100 - (analysisData?.credibility_score || 0)));

      if (normalizedRisk > 50) {
        if (alertPhone.trim()) {
          try {
            const smsRes = await api.post("/analysis/notify-risk", {
              phone_number: alertPhone.trim(),
              company,
              product,
              risk_score: normalizedRisk,
              summary: analysisData?.ai_explanation || "",
            });
            setSmsStatus(smsRes.data?.message || "Risk alert SMS sent");
          } catch (smsErr) {
            setSmsStatus(smsErr?.response?.data?.detail || "Risk is high but SMS could not be sent.");
          }
        } else {
          setSmsStatus("Risk is above 50. Add an alert phone number in Advanced settings to receive SMS.");
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("ecocred_last_company", company);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Analysis failed. Please try again.");
      setLatestCompanyReport(null);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!SpeechRecognition) {
      window.alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageToSpeechTag[sourceLanguage] || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsCompanyListening(true);
    recognition.onend = () => setIsCompanyListening(false);
    recognition.onerror = () => setIsCompanyListening(false);
    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      setCompany(transcript.trim());
    };

    recognition.start();
  };

  const speakAnalysis = () => {
    if (typeof window === "undefined" || !analysis?.ai_explanation) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(analysis.ai_explanation);
    utter.lang = languageToSpeechTag[sourceLanguage] || "en-US";
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  };

  const vote = async (type, postId) => {
    await api.post(`/posts/${type}`, { post_id: postId });
    const res = await api.get("/posts/feed", { params: { company } });
    setPosts(res.data.posts || []);
  };

  const fetchCommentsForPost = async (postId) => {
    const commentsRes = await api.get(`/comments/${postId}`);
    setCommentsByPost((prev) => ({ ...prev, [postId]: commentsRes.data.comments || [] }));
  };

  const openComments = async (postId) => {
    setCommentsLoading(true);
    await fetchCommentsForPost(postId);
    setActiveCommentsPost(companyPosts.find((post) => post._id === postId) || null);
    setCommentsLoading(false);
  };

  const onComment = async (postId) => {
    await openComments(postId);
  };

  const submitComment = async (postId, text) => {
    const user = JSON.parse(localStorage.getItem("ecocred_user") || "{}");
    if (!text || !user._id) return false;

    setCommentSubmitting(true);
    try {
      await api.post("/posts/comment", {
        post_id: postId,
        user_id: user._id,
        text,
      });

      const res = await api.get("/posts/feed", { params: { company } });
      const nextPosts = res.data.posts || [];
      setPosts(nextPosts);
      await fetchCommentsForPost(postId);
      setActiveCommentsPost(nextPosts.find((post) => post._id === postId) || null);
      return true;
    } catch {
      return false;
    } finally {
      setCommentSubmitting(false);
    }
  };

  const toggleComments = async (postId) => {
    if (activeCommentsPost?._id === postId) {
      setActiveCommentsPost(null);
      return;
    }
    await openComments(postId);
  };

  const headerContent = (
    <div className="space-y-2">
      <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
        <div className="relative">
          <input className="input pr-10" placeholder="Search company name" value={company} onChange={(e) => setCompany(e.target.value)} />
          <button
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300"
            onClick={startVoiceInput}
            type="button"
            title={isCompanyListening ? "Listening..." : "Speak company name"}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <input className="input" placeholder="Search product name" value={product} onChange={(e) => setProduct(e.target.value)} />
        <select className="input" value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="te">Telugu</option>
          <option value="ta">Tamil</option>
          <option value="bn">Bengali</option>
          <option value="mr">Marathi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="auto">Auto Detect</option>
        </select>
        <input
          className="input"
          type="tel"
          value={alertPhone}
          onChange={(e) => setAlertPhone(e.target.value)}
          placeholder="Alert phone (+91...)"
        />
        <button className="btn-primary" onClick={search}>
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
        <input
          className="input"
          type="number"
          min="2000"
          max="2100"
          value={reportYear}
          onChange={(e) => setReportYear(Number(e.target.value || new Date().getFullYear()))}
          placeholder="Year"
        />
      </div>
    </div>
  );

  if (!authed) return null;

  return (
    <Layout headerContent={headerContent} rightContent={<NewsSidebar news={news} status={newsStatus} message={newsMessage} />}>
      <section className="card border-emerald-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">ESG Greenwashing Audit Dashboard</h2>
          <div className="flex items-center gap-2">
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Credibility {analysis?.credibility_score || 0}
            </p>
            <p className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskTone(riskScore).pill}`}>
              Risk Score {riskScore} / 100 ({riskLevel})
            </p>
          </div>
        </div>

        {analysis && riskScore > 50 ? (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-semibold">Risk alert: this company crossed the risk threshold of 50. Review risky claims, missing evidence, and community complaints before trusting sustainability statements.</p>
          </div>
        ) : null}

        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Company & Product Overview</p>
            <button className="btn-secondary" type="button" onClick={speakAnalysis}>
              Read AI Summary
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-5">
            <p className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">Company:</span> <span className="font-semibold">{latestCompanyReport?.company || company || "Not set"}</span></p>
            <p className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">Product / focus:</span> <span className="font-semibold">{overview.productFocus}</span></p>
            <p className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">Industry:</span> <span className="font-semibold">{overview.industry}</span></p>
            <p className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">ESG report year:</span> <span className="font-semibold">{overview.reportYearValue || "Unknown"}</span></p>
            <p className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">Pages analyzed:</span> <span className="font-semibold">~{overview.estimatedPages}</span></p>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Source of ESG report: {overview.source}</p>
        </div>

        <div className="mb-4 rounded-2xl border border-emerald-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Overall Greenwashing Risk Score</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-5">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Unsupported claims: <span className="font-bold">{contributingFactors.unsupportedClaims}</span></p>
            <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Vague language: <span className="font-bold">{contributingFactors.vagueLanguage}</span></p>
            <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Contradictions: <span className="font-bold">{contributingFactors.contradictoryStatements}</span></p>
            <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Negative user reports: <span className="font-bold">{contributingFactors.negativeUserReports}</span></p>
            <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Interpretation: <span className="font-bold">{riskLevel}</span></p>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Risk bands: Low 0-30, Moderate 31-60, High 61-100.</p>
        </div>

        <p className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">ESG Graph Highlights and Category Risk</p>
        <AnalysisCharts credibilityScore={analysis?.credibility_score || 0} claims={claims} history={history} />

        {smsStatus ? <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{smsStatus}</p> : null}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 xl:col-span-2">
            <h3 className="mb-2 font-bold text-slate-900 dark:text-slate-100">Community, Credibility, Transparency, Comparison</h3>
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Reports: <span className="font-bold">{communityInsights.reportsSubmitted}</span></p>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Upvotes: <span className="font-bold">{communityInsights.upvotes}</span></p>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Downvotes: <span className="font-bold">{communityInsights.downvotes}</span></p>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Complaints: <span className="font-bold">{communityInsights.complaints}</span></p>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold">ESG Category Risk Breakdown</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                {esgBreakdown.map((item) => (
                  <p key={item.category} className={`rounded-lg border px-2 py-1 ${getRiskTone(item.riskScore).soft}`}>{item.category}: <span className="font-bold">{item.riskScore}</span></p>
                ))}
              </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold">Claim Credibility Ranking</p>
              <div className="mt-1 max-h-36 overflow-auto space-y-1 text-xs">
                {credibilityRanking.length ? credibilityRanking.map((item, idx) => <p key={`${item.text}-${idx}`}>{item.text} - <span className="font-bold">{item.credibility}</span></p>) : <p>No ranking available.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="font-semibold">Transparency Score: {transparency}%</p>
              <p className="text-xs mt-1">Strength: detailed metrics and consistency.</p>
              <p className="text-xs">Weakness: unsupported claims and low certification detail.</p>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
              <p className="font-semibold text-sm">Comparison Ready Metrics</p>
              <p>Claims Detected: {comparisonMetrics.totalClaims}</p>
              <p>
                High Risk Claims: <span className={comparisonMetrics.highRiskClaims > 0 ? "font-bold text-rose-600 dark:text-rose-300" : "font-bold text-emerald-600 dark:text-emerald-300"}>{comparisonMetrics.highRiskClaims}</span>
              </p>
              <p>Evidence Supported Claims: {comparisonMetrics.evidenceSupportedClaims}</p>
              <p>User Complaints: {comparisonMetrics.userComplaints}</p>
              <p>Greenwashing Risk Score: <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${getRiskTone(comparisonMetrics.greenwashingRiskScore).pill}`}>{comparisonMetrics.greenwashingRiskScore}</span></p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-2 font-bold text-slate-900 dark:text-slate-100">AI Generated Audit Summary</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">{auditSummary}</p>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {companyPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onUpvote={(id) => vote("upvote", id)}
              onDownvote={(id) => vote("downvote", id)}
              onComment={onComment}
              showComments={activeCommentsPost?._id === post._id}
              onToggleComments={toggleComments}
            />
          ))}
        </div>
      </section>

      <CommentsDrawer
        open={!!activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
        post={activeCommentsPost}
        comments={activeCommentsPost ? commentsByPost[activeCommentsPost._id] || [] : []}
        loading={commentsLoading}
        onSubmitComment={submitComment}
        submitting={commentSubmitting}
      />
    </Layout>
  );
}
