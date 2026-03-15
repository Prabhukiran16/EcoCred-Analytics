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
  MessageCircleQuestion,
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
    <div className="min-h-screen bg-[#edf7f2] p-3 dark:bg-[#0d1822] md:p-5">
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4">
        <aside className="card col-span-12 flex flex-col border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-900 md:col-span-2 md:min-h-[90vh]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-sm">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">EcoCred</p>
              <p className="text-sm font-extrabold leading-tight text-slate-800 dark:text-slate-100">Analytics Cloud</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">General</p>
            <div className="mb-5 flex flex-col gap-0.5">
              {menu
                .filter((item) => item.section === "General")
                .map(({ label, href, Icon }) => {
                  const active = router.pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          active ? "text-white" : "text-slate-400 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-400"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />}
                    </Link>
                  );
                })}
            </div>

            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">Tools</p>
            <div className="mb-5 flex flex-col gap-0.5">
              {menu
                .filter((item) => item.section === "Tools")
                .map(({ label, href, Icon }) => {
                  const active = router.pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          active ? "text-white" : "text-slate-400 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-400"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />}
                    </Link>
                  );
                })}
            </div>

            <div className="mt-2 flex flex-col gap-0.5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link href="/help" className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <MessageCircleQuestion className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-400" />
                About EcoCred
              </Link>
            </div>
          </nav>
        </aside>

        <main className="col-span-12 flex flex-col gap-4 md:col-span-10">
          <header className="card flex flex-wrap items-center justify-between gap-3 border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{pageTitle}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{pageSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {toolbarContent}
                  <button className="btn-secondary text-sm" onClick={toggleTheme} type="button">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                  {rightContent ? (
                    <button className="btn-secondary text-sm" onClick={() => setShowNews(true)} type="button">
                      News Feed
                    </button>
                  ) : null}
                  <Link href="/upload" className="btn-primary text-sm">
                    Upload Post
                  </Link>
                  <button className="btn-secondary text-sm" onClick={logout}>
                    Logout
                  </button>
                </div>
              </div>
            </div>
            <div className="w-full">
              {headerContent}
            </div>
          </header>
          {children}
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
