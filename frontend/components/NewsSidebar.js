const statusStyles = {
  idle: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  empty: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function NewsSidebar({ news = [], status = "idle", message = "Search a company to load news." }) {
  return (
    <div className="card border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-3 text-lg font-extrabold text-slate-900 dark:text-slate-100">Environmental News</h2>
      <div className="space-y-3">
        <div className={`rounded-xl px-3 py-2 text-sm ${statusStyles[status] || statusStyles.idle}`}>
          {message}
        </div>
        {news.map((item) => (
          <a
            key={item._id || item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-ecoblue/30 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {item.image ? (
              <img src={item.image} alt={item.title} className="mb-2 h-28 w-full rounded-lg object-cover" />
            ) : null}
            <p className="mb-1 text-sm font-bold text-ecoink dark:text-slate-100">{item.title}</p>
            <p className="mb-1 text-xs text-emerald-700 dark:text-emerald-400">{item.source}</p>
            <p className="text-xs text-slate-600 line-clamp-3 dark:text-slate-300">{item.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
