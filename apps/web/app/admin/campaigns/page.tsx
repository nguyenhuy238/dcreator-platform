"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Campaign = { id: string; title: string; status: string };

export default function AdminCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Campaign[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard/campaign-reviews", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load campaigns failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load campaigns failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(id: string, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    let reason: string | undefined;
    if (decision !== "APPROVED") {
      reason = window.prompt("Nhập lý do:", decision === "REJECTED" ? "Không phù hợp policy" : "Cần chỉnh sửa brief")?.trim();
      if (!reason) return;
    }
    const res = await fetch(`/api/admin/dashboard/campaign-reviews/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ? { decision, reason } : { decision })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Review failed");
      return;
    }
    await load();
  }

  return (
    <>
      <PageHeader title="Campaigns CMS" subtitle="Duyệt campaign mới, từ chối hoặc yêu cầu chỉnh sửa." />
      {error ? <ErrorState title="Không tải được campaigns" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {!loading && !error ? (
        <section>
          <SectionHeader title="Pending Campaign Reviews" subtitle={`Tổng ${items.length} campaign`} />
          {items.length === 0 ? (
            <EmptyState title="Không có campaign chờ duyệt" description="Hiện tại queue review đang trống." />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-zinc-600">#{item.id.slice(0, 8)}</p>
                    </div>
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void review(item.id, "APPROVED")}>Approve</button>
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "REJECTED")}>Reject</button>
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "CHANGES_REQUESTED")}>Request changes</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
