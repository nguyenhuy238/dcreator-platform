"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Item = {
  id: string;
  status: string;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  campaign: { id: string; title: string; brand: { displayName: string } } | null;
  inventoryBatch: { id: string; batchCode: string | null; productSubmission: { id: string; name: string } } | null;
  creatorAccount: { id: string; displayName: string; email: string } | null;
  opsMeta: { opsStatus: string; trackingCode?: string; paymentStatus?: string; fulfillmentMethod?: string; failureReason?: string };
};

export default function AdminFulfillmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [query, setQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    campaignId: "",
    creatorAccountId: "",
    inventoryBatchId: "",
    recipientName: "",
    recipientPhone: "",
    shippingAddress: "",
    fulfillmentMethod: "BRAND_WAREHOUSE_SHIP",
    paymentStatus: "NONE",
    opsNote: ""
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (campaignId.trim()) params.set("campaignId", campaignId.trim());
      if (creatorId.trim()) params.set("creatorId", creatorId.trim());
      if (brandId.trim()) params.set("brandId", brandId.trim());
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/fulfillment?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load fulfillment queue failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load fulfillment queue failed");
    } finally {
      setLoading(false);
    }
  }, [status, campaignId, creatorId, brandId, query]);

  async function createExportRequest() {
    setError("");
    try {
      const res = await fetch("/api/admin/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Create request failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create request failed");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Fulfillment Queue" subtitle="Đơn fulfillment pending/failed cần xử lý." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card mb-4 p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">pending</option>
            <option value="preparing">preparing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input className="dc-input" placeholder="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <input className="dc-input" placeholder="Creator ID" value={creatorId} onChange={(e) => setCreatorId(e.target.value)} />
          <input className="dc-input" placeholder="Brand ID" value={brandId} onChange={(e) => setBrandId(e.target.value)} />
          <input className="dc-input md:col-span-4" placeholder="Search recipient/product/campaign/creator" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Filter</button>
      </section>
      <section className="dc-card mb-4 p-4">
        <p className="font-semibold">Tạo yêu cầu xuất kho (phiên bản tối giản theo model hiện có)</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className="dc-input" placeholder="Campaign ID" value={createForm.campaignId} onChange={(e) => setCreateForm((p) => ({ ...p, campaignId: e.target.value }))} />
          <input className="dc-input" placeholder="Creator Account ID" value={createForm.creatorAccountId} onChange={(e) => setCreateForm((p) => ({ ...p, creatorAccountId: e.target.value }))} />
          <input className="dc-input" placeholder="Inventory Batch ID" value={createForm.inventoryBatchId} onChange={(e) => setCreateForm((p) => ({ ...p, inventoryBatchId: e.target.value }))} />
          <input className="dc-input" placeholder="Recipient name" value={createForm.recipientName} onChange={(e) => setCreateForm((p) => ({ ...p, recipientName: e.target.value }))} />
          <input className="dc-input" placeholder="Recipient phone" value={createForm.recipientPhone} onChange={(e) => setCreateForm((p) => ({ ...p, recipientPhone: e.target.value }))} />
          <input className="dc-input" placeholder="Shipping address" value={createForm.shippingAddress} onChange={(e) => setCreateForm((p) => ({ ...p, shippingAddress: e.target.value }))} />
          <select className="dc-input" value={createForm.fulfillmentMethod} onChange={(e) => setCreateForm((p) => ({ ...p, fulfillmentMethod: e.target.value }))}>
            <option value="BRAND_WAREHOUSE_SHIP">BRAND_WAREHOUSE_SHIP</option>
            <option value="CREATOR_DEPOSIT">CREATOR_DEPOSIT</option>
            <option value="CREATOR_SELF_BUY_REFUND">CREATOR_SELF_BUY_REFUND</option>
          </select>
          <select className="dc-input" value={createForm.paymentStatus} onChange={(e) => setCreateForm((p) => ({ ...p, paymentStatus: e.target.value }))}>
            <option value="NONE">NONE</option>
            <option value="DEPOSIT_PENDING">DEPOSIT_PENDING</option>
            <option value="DEPOSIT_PAID">DEPOSIT_PAID</option>
            <option value="REFUND_PENDING">REFUND_PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
          <input className="dc-input" placeholder="Ops note" value={createForm.opsNote} onChange={(e) => setCreateForm((p) => ({ ...p, opsNote: e.target.value }))} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void createExportRequest()}>Create export request</button>
      </section>
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không tải được Fulfillment queue" description={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <section>
          <SectionHeader title="Fulfillment orders" subtitle={`Tổng ${items.length} orders`} />
          {items.length === 0 ? (
            <EmptyState title="Không có fulfillment lỗi/chờ xử lý" description="Queue hiện đang trống." />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.inventoryBatch?.productSubmission.name ?? "N/A product"}</p>
                      <p className="text-xs text-zinc-500">
                        Campaign: {item.campaign?.title ?? "N/A"} • Brand: {item.campaign?.brand.displayName ?? "N/A"} • Creator: {item.creatorAccount?.displayName ?? "N/A"}
                      </p>
                    </div>
                    <StatusBadge status={(item.opsMeta.opsStatus || item.status).toLowerCase()} />
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">
                    <p>Recipient: {item.recipientName ?? "N/A"} • {item.recipientPhone ?? "N/A"}</p>
                    <p>Address: {item.shippingAddress ?? "N/A"}</p>
                    <p>Batch: {item.inventoryBatch?.batchCode ?? "N/A"}</p>
                    <p>Method: {item.opsMeta.fulfillmentMethod ?? "N/A"} • Payment: {item.opsMeta.paymentStatus ?? "N/A"}</p>
                    {item.opsMeta.trackingCode ? <p>Tracking: {item.opsMeta.trackingCode}</p> : null}
                    {item.opsMeta.failureReason ? <p className="text-red-700">Failure: {item.opsMeta.failureReason}</p> : null}
                    <Link className="dc-btn-primary mt-2 inline-flex" href={`/admin/fulfillment/${item.id}`}>Open detail</Link>
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
