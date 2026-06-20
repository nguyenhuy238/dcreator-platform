"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type BrandConsultation = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  facebookUrl: string | null;
  source: string;
  interestedPackage: string | null;
  note: string | null;
  status: "NEW" | "CONTACTED" | "ARCHIVED";
  submittedByUserId: string | null;
  submittedByEmail: string | null;
  submittedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminBrandConsultationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BrandConsultation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      const response = await fetch(`/api/admin/brand-consultations?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResult<BrandConsultation[]>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể tải danh sách tư vấn brand.");
      }
      setItems(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách tư vấn brand.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const newCount = items.filter((item) => item.status === "NEW").length;
    const contactedCount = items.filter((item) => item.status === "CONTACTED").length;
    return { total: items.length, newCount, contactedCount };
  }, [items]);

  return (
    <>
      <PageHeader
        title="Brand Consultations"
        subtitle="Danh sách lead tư vấn 1:1 được gửi từ landing page Brand."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input className="dc-input" placeholder="Tìm theo tên, email, SĐT, link FB" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Tổng lead</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.total}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Mới</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.newCount}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Đã liên hệ</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.contactedCount}</p>
        </article>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được danh sách tư vấn" description={error} onRetry={() => void load()} /></div> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Chưa có lead tư vấn"
              description="Khi brand gửi form tư vấn, dữ liệu sẽ xuất hiện ở đây."
            />
          </div>
        ) : (
          <section className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-zinc-900">Tên khách hàng: {item.name}</p>
                    {item.email ? <p className="mt-1 text-sm text-zinc-600">Email: {item.email}</p> : null}
                    <p className="mt-1 text-sm text-zinc-600">Số điện thoại: {item.phone}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                  {item.facebookUrl ? (
                    <p>
                      <span className="font-semibold">Facebook:</span>{" "}
                      <a href={item.facebookUrl} target="_blank" rel="noreferrer" className="text-zinc-950 underline decoration-zinc-300 decoration-2 underline-offset-4">
                        {item.facebookUrl}
                      </a>
                    </p>
                  ) : null}
                  {item.interestedPackage ? <p><span className="font-semibold">Gói quan tâm:</span> {item.interestedPackage}</p> : null}
                  {item.note ? <p><span className="font-semibold">Thông tin:</span> {item.note}</p> : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </article>
            ))}
          </section>
        )
      ) : null}
    </>
  );
}
