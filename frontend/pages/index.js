import { useMemo, useState } from "react";

import AnalysisCharts from "../components/AnalysisCharts";
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
  const [posts, setPosts] = useState([]);
  const [news, setNews] = useState([]);
  const [reportFile, setReportFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const topPosts = useMemo(() => posts.slice(0, 3), [posts]);

  const search = async () => {
    if (!company.trim()) return;

    setLoading(true);
    try {
      const analysisPromise = reportFile
        ? (() => {
            const form = new FormData();
            form.append("company", company);
            form.append("report_file", reportFile);
            return api.post("/analysis/company/upload", form, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          })()
        : api.get("/analysis/company", { params: { company } });

      const [analysisRes, newsRes, postsRes] = await Promise.all([
        analysisPromise,
        api.get("/news/company", { params: { company } }),
        api.get("/posts/feed"),
      ]);
      setAnalysis(analysisRes.data);
      setNews(newsRes.data.news || []);
      setPosts(postsRes.data.posts || []);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (type, postId) => {
    await api.post(`/posts/${type}`, { post_id: postId });
    const res = await api.get("/posts/feed");
    setPosts(res.data.posts || []);
  };

  const onComment = async (postId) => {
    const text = window.prompt("Write a comment");
    const user = JSON.parse(localStorage.getItem("ecocred_user") || "{}");
    if (!text || !user._id) return;

    await api.post("/posts/comment", {
      post_id: postId,
      user_id: user._id,
      text,
    });

    const res = await api.get("/posts/feed");
    setPosts(res.data.posts || []);
  };

  const headerContent = (
    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-6">
      <input
        className="input md:col-span-2"
        placeholder="Search company name"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        className="input md:col-span-2"
        placeholder="Search product name"
        value={product}
        onChange={(e) => setProduct(e.target.value)}
      />
      <input type="file" accept=".pdf" className="input md:col-span-1" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
      <button className="btn-primary md:col-span-1" onClick={search}>
        {loading ? "Analyzing..." : "Run Analysis"}
      </button>
    </div>
  );

  if (!authed) return null;

  return (
    <Layout headerContent={headerContent} rightContent={<NewsSidebar news={news} />}>
      <section className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ecoink">AI Analysis</h2>
          <p className="rounded-full bg-ecobg px-3 py-1 text-xs font-semibold text-ecoink">
            {analysis ? `ESG Credibility: ${analysis.credibility_score}` : "No analysis yet"}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-teal-100 bg-white p-4">
            <h3 className="mb-2 font-bold text-ecoink">Extracted Claims</h3>
            <ul className="space-y-2 text-sm">
              {(analysis?.claims || []).map((claim, idx) => (
                <li key={idx} className="rounded-lg bg-ecobg p-2">
                  <p className="font-semibold">{claim.claim_text}</p>
                  <p className="text-xs text-slate-600">{claim.ai_explanation}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-white p-4">
            <h3 className="mb-2 font-bold text-ecoink">AI Explanation</h3>
            <p className="text-sm text-slate-700">{analysis?.ai_explanation || "Run company analysis to view details."}</p>
            <p className="mt-3 text-sm font-semibold text-ecoblue">
              Contradiction detection: {analysis?.contradiction_detected ? "Potential contradiction found" : "No contradiction detected"}
            </p>
          </div>
        </div>

        <AnalysisCharts credibilityScore={analysis?.credibility_score || 0} claims={analysis?.claims || []} />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-lg font-extrabold text-ecoink">Community Reports</h2>
        {topPosts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onUpvote={(id) => vote("upvote", id)}
            onDownvote={(id) => vote("downvote", id)}
            onComment={onComment}
          />
        ))}
      </section>
    </Layout>
  );
}
