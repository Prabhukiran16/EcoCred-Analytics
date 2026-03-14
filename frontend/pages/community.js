import { useEffect, useState } from "react";

import CommentsDrawer from "../components/CommentsDrawer";
import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import PostCard from "../components/PostCard";
import useAuthGuard from "../hooks/useAuthGuard";
import api from "../utils/api";

export default function CommunityPage() {
  const authed = useAuthGuard();
  const [posts, setPosts] = useState([]);
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const load = async () => {
    const res = await api.get("/posts/feed");
    setPosts(res.data.posts || []);
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const vote = async (type, postId) => {
    await api.post(`/posts/${type}`, { post_id: postId });
    await load();
  };

  const fetchCommentsForPost = async (postId) => {
    const commentsRes = await api.get(`/comments/${postId}`);
    setCommentsByPost((prev) => ({ ...prev, [postId]: commentsRes.data.comments || [] }));
  };

  const openComments = async (postId) => {
    setCommentsLoading(true);
    await fetchCommentsForPost(postId);
    setActiveCommentsPost(posts.find((post) => post._id === postId) || null);
    setCommentsLoading(false);
  };

  const onComment = async (postId) => {
    await openComments(postId);
  };

  const submitComment = async (postId, text) => {
    const user = JSON.parse(localStorage.getItem("ecocred_user") || "{}");
    if (!text || !user._id) return false;

    setCommentSubmitting(true);
    try {
      await api.post("/posts/comment", {
        post_id: postId,
        user_id: user._id,
        text,
      });

      const res = await api.get("/posts/feed");
      const nextPosts = res.data.posts || [];
      setPosts(nextPosts);
      await fetchCommentsForPost(postId);
      setActiveCommentsPost(nextPosts.find((post) => post._id === postId) || null);
      return true;
    } catch {
      return false;
    } finally {
      setCommentSubmitting(false);
    }
  };

  const toggleComments = async (postId) => {
    if (activeCommentsPost?._id === postId) {
      setActiveCommentsPost(null);
      return;
    }
    await openComments(postId);
  };

  if (!authed) return null;

  return (
    <Layout
      pageTitle="Community"
      pageSubtitle="Read public experience reports and open replies in a side panel"
      headerContent={<p className="text-sm text-slate-600 dark:text-slate-300">Community Feed</p>}
      rightContent={<NewsSidebar news={[]} />}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onUpvote={(id) => vote("upvote", id)}
            onDownvote={(id) => vote("downvote", id)}
            onComment={onComment}
            showComments={activeCommentsPost?._id === post._id}
            onToggleComments={toggleComments}
          />
        ))}
      </div>
      <CommentsDrawer
        open={!!activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
        post={activeCommentsPost}
        comments={activeCommentsPost ? commentsByPost[activeCommentsPost._id] || [] : []}
        loading={commentsLoading}
        onSubmitComment={submitComment}
        submitting={commentSubmitting}
      />
    </Layout>
  );
}
