"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type FulfillmentData = {
  items: Array<{
    id: string;
    status: string;
    failureReason: string | null;
    recipientName: string | null;
    recipientPhone: string | null;
    shippingAddress: string | null;
    updatedAt: string;
    campaign: { id: string; title: string } | null;
    inventoryBatch: { id: string; batchCode: string | null; productSubmission: { id: string; name: string } } | null;
    creatorAccount: { id: string; displayName: string; email: string } | null;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminFulfillmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<FulfillmentData | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard/fulfillment?page=1&limit=50", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<FulfillmentData>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load fulfillment queue failed");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load fulfillment queue failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Fulfillment Queue" subtitle="Đơn fulfillment pending/failed cần xử lý." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không tải được Fulfillment queue" description={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data ? (
        <section>
          <SectionHeader title="Pending & failed orders" subtitle={`Tổng ${data.pagination.total} orders`} />
          {data.items.length === 0 ? (
            <EmptyState title="Không có fulfillment lỗi/chờ xử lý" description="Queue hiện đang trống." />
          ) : (
            <div className="grid gap-3">
              {data.items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.inventoryBatch?.productSubmission.name ?? "N/A product"}</p>
                      <p className="text-xs text-zinc-500">
                        Campaign: {item.campaign?.title ?? "N/A"} • Creator: {item.creatorAccount?.displayName ?? "N/A"}
                      </p>
                    </div>
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">
                    <p>Recipient: {item.recipientName ?? "N/A"} • {item.recipientPhone ?? "N/A"}</p>
                    <p>Address: {item.shippingAddress ?? "N/A"}</p>
                    <p>Batch: {item.inventoryBatch?.batchCode ?? "N/A"}</p>
                    {item.failureReason ? <p className="text-red-700">Failure: {item.failureReason}</p> : null}
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
