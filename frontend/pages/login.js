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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.35),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.25),transparent_32%),radial-gradient(circle_at_50%_90%,rgba(250,204,21,0.2),transparent_35%)]" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-[0_25px_90px_rgba(2,6,23,0.45)] md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-emerald-600 via-cyan-600 to-blue-700 p-10 text-white md:flex">
          <div>
            <p className="mb-3 inline-block rounded-full border border-white/40 px-4 py-1 text-xs font-bold tracking-[0.2em]">ECOCRED CLOUD</p>
            <h1 className="text-4xl font-black leading-tight">Turn ESG claims into board-ready insights.</h1>
          </div>
          <div className="space-y-3 text-sm text-white/90">
            <p>• Multilingual ESG report analysis</p>
            <p>• Risk trends across annual filings</p>
            <p>• Explainable AI with evidence-level scoring</p>
          </div>
        </div>

        <form className="space-y-4 p-7 md:p-10" onSubmit={submit}>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{mode === "login" ? "Welcome Back" : "Create Workspace"}</h2>
            <p className="mt-1 text-sm text-slate-500">Secure ESG analytics for sustainability teams</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === "login" ? "bg-slate-900 text-white" : "text-slate-700"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === "register" ? "bg-emerald-600 text-white" : "text-slate-700"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          {mode === "register" ? (
            <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          ) : null}

          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
          <input className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
          <input
            className="input"
            placeholder="Phone (+123...) optional for login alerts"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            type="tel"
          />

          <button className="btn-primary w-full py-3 text-base" type="submit">
            {mode === "login" ? "Login to Dashboard" : "Create Account"}
          </button>

          {success ? <p className="text-sm font-semibold text-emerald-600">{success}</p> : null}
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
