import "../styles/globals.css";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ecocred_theme") : null;
    const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    const mode = saved || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, []);

  return <Component {...pageProps} />;
}
