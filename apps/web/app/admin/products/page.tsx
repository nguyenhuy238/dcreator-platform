"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Item = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unitPriceVnd: number;
  reviewStatus: string;
  brand: { id: string; name: string };
  inventoryBatches: Array<{ id: string; quantityTotal: number; quantityRemaining: number }>;
};

export default function AdminProductsPage() {
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
      const res = await fetch(`/api/admin/products?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải sản phẩm thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải sản phẩm thất bại");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Product/Inventory Review" subtitle="Kiểm duyệt product/lô hàng do Brand khai báo." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="flex flex-wrap gap-2">
          <select className="dc-input max-w-64" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <input className="dc-input max-w-80" placeholder="Search name/sku/brand/description" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được product queue" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có product chờ xử lý" description="Queue hiện tại trống theo bộ lọc." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-zinc-500">Brand: {item.brand.name} • SKU: {item.sku ?? "Không có"}</p>
                  </div>
                  <StatusBadge status={item.reviewStatus.toLowerCase()} />
                </div>
                <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{item.description ?? "Không có mô tả"}</p>
                <p className="mt-1 text-sm text-zinc-700">Giá bán khai báo: {item.unitPriceVnd.toLocaleString("vi-VN")} VND</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Tổng tồn kho: {item.inventoryBatches.reduce((sum, b) => sum + b.quantityTotal, 0).toLocaleString("vi-VN")} •
                  Còn lại: {item.inventoryBatches.reduce((sum, b) => sum + b.quantityRemaining, 0).toLocaleString("vi-VN")}
                </p>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/products/${item.id}`}>View detail</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
