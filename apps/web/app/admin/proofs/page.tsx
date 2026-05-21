"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ActionToast,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatusBadge
} from "@/app/components/dcreator/ui/base";

type QueueItem = {
  id: string;
  mission: { title: string; campaign: { title: string } };
  account: { displayName: string };
  rejectReason: string | null;
};

export default function AdminProofQueuePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/proofs", { cache: "no-store" });
      const payload = (await res.json()) as { success: boolean; data: QueueItem[]; error?: string };
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Load queue failed");
      setItems(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load queue failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    const body = action === "approve" ? { note: "ok" } : { rejectReason: "Invalid proof" };
    const res = await fetch(`/api/admin/proofs/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await res.json()) as { success: boolean; error?: string };
    if (!res.ok || !payload.success) throw new Error(payload.error ?? "Review failed");
    setToast(action === "approve" ? "Đã duyệt proof" : "Đã từ chối proof");
    setTimeout(() => setToast(""), 2000);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Proof Review Queue"
        subtitle="Duyệt proof creator và xử lý các trường hợp cần reject."
        action={<Link className="dc-btn-secondary" href="/admin">Về dashboard</Link>}
      />
      {error ? <ErrorState title="Không tải được queue proof" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {!loading && !error ? (
        <section>
          <SectionHeader title="Pending & Rejected proofs" subtitle={`Tổng ${items.length} proof`} />
          {items.length === 0 ? (
            <EmptyState title="Queue đang trống" description="Hiện không có proof cần duyệt." />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{item.mission.title}</p>
                    <p className="text-sm text-zinc-600">
                      Campaign: {item.mission.campaign.title} • Creator: {item.account.displayName}
                    </p>
                    {item.rejectReason ? <p className="mt-1 text-sm text-red-600">Reject reason: {item.rejectReason}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.rejectReason ? "rejected" : "pending"} />
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "reject")}>Reject</button>
                    <button className="dc-btn-primary" onClick={() => void review(item.id, "approve")}>Approve</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
