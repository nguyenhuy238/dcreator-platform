"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ConfirmDialog, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Detail = {
  id: string;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  status: string;
  campaign: { id: string; title: string; brand: { id: string; displayName: string; email: string } } | null;
  creatorAccount: { id: string; displayName: string; email: string } | null;
  inventoryBatch: {
    id: string;
    batchCode: string | null;
    productSubmission: { id: string; name: string; sku: string | null; unitPriceVnd: number; brand: { id: string; name: string } };
  } | null;
  opsMeta: {
    opsStatus: string;
    trackingCode?: string;
    opsNote?: string;
    fulfillmentMethod?: string;
    paymentStatus?: string;
    failureReason?: string;
    history?: Array<{ at: string; by: string; status: string; note?: string }>;
  };
};

export default function AdminFulfillmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<Detail | null>(null);
  const [status, setStatus] = useState("pending");
  const [trackingCode, setTrackingCode] = useState("");
  const [opsNote, setOpsNote] = useState("");
  const [method, setMethod] = useState("BRAND_WAREHOUSE_SHIP");
  const [paymentStatus, setPaymentStatus] = useState("NONE");
  const [failureReason, setFailureReason] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/fulfillment/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết thất bại");
      setItem(body.data);
      setStatus(body.data.opsMeta.opsStatus ?? "pending");
      setTrackingCode(body.data.opsMeta.trackingCode ?? "");
      setOpsNote(body.data.opsMeta.opsNote ?? "");
      setMethod(body.data.opsMeta.fulfillmentMethod ?? "BRAND_WAREHOUSE_SHIP");
      setPaymentStatus(body.data.opsMeta.paymentStatus ?? "NONE");
      setFailureReason(body.data.opsMeta.failureReason ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveStatus() {
    if (!item) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/fulfillment/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, trackingCode, opsNote, fulfillmentMethod: method, paymentStatus, failureReason })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Update status failed");
      setToast("Đã cập nhật fulfillment");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update status failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chi tiết giao nhận" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }
  if (error || !item) {
    return <ErrorState title="Không tải được fulfillment detail" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader title={item.inventoryBatch?.productSubmission.name ?? "Giao nhận"} subtitle={`Campaign: ${item.campaign?.title ?? "Không có"}`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/fulfillment")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}
      <SectionCard title="Current status">
        <div className="flex items-center justify-between">
          <StatusBadge status={item.opsMeta.opsStatus.toLowerCase()} />
        </div>
        <div className="mt-2 grid gap-2 text-sm text-zinc-700">
          <p>Creator: {item.creatorAccount?.displayName ?? "Không có"} ({item.creatorAccount?.email ?? "Không có"})</p>
          <p>Brand: {item.campaign?.brand.displayName ?? "Không có"} ({item.campaign?.brand.email ?? "Không có"})</p>
          <p>Product: {item.inventoryBatch?.productSubmission.name ?? "Không có"} • SKU: {item.inventoryBatch?.productSubmission.sku ?? "Không có"}</p>
          <p>Recipient: {item.recipientName ?? "Không có"} • {item.recipientPhone ?? "Không có"}</p>
          <p>Address: {item.shippingAddress ?? "Không có"}</p>
        </div>
      </SectionCard>
      <SectionCard title="Update operation" className="mt-4">
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">pending</option>
            <option value="preparing">preparing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input className="dc-input" placeholder="Tracking code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
          <select className="dc-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="BRAND_WAREHOUSE_SHIP">BRAND_WAREHOUSE_SHIP</option>
            <option value="CREATOR_DEPOSIT">CREATOR_DEPOSIT</option>
            <option value="CREATOR_SELF_BUY_REFUND">CREATOR_SELF_BUY_REFUND</option>
          </select>
          <select className="dc-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="NONE">NONE</option>
            <option value="DEPOSIT_PENDING">DEPOSIT_PENDING</option>
            <option value="DEPOSIT_PAID">DEPOSIT_PAID</option>
            <option value="REFUND_PENDING">REFUND_PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
          <input className="dc-input md:col-span-2" placeholder="Failure reason (if failed/cancelled)" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} />
          <textarea className="dc-input md:col-span-2 min-h-24" placeholder="Ghi chú vận hành" value={opsNote} onChange={(e) => setOpsNote(e.target.value)} />
        </div>
        <button
          className="dc-btn-primary mt-3"
          disabled={acting}
          onClick={() => {
            if (status === "failed" || status === "cancelled") {
              setConfirmSave(true);
              return;
            }
            void saveStatus();
          }}
        >
          Save
        </button>
      </SectionCard>
      <SectionCard title="Operation history" className="mt-4">
        {!item.opsMeta.history?.length ? <p className="mt-2 text-sm text-zinc-600">No history</p> : (
          <div className="mt-2 grid gap-2">
            {item.opsMeta.history.map((h, idx) => (
              <div key={`${h.at}-${idx}`} className="rounded-2xl border border-zinc-200 p-3 text-sm">
                <p className="font-semibold">{h.status} • {new Date(h.at).toLocaleString("vi-VN")}</p>
                <p className="text-zinc-600">by: {h.by}</p>
                <p className="text-zinc-600">{h.note ?? "Không có ghi chú"}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmSave}
        title={`Set fulfillment to ${status}?`}
        description="Trạng thái này có thể ảnh hưởng payout/commission hoặc yêu cầu xử lý support tiếp theo."
        confirmText="Xác nhận cập nhật"
        onCancel={() => setConfirmSave(false)}
        onConfirm={() => {
          setConfirmSave(false);
          void saveStatus();
        }}
      />
      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
