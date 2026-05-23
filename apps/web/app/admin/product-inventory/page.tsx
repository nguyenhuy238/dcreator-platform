"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type ProductInventoryData = {
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    reviewStatus: string;
    reviewNote: string | null;
    updatedAt: string;
    brand: { id: string; name: string };
    inventoryBatches: Array<{
      id: string;
      batchCode: string | null;
      quantityTotal: number;
      quantityRemaining: number;
      stockStatus: string;
    }>;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminProductInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ProductInventoryData | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard/product-inventory?page=1&limit=50", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ProductInventoryData>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load product/inventory failed");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load product/inventory failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Product/Inventory Review" subtitle="Danh sách product và batch đang chờ admin xử lý." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không tải được Product/Inventory queue" description={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data ? (
        <section>
          <SectionHeader title="Pending queue" subtitle={`Tổng ${data.pagination.total} items`} />
          {data.items.length === 0 ? (
            <EmptyState title="Không có Product/Inventory chờ duyệt" description="Queue hiện đang trống." />
          ) : (
            <div className="grid gap-3">
              {data.items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.name}</p>
                      <p className="text-xs text-zinc-500">Brand: {item.brand.name} • SKU: {item.sku ?? "N/A"}</p>
                    </div>
                    <StatusBadge status={item.reviewStatus.toLowerCase()} />
                  </div>
                  {item.reviewNote ? <p className="mt-2 text-sm text-zinc-600">{item.reviewNote}</p> : null}
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {item.inventoryBatches.map((batch) => (
                      <div key={batch.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold">Batch: {batch.batchCode ?? "N/A"}</p>
                        <p>Total: {batch.quantityTotal.toLocaleString("vi-VN")}</p>
                        <p>Remaining: {batch.quantityRemaining.toLocaleString("vi-VN")}</p>
                        <p>Status: {batch.stockStatus}</p>
                      </div>
                    ))}
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
