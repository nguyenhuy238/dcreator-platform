"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CampaignItem = {
  id: string;
  title: string;
  status: string;
  statusView: string;
  brand: { id: string; displayName: string; email: string };
  startsAt: string | null;
  endsAt: string | null;
  rewards: Array<{ id: string }>;
  missions: Array<{ id: string }>;
};

const statusOptions = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAUSED", label: "Pending review / Paused" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Rejected" }
];

export default function AdminCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PAUSED");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CampaignItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/campaigns?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignItem[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load campaigns failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load campaigns failed");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Campaign Review & Publish" subtitle="Review campaign và quyết định publish/changes/pause nhanh." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="flex flex-wrap gap-2">
          <select className="dc-input max-w-72" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input className="dc-input max-w-96" placeholder="Search title/brief/brand" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được campaign list" description={error} onRetry={() => void load()} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4">
          <SectionHeader title="Campaign queue" subtitle={`Tổng ${items.length} campaigns`} />
          {items.length === 0 ? (
            <EmptyState title="Không có campaign phù hợp" description="Không có dữ liệu theo bộ lọc hiện tại." />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      <p className="text-xs text-zinc-500">Brand: {item.brand.displayName} • Rewards: {item.rewards.length} • Missions: {item.missions.length}</p>
                    </div>
                    <StatusBadge status={item.statusView.toLowerCase()} />
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Timeline: {item.startsAt ? new Date(item.startsAt).toLocaleDateString("vi-VN") : "N/A"} - {item.endsAt ? new Date(item.endsAt).toLocaleDateString("vi-VN") : "N/A"}
                  </div>
                  <div className="mt-3">
                    <Link className="dc-btn-primary" href={`/admin/campaigns/${item.id}`}>Review detail</Link>
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
