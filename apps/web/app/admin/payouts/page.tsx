"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Item = {
  id: string;
  amountVnd: number;
  status: string;
  note: string | null;
  createdAt: string;
  account: { id: string; displayName: string; email: string };
};

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/payouts?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load payouts failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load payouts failed");
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Payout Requests" subtitle="Admin/OPS review payout queue." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-3">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="PAID">PAID</option>
          </select>
          <input className="dc-input md:col-span-2" placeholder="Search creator/email/note" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Filter</button>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được payout requests" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có payout requests" description="Queue đang trống theo bộ lọc hiện tại." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.account.email}</p>
                    <p className="mt-1 text-sm text-zinc-700">{item.amountVnd.toLocaleString("vi-VN")} VND</p>
                    {item.note ? <p className="text-xs text-zinc-600">{item.note}</p> : null}
                  </div>
                  <StatusBadge status={item.status.toLowerCase()} />
                </div>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/payouts/${item.id}`}>Review detail</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}

