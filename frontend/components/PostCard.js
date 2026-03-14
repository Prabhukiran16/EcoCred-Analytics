import { MessageSquareMore } from "lucide-react";

export default function PostCard({ post, onUpvote, onDownvote, onComment, showComments = false, onToggleComments }) {
  const mediaUrl = post.media_url
    ? post.media_url.startsWith("http")
      ? post.media_url
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/${post.media_url}`
    : "";

  return (
    <article className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <div className="h-8 w-8 rounded-full bg-ecobg dark:bg-slate-700" />
        <div>
          <p className="font-semibold text-ecoink dark:text-slate-100">{post.username || "user"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{post.company} - {post.product}</p>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{post.description}</p>

      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={post.product || "post media"}
          className="mb-3 h-52 w-full rounded-xl object-cover"
        />
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <button className="btn-secondary" onClick={() => onUpvote(post._id)}>
          Upvote ({post.upvotes || 0})
        </button>
        <button className="btn-secondary" onClick={() => onDownvote(post._id)}>
          Downvote ({post.downvotes || 0})
        </button>
        <button className="btn-secondary" onClick={() => onComment(post._id)}>
          Comment ({post.comment_count || 0})
        </button>
        <button className="btn-secondary inline-flex items-center gap-2" onClick={() => onToggleComments(post._id)} type="button">
          <MessageSquareMore className="h-4 w-4" />
          {showComments ? "Replies Open" : "View Replies"}
        </button>
      </div>
    </article>
  );
}
