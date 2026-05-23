"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Item = {
  id: string;
  status: string;
  displayName: string;
  mainPlatform: string;
  socialUrl: string;
  contentCategory: string | null;
  account: { email: string; displayName: string };
  createdAt: string;
};

type ApiResult<T> = { success: boolean; data: T; error?: string };

export default function AdminCreatorsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (platform) params.set("platform", platform);
      if (category.trim()) params.set("contentCategory", category.trim());
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/creators?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load creator requests failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load creator requests failed");
    } finally {
      setLoading(false);
    }
  }, [category, platform, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Creator Requests" subtitle="Duyệt hồ sơ nâng cấp Creator." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="NEEDS_REVISION">CHANGES_REQUESTED</option>
          </select>
          <select className="dc-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">All platform</option>
            <option value="TIKTOK">TIKTOK</option>
            <option value="INSTAGRAM">INSTAGRAM</option>
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="FACEBOOK">FACEBOOK</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input className="dc-input" placeholder="Content category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input className="dc-input" placeholder="Search name/email/social" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được danh sách Creator" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có Creator request" description="Không có hồ sơ phù hợp bộ lọc." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.mainPlatform} • {item.contentCategory ?? "N/A"} • {item.account.email}
                    </p>
                  </div>
                  <StatusBadge status={item.status.toLowerCase()} />
                </div>
                <p className="mt-1 text-xs text-zinc-600 break-all">{item.socialUrl}</p>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/creators/${item.id}`}>View detail</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
