import Link from "next/link";
import { useRouter } from "next/router";

const menu = [
  { label: "Dashboard", href: "/" },
  { label: "Community", href: "/community" },
  { label: "Upload", href: "/upload" },
];

export default function Layout({ children, rightContent, headerContent }) {
  const router = useRouter();

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecocred_token");
      localStorage.removeItem("ecocred_user");
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-3 md:p-5">
      <div className="mx-auto grid max-w-[1450px] grid-cols-12 gap-4">
        <aside className="card col-span-12 p-4 md:col-span-1 md:min-h-[88vh]">
          <div className="mb-8 text-center font-black text-ecoblue">ECO</div>
          <div className="flex flex-col gap-3">
            {menu.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${
                    active ? "bg-ecoblue text-white" : "bg-ecobg text-ecoink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="col-span-12 flex flex-col gap-4 md:col-span-8">
          <header className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h1 className="text-xl font-extrabold text-ecoink">EcoCred Analytics</h1>
              <p className="text-sm text-slate-600">Greenwashing Risk Analysis Platform</p>
            </div>
            <div className="w-full md:w-auto">{headerContent}</div>
            <div className="flex items-center gap-2">
              <Link href="/upload" className="btn-primary text-sm">
                Upload Post
              </Link>
              <button className="btn-secondary text-sm" onClick={logout}>
                Profile
              </button>
            </div>
          </header>
          {children}
        </main>

        <aside className="col-span-12 md:col-span-3">{rightContent}</aside>
      </div>
    </div>
  );
}
