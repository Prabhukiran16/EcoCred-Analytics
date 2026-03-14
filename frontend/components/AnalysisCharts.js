import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AnalysisCharts({ credibilityScore = 0, claims = [] }) {
  const doughnutData = {
    labels: ["Credibility", "Risk"],
    datasets: [
      {
        data: [credibilityScore, Math.max(0, 100 - credibilityScore)],
        backgroundColor: ["#1f9d63", "#1d6fa3"],
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
        backgroundColor: "rgba(29, 111, 163, 0.7)",
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-bold text-ecoink">Credibility Score</h3>
        <div className="mx-auto h-56 max-w-xs">
          <Doughnut data={doughnutData} />
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-bold text-ecoink">Claim Risk Distribution</h3>
        <div className="h-56">
          <Bar
            data={barData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { min: 0, max: 100 } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
