"use client";

import { FormEvent, useState } from "react";

export default function RoleRequestPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitCreator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const note = String(formData.get("creatorNote") ?? "");
    const response = await fetch("/api/role-requests/creator", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note })
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Request failed");
      return;
    }
    setMessage("Creator request submitted.");
  }

  async function submitBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/role-requests/brand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        brandName: String(formData.get("brandName") ?? ""),
        brandWebsite: String(formData.get("brandWebsite") ?? ""),
        note: String(formData.get("brandNote") ?? "")
      })
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Request failed");
      return;
    }
    setMessage("Brand request submitted.");
  }

  return (
    <main className="container">
      <h1>Role Requests</h1>
      <form className="card" onSubmit={submitCreator}>
        <h2>Upgrade to Creator</h2>
        <textarea name="creatorNote" rows={3} placeholder="Your creator profile note..." />
        <button disabled={loading} type="submit">
          Request Creator
        </button>
      </form>

      <form className="card" onSubmit={submitBrand}>
        <h2>Register Brand</h2>
        <input name="brandName" required placeholder="Brand name" />
        <input name="brandWebsite" type="url" placeholder="https://example.com" />
        <textarea name="brandNote" rows={3} placeholder="Brand description..." />
        <button disabled={loading} type="submit">
          Request Brand
        </button>
      </form>

      {message ? <p>{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
