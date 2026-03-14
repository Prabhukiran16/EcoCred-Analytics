import { useState } from "react";

import Layout from "../components/Layout";
import NewsSidebar from "../components/NewsSidebar";
import useAuthGuard from "../hooks/useAuthGuard";
import api from "../utils/api";

export default function UploadPage() {
  const authed = useAuthGuard();
  const [company, setCompany] = useState("");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState(null);
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("ecocred_user") || "{}");
    if (!user._id) {
      setMessage("Please login first");
      return;
    }

    const form = new FormData();
    form.append("user_id", user._id);
    form.append("company", company);
    form.append("product", product);
    form.append("description", description);
    if (media) form.append("media", media);

    await api.post("/posts/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setMessage("Post uploaded successfully");
    setCompany("");
    setProduct("");
    setDescription("");
    setMedia(null);
  };

  if (!authed) return null;

  return (
    <Layout
      pageTitle="Upload Post"
      pageSubtitle="Share sustainability experiences, evidence, and product feedback"
      headerContent={<p className="text-sm text-slate-600">Upload community sustainability report</p>}
      rightContent={<NewsSidebar news={[]} />}
    >
      <form className="card mx-auto w-full max-w-2xl space-y-4 p-6" onSubmit={submit}>
        <h2 className="text-xl font-extrabold text-ecoink">Upload Post</h2>

        <input className="input" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input className="input" placeholder="Product name" value={product} onChange={(e) => setProduct(e.target.value)} required />

        <textarea
          className="input min-h-36"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input type="file" className="input" onChange={(e) => setMedia(e.target.files?.[0] || null)} />

        <button className="btn-primary" type="submit">
          Submit Post
        </button>

        {message ? <p className="text-sm text-ecoblue">{message}</p> : null}
      </form>
    </Layout>
  );
}
