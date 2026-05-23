"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Item = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  requester: { id: string; displayName: string; email: string };
  assignee: { id: string; displayName: string } | null;
  createdAt: string;
};

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (category) params.set("category", category);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/support?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load support tickets failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load support tickets failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Support Queue" subtitle="Xử lý issue của Brand/Creator/User." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_USER">WAITING_USER</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <select className="dc-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All priority</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <select className="dc-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All category</option>
            <option value="CONTENT">CONTENT</option>
            <option value="REVENUE">REVENUE</option>
            <option value="PAYOUT">PAYOUT</option>
            <option value="CAMPAIGN">CAMPAIGN</option>
            <option value="APPLICATION">APPLICATION</option>
            <option value="FULFILLMENT">FULFILLMENT</option>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input className="dc-input" placeholder="Search title/requester/email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Filter</button>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được support queue" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Chưa có support tickets" description="Hiện tại chưa có issue nào trong hệ thống." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-zinc-500">{item.requester.displayName} • {item.requester.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.priority.toLowerCase()} />
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-zinc-700 line-clamp-2">{item.description}</p>
                <p className="mt-1 text-xs text-zinc-500">Category: {item.category} • Assignee: {item.assignee?.displayName ?? "Unassigned"}</p>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/support/${item.id}`}>Open detail</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}

