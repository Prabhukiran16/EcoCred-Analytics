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
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "register") {
        await api.post("/auth/register", { username, email, password });
        setMode("login");
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-100 via-cyan-50 to-blue-100 p-4">
      <form className="card w-full max-w-md space-y-4 p-6" onSubmit={submit}>
        <h1 className="text-center text-2xl font-extrabold text-ecoink">EcoCred Login</h1>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-ecobg p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${mode === "login" ? "bg-ecoblue text-white" : "text-slate-700"}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${mode === "register" ? "bg-ecogreen text-white" : "text-slate-700"}`}
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
          placeholder="Phone number (+123...) for Twilio SMS on login"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          type="tel"
        />

        <button className="btn-primary w-full" type="submit">
          {mode === "login" ? "Login" : "Create Account"}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
