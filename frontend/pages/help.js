import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import useAuthGuard from "../hooks/useAuthGuard";

const steps = [
  "Search for a company and optionally add a product name.",
  "Choose the report language and year, then upload a PDF or run a quick company analysis.",
  "Review the highlighted ESG graphs to understand credibility, claim risk, and yearly trend changes.",
  "Open Community to read or add posts, then expand replies on any card to see what others commented.",
  "Open ESG Reports to browse saved analyses with the original report text and AI explanation.",
];

export default function HelpPage() {
  const authed = useAuthGuard();

  if (!authed) return null;

  return (
    <Layout
      pageTitle="Help & Support"
      pageSubtitle="Understand what EcoCred does and how to use each workflow"
      headerContent={<p className="text-sm text-slate-600 dark:text-slate-300">Website guide and usage help</p>}
      rightContent={<NewsSidebar news={[]} />}
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="card border-emerald-200 bg-white p-5 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">About EcoCred</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            EcoCred helps users evaluate greenwashing risk by analyzing ESG report content, surfacing suspicious claims, tracking credibility trends over time, and comparing those findings with community feedback.
          </p>

          <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-slate-100">How to use the website</h3>
          <div className="mt-3 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Step {index + 1}</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card border-emerald-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">What each section does</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Dashboard</p>
              <p>Runs ESG analysis and highlights the core graphs first.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Community</p>
              <p>Shows posts in a 3-column grid, with expandable replies from other users.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">ESG Reports</p>
              <p>Lists real saved report records, AI explanations, and extracted report text.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Upload</p>
              <p>Lets users publish community posts with optional media.</p>
            </div>
          </div>
        </article>
      </section>
    </Layout>
  );
}