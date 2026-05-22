"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  status: string;
  displayName: string;
  socialUrl: string;
  rejectReason: string | null;
  account: { email: string; displayName: string };
};

export default function CreatorApplicationsAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query.trim()) params.set("query", query.trim());
    const res = await fetch(`/api/admin/dashboard/creator-applications?${params.toString()}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Load failed");
      setLoading(false);
      return;
    }
    setItems(body.data as Item[]);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION") {
    let rejectReason: string | undefined;
    if (decision !== "APPROVED") {
      rejectReason = window.prompt("Nhập lý do (>=10 ký tự):", "Thiếu thông tin hồ sơ") ?? "";
      if (!rejectReason || rejectReason.trim().length < 10) return;
    }
    const res = await fetch(`/api/admin/dashboard/creator-applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, rejectReason })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Action failed");
      return;
    }
    await load();
  }

  return (
    <main>
      <h1 className="text-2xl font-black">Creator Applications</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <select className="dc-input max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="NEEDS_REVISION">NEEDS_REVISION</option>
        </select>
        <input className="dc-input max-w-80" placeholder="Search email/display/social" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
      </div>
      {loading ? <p className="mt-4">Loading...</p> : null}
      {error ? <p className="mt-4 text-red-700">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="dc-card p-4">
            <p className="font-semibold">{item.displayName} ({item.account.email})</p>
            <p className="text-sm">Social: {item.socialUrl}</p>
            <p className="text-sm">Status: {item.status}</p>
            {item.rejectReason ? <p className="text-sm text-red-700">Reject reason: {item.rejectReason}</p> : null}
            <div className="mt-3 flex gap-2">
              <button className="dc-btn-primary" onClick={() => void decide(item.id, "APPROVED")}>Approve</button>
              <button className="dc-btn-secondary" onClick={() => void decide(item.id, "REJECTED")}>Reject</button>
              <button className="dc-btn-secondary" onClick={() => void decide(item.id, "NEEDS_REVISION")}>Needs revision</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
