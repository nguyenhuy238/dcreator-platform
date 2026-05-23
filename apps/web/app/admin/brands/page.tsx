"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Item = {
  id: string;
  status: string;
  brandName: string;
  industry: string | null;
  contactEmail: string;
  account: { email: string; displayName: string };
  createdAt: string;
};

type ApiResult<T> = { success: boolean; data: T; error?: string };

export default function AdminBrandsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/brands?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải yêu cầu Brand thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải yêu cầu Brand thất bại");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Yêu cầu Brand" subtitle="Duyệt hồ sơ đăng ký/onboarding Brand." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="flex flex-wrap gap-2">
          <select className="dc-input max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="NEEDS_REVISION">CHANGES_REQUESTED</option>
          </select>
          <input className="dc-input max-w-80" placeholder="Search brand/email/industry" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được danh sách Brand" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có Brand request" description="Không có hồ sơ phù hợp bộ lọc." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.brandName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.industry ?? "Không có"} • {item.contactEmail} • Applicant: {item.account.displayName}
                    </p>
                  </div>
                  <StatusBadge status={item.status.toLowerCase()} />
                </div>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/brands/${item.id}`}>Xem chi tiết</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}

