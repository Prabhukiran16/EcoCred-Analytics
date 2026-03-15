import { useState } from "react";
import { useRouter } from "next/router";

import api from "../utils/api";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (mode === "register") {
        await api.post("/auth/register", { username, email, password });
        setMode("login");
        setSuccess("Account created successfully. Please log in.");
        return;
      }

      const res = await api.post("/auth/login", {
        email,
        password,
        phone_number: phoneNumber,
      });

      localStorage.setItem("ecocred_token", res.data.access_token);
      localStorage.setItem("ecocred_user", JSON.stringify(res.data.user));
      router.push("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf8ef]">
      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-14">
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl md:leading-tight">
              Eco Cred ESG
              <br />
              Claim Validation
              <br />
              Platform
            </h1>
            <p className="mt-5 max-w-xl text-xl text-slate-600">
              Sign in to analyze ESG reports, verify sustainability claims with evidence-backed AI scoring,
              and monitor greenwashing risk across companies in one intelligent workspace.
            </p>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <img src="/image.jpeg" alt="ESG visual" className="h-full max-h-[360px] w-full object-contain" />
            </div>
          </div>

          <form className="self-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-9" onSubmit={submit}>
            <div>
              <h2 className="text-5xl font-black text-slate-900 md:text-5xl">Log in</h2>
              <p className="mt-2 text-2xl text-slate-500 md:text-3xl">Continue to your Eco Cred console</p>
            </div>

            <div className="mb-6 mt-7 flex items-center gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                className={`text-sm font-semibold transition ${mode === "login" ? "bg-green-700 text-white rounded-lg px-6 py-2" : "text-gray-600 px-6 py-2"}`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={`text-sm font-semibold transition ${mode === "register" ? "bg-green-700 text-white rounded-lg px-6 py-2" : "text-gray-600 px-6 py-2"}`}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            {mode === "register" ? (
              <input
                className="mb-4 w-full rounded-lg border border-slate-300 p-3 text-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            ) : null}

            <input
              className="mb-4 w-full rounded-lg border border-slate-300 p-3 text-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
            />
            <input
              className="mb-4 w-full rounded-lg border border-slate-300 p-3 text-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
            />
            <input
              className="mb-4 w-full rounded-lg border border-slate-300 p-3 text-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Phone (+123...) optional for login alerts"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
            />

            <button className="w-full rounded-lg bg-green-700 py-3 text-xl font-semibold text-white transition hover:bg-green-800" type="submit">
              {mode === "login" ? "Login to Dashboard" : "Create Account"}
            </button>

            {success ? <p className="mt-3 text-sm font-semibold text-emerald-600">{success}</p> : null}
            {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
          </form>
        </div>
      </section>

      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h3 className="text-3xl font-bold text-slate-900">Why EcoCred Analytics</h3>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            EcoCred helps sustainability, compliance, and strategy teams move from ESG claims to evidence-backed decisions.
            Upload reports, track risk trends, and combine AI-driven insights with community intelligence.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h4 className="text-lg font-semibold text-slate-900">AI Risk Scoring</h4>
              <p className="mt-2 text-sm text-slate-600">
                Identify greenwashing risk using transparent claim-level scoring and evidence-aware analysis.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h4 className="text-lg font-semibold text-slate-900">Multilingual Support</h4>
              <p className="mt-2 text-sm text-slate-600">
                Analyze ESG disclosures in multiple languages and translate outputs for cross-functional teams.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h4 className="text-lg font-semibold text-slate-900">Actionable Alerts</h4>
              <p className="mt-2 text-sm text-slate-600">
                Trigger instant alerts when risk thresholds are crossed, enabling faster response and governance.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h4 className="text-xl font-semibold text-slate-900">Built for modern ESG teams</h4>
            <p className="mt-3 text-sm text-slate-600">
              From sustainability reporting to board reviews, EcoCred brings a single, auditable workflow for ESG claim validation.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h4 className="text-xl font-semibold text-slate-900">Evidence before trust</h4>
            <p className="mt-3 text-sm text-slate-600">
              Combine report intelligence, contradiction checks, and community feedback to assess credibility with confidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
