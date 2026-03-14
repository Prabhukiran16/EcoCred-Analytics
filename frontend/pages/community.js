import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import PostCard from "../components/PostCard";
import useAuthGuard from "../hooks/useAuthGuard";
import api from "../utils/api";

export default function CommunityPage() {
  const authed = useAuthGuard();
  const [posts, setPosts] = useState([]);

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

  const onComment = async (postId) => {
    const text = window.prompt("Write a comment");
    const user = JSON.parse(localStorage.getItem("ecocred_user") || "{}");
    if (!text || !user._id) return;

    await api.post("/posts/comment", {
      post_id: postId,
      user_id: user._id,
      text,
    });

    await load();
  };

  if (!authed) return null;

  return (
    <Layout headerContent={<p className="text-sm text-slate-600">Community Feed</p>} rightContent={<NewsSidebar news={[]} />}>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onUpvote={(id) => vote("upvote", id)}
            onDownvote={(id) => vote("downvote", id)}
            onComment={onComment}
          />
        ))}
      </div>
    </Layout>
  );
}
