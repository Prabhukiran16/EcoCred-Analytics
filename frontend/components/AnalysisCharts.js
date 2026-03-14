import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler);

export default function AnalysisCharts({ credibilityScore = 0, claims = [], history = [] }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const doughnutData = {
    labels: ["Credibility", "Risk"],
    datasets: [
      {
        data: [credibilityScore, Math.max(0, 100 - credibilityScore)],
        backgroundColor: ["#0f9d7a", "#ff6b3d"],
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: claims.map((_, i) => `Claim ${i + 1}`),
    datasets: [
      {
        label: "Risk Score",
        data: claims.map((c) => c.risk_score || 0),
        backgroundColor: ["rgba(15,157,122,0.55)", "rgba(255,107,61,0.55)", "rgba(17,94,188,0.55)", "rgba(5,150,105,0.55)", "rgba(234,88,12,0.55)"],
        borderRadius: 8,
      },
    ],
  };

  const historyData = {
    labels: history.map((point) => `${point.year}`),
    datasets: [
      {
        label: "Credibility",
        data: history.map((point) => point.credibility_score || 0),
        borderColor: "#0f9d7a",
        backgroundColor: "rgba(15,157,122,0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Risk",
        data: history.map((point) => point.risk_score || 0),
        borderColor: "#ff6b3d",
        backgroundColor: "rgba(255,107,61,0.08)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: isDark ? "#cbd5e1" : "#0f172a", font: { weight: "600" } } },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: isDark ? "#94a3b8" : "#334155" },
        grid: { color: isDark ? "rgba(71,85,105,0.35)" : "rgba(148,163,184,0.18)" },
      },
      x: { ticks: { color: isDark ? "#94a3b8" : "#334155" }, grid: { display: false } },
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="card border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-slate-900 lg:col-span-1 xl:col-span-4">
        <h3 className="mb-3 text-sm font-bold text-ecoink dark:text-slate-100">Credibility vs Risk</h3>
        <div className="mx-auto h-56 max-w-xs">
          <Doughnut data={doughnutData} options={{ cutout: "70%" }} />
        </div>
      </div>

      <div className="card border-emerald-200 bg-white p-4 shadow-md dark:border-emerald-900/60 dark:bg-slate-900 lg:col-span-1 xl:col-span-4">
        <h3 className="mb-3 text-sm font-bold text-ecoink dark:text-slate-100">Claim Risk Distribution</h3>
        <div className="h-56">
          <Bar data={barData} options={chartOptions} />
        </div>
      </div>

      <div className="card border-emerald-200 bg-white p-4 shadow-md dark:border-emerald-900/60 dark:bg-slate-900 lg:col-span-1 xl:col-span-4">
        <h3 className="mb-3 text-sm font-bold text-ecoink dark:text-slate-100">Yearly ESG Trend</h3>
        <div className="h-56">
          {history.length ? (
            <Line data={historyData} options={chartOptions} />
          ) : (
            <p className="pt-16 text-center text-sm text-slate-500 dark:text-slate-400">Run analyses over time to unlock annual trend lines.</p>
          )}
        </div>
      </div>
    </div>
  );
}
