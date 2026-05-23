"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ConfirmDialog, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type ProductDetail = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unitPriceVnd: number;
  reviewStatus: string;
  reviewNote: string | null;
  brand: { id: string; name: string; industry: string | null; contactEmail: string | null };
  campaign: { id: string; title: string; status: string } | null;
  inventoryBatches: Array<{
    id: string;
    batchCode: string | null;
    quantityTotal: number;
    quantityRemaining: number;
    stockStatus: string;
  }>;
};

export default function AdminProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<ProductDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [note, setNote] = useState("");
  const [commission, setCommission] = useState("");
  const [margin, setMargin] = useState("");
  const [campaignEligible, setCampaignEligible] = useState(true);
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<null | "reject" | "request-changes">(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ProductDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load product detail failed");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load product detail failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(action: "approve" | "reject" | "request-changes") {
    if (!item) return;
    const normalizedReason = reason.trim() || undefined;
    if (action !== "approve" && !normalizedReason) {
      setError("Reason is required for reject/request changes.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: normalizedReason,
          note: note.trim() || undefined,
          proposedCommissionPercent: commission ? Number(commission) : undefined,
          proposedMarginPercent: margin ? Number(margin) : undefined,
          campaignEligible
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast("Đã cập nhật quyết định kiểm duyệt");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Product Detail" subtitle="Đang tải dữ liệu sản phẩm..." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được Product detail" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader title={item.name} subtitle={`Brand: ${item.brand.name}`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/products")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}
      <SectionCard title="Review status">
        <div className="flex items-center justify-between">
          <StatusBadge status={item.reviewStatus.toLowerCase()} />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>SKU: {item.sku ?? "Không có"}</p>
          <p>Mô tả: {item.description ?? "Không có"}</p>
          <p>Category: N/A (model hiện tại chưa có field category)</p>
          <p>Hình ảnh: N/A (model hiện tại chưa có field imageUrl)</p>
          <p>Giá vốn: N/A (model hiện tại chưa có field cost)</p>
          <p>Giá bán: {item.unitPriceVnd.toLocaleString("vi-VN")} VND</p>
          <p>Brand: {item.brand.name} • Industry: {item.brand.industry ?? "Không có"} • Email: {item.brand.contactEmail ?? "Không có"}</p>
          <p>Campaign: {item.campaign ? `${item.campaign.title} (${item.campaign.status})` : "Không có"}</p>
          <p>Legal/content flags: N/A (chưa có field riêng, lưu qua reviewNote)</p>
          {item.reviewNote ? <p className="whitespace-pre-wrap">Review note: {item.reviewNote}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Inventory batches" className="mt-4">
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {item.inventoryBatches.map((batch) => (
            <div key={batch.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold">Batch: {batch.batchCode ?? "Không có"}</p>
              <p>Total: {batch.quantityTotal.toLocaleString("vi-VN")}</p>
              <p>Remaining: {batch.quantityRemaining.toLocaleString("vi-VN")}</p>
              <p>Status: {batch.stockStatus}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Admin proposal (optional)" className="mt-4">
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className="dc-input" placeholder="Proposed commission %" value={commission} onChange={(e) => setCommission(e.target.value)} />
          <input className="dc-input" placeholder="Proposed margin %" value={margin} onChange={(e) => setMargin(e.target.value)} />
          <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={campaignEligible} onChange={(e) => setCampaignEligible(e.target.checked)} />
            Eligible for campaign
          </label>
        </div>
        <textarea className="dc-input mt-2 min-h-24" placeholder="Review note / legal/content remarks" value={note} onChange={(e) => setNote(e.target.value)} />
      </SectionCard>

      <SectionCard title="Quyết định" className="mt-4">
        <textarea className="dc-input min-h-24" placeholder="Reason (required for reject/request changes)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => void decide("approve")}>Approve product</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setPendingAction("reject")}>Reject product</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setPendingAction("request-changes")}>Request changes</button>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === "reject" ? "Reject product?" : "Request product changes?"}
        description={pendingAction === "reject" ? "Brand sẽ nhận trạng thái từ chối cho sản phẩm này." : "Brand sẽ nhận yêu cầu bổ sung/chỉnh sửa cho sản phẩm này."}
        confirmText={pendingAction === "reject" ? "Từ chối" : "Yêu cầu chỉnh sửa"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          void decide(pendingAction);
          setPendingAction(null);
        }}
      />

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
