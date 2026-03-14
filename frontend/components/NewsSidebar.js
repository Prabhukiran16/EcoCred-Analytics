export default function NewsSidebar({ news = [] }) {
  return (
    <div className="card min-h-[88vh] p-4">
      <h2 className="mb-3 text-lg font-extrabold text-ecoink">Environmental News</h2>
      <div className="space-y-3">
        {news.length === 0 ? <p className="text-sm text-slate-500">Search a company to load news.</p> : null}
        {news.map((item) => (
          <a
            key={item._id || item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-teal-100 bg-white p-3 hover:border-ecoblue/30"
          >
            {item.image ? (
              <img src={item.image} alt={item.title} className="mb-2 h-28 w-full rounded-lg object-cover" />
            ) : null}
            <p className="mb-1 text-sm font-bold text-ecoink">{item.title}</p>
            <p className="mb-1 text-xs text-emerald-700">{item.source}</p>
            <p className="text-xs text-slate-600 line-clamp-3">{item.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
