import { useEffect, useState } from "react";

export default function CommentsDrawer({ open, onClose, post, comments = [], loading = false, onSubmitComment, submitting = false }) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) setDraft("");
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!post?._id || !draft.trim() || !onSubmitComment) return;
    const ok = await onSubmitComment(post._id, draft.trim());
    if (ok) setDraft("");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/35 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-md overflow-y-auto border-l border-emerald-100 bg-white p-4 shadow-2xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900 md:max-w-lg ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Post Replies</h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{post?.company || "Selected post"}</p>
          </div>
          <button className="btn-secondary text-xs" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {post ? (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/80">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{post.username || "user"}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{post.description}</p>
          </div>
        ) : null}

        <form className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/80" onSubmit={submit}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Add your comment here</p>
          <textarea
            className="input min-h-20"
            placeholder="Write your comment..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Comment is posted to this selected post.</p>
            <button className="btn-primary text-sm" type="submit" disabled={submitting || !draft.trim()}>
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>

        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading replies...</p> : null}
        {!loading && !comments.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No replies yet for this post.</p> : null}
        {!loading && comments.length ? <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">All user comments ({comments.length})</p> : null}

        <div className="space-y-3">
          {comments.map((comment, index) => (
            <div key={`${post?._id || "post"}-${index}`} className="rounded-xl border border-emerald-100 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{comment.username || "anonymous"}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ""}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{comment.comment || comment.text || ""}</p>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}