import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  Leaf,
  FileSearch,
  BarChart3,
  HelpCircle,
} from "lucide-react";

const menu = [
  { label: "Dashboard", href: "/", section: "General", Icon: LayoutDashboard },
  { label: "ESG Reports", href: "/reports", section: "General", Icon: BarChart3 },
  { label: "ESG Claim Analysis", href: "/claim-analysis", section: "General", Icon: FileSearch },
  { label: "Community", href: "/community", section: "General", Icon: Users },
  { label: "Upload", href: "/upload", section: "Tools", Icon: UploadCloud },
  { label: "Help & Support", href: "/help", section: "Tools", Icon: HelpCircle },
];

export default function Layout({
  children,
  rightContent,
  headerContent,
  toolbarContent,
  pageTitle = "Dashboard",
  pageSubtitle = "Greenwashing intelligence for ESG decision making",
}) {
  const router = useRouter();
  const [showNews, setShowNews] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current = typeof window !== "undefined" ? localStorage.getItem("ecocred_theme") || "light" : "light";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("ecocred_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecocred_token");
      localStorage.removeItem("ecocred_user");
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] dark:bg-[#0d1822]">
      <header
        className="sticky top-0 z-50 flex h-[68px] w-full items-center justify-between bg-[#176B3A] px-4 text-white md:px-8"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <p className="text-base font-semibold">EcoCred Analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          {rightContent && router.pathname === "/" ? (
            <button
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={() => setShowNews(true)}
              type="button"
            >
              News Feed
            </button>
          ) : null}
          <button
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1680px]">
        <aside className="hidden h-[calc(100vh-68px)] w-[240px] shrink-0 border-r border-slate-200 bg-white md:sticky md:top-[68px] md:block dark:border-slate-700 dark:bg-slate-900">
          <nav className="flex h-full flex-col overflow-y-auto px-4 py-6">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Navigation</p>
            <div className="mb-6 flex flex-col gap-1.5">
              {menu
                .filter((item) => item.section === "General")
                .map(({ label, href, Icon }) => {
                  const active = router.pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-[#E7F6EE] text-[#176B3A]"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          active ? "text-[#176B3A]" : "text-slate-400 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-400"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#176B3A]/70" />}
                    </Link>
                  );
                })}
            </div>

            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Tools</p>
            <div className="mb-6 flex flex-col gap-1.5">
              {menu
                .filter((item) => item.section === "Tools")
                .map(({ label, href, Icon }) => {
                  const active = router.pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-[#E7F6EE] text-[#176B3A]"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          active ? "text-[#176B3A]" : "text-slate-400 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-400"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#176B3A]/70" />}
                    </Link>
                  );
                })}
            </div>

          </nav>
        </aside>

        <main className="w-full px-6 py-8 md:ml-0 md:px-8">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{pageSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">{toolbarContent}</div>
              </div>
              <div>{headerContent}</div>
            </header>
          {children}
          </div>
        </main>
      </div>

      {rightContent ? (
        <>
          <div
            className={`fixed inset-0 z-30 bg-slate-900/35 transition-opacity duration-300 ${showNews ? "opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={() => setShowNews(false)}
          />
          <aside
            className={`fixed right-0 top-0 z-40 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900 md:max-w-lg ${
              showNews ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">News Panel</h3>
              <button className="btn-secondary text-xs" onClick={() => setShowNews(false)} type="button">
                Close
              </button>
            </div>
            {rightContent}
          </aside>
        </>
      ) : null}
    </div>
  );
}
