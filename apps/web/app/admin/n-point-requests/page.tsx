"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type StatusFilter = "" | "PENDING_ADMIN_REVIEW" | "APPROVED" | "REJECTED" | "REFUND_INFO_SUBMITTED" | "REFUND_COMPLETED";

type TopupRequest = {
  id: string;
  amountVnd: number;
  requestedPoints: number;
  transferNote: string;
  bankTransferProofUrl: string;
  status: "PENDING_ADMIN_REVIEW" | "APPROVED" | "REJECTED" | "REFUND_INFO_SUBMITTED" | "REFUND_COMPLETED";
  adminDecisionReason: string | null;
  refundBankName: string | null;
  refundAccountName: string | null;
  refundAccountNumber: string | null;
  refundRequestNote: string | null;
  refundSubmittedAt: string | null;
  refundProofUrl: string | null;
  refundProcessedNote: string | null;
  refundProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string; ownerAccountId: string };
  requester: { id: string; displayName: string; email: string };
  reviewedBy: { id: string; displayName: string; email: string } | null;
  refundProcessedBy: { id: string; displayName: string; email: string } | null;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function statusLabel(status: TopupRequest["status"]) {
  switch (status) {
    case "PENDING_ADMIN_REVIEW":
      return "Chờ duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Từ chối";
    case "REFUND_INFO_SUBMITTED":
      return "Chờ hoàn tiền";
    case "REFUND_COMPLETED":
      return "Đã hoàn tiền";
    default:
      return status;
  }
}

function statusClass(status: TopupRequest["status"]) {
  switch (status) {
    case "PENDING_ADMIN_REVIEW":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "APPROVED":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "REJECTED":
      return "bg-red-50 border-red-200 text-red-700";
    case "REFUND_INFO_SUBMITTED":
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "REFUND_COMPLETED":
      return "bg-zinc-100 border-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-100 border-zinc-200 text-zinc-700";
  }
}

export default function AdminNPointRequestsPage() {
  const [items, setItems] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [refundNote, setRefundNote] = useState<Record<string, string>>({});
  const [refundProofUrl, setRefundProofUrl] = useState<Record<string, string>>({});
  const [uploadingRefundFor, setUploadingRefundFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`/api/admin/dashboard/n-point-topup-requests?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<TopupRequest[]>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể tải danh sách nạp điểm" : payload.error);
      }
      setItems(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách nạp điểm");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => item.status === "PENDING_ADMIN_REVIEW").length;
    const approved = items.filter((item) => item.status === "APPROVED").length;
    const refundQueue = items.filter((item) => item.status === "REFUND_INFO_SUBMITTED").length;
    const totalAmount = items.reduce((sum, item) => sum + item.amountVnd, 0);
    return { pending, approved, refundQueue, totalAmount };
  }, [items]);

  async function approve(item: TopupRequest) {
    setActingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/dashboard/n-point-topup-requests/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Đã kiểm tra biên lai và duyệt cộng điểm." })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể duyệt yêu cầu" : payload.error);
      }
      setToast("Đã duyệt nạp N-Point thành công");
      setTimeout(() => setToast(""), 1600);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể duyệt yêu cầu");
    } finally {
      setActingId(null);
    }
  }

  async function reject(item: TopupRequest) {
    const reason = (rejectReason[item.id] ?? "").trim();
    if (reason.length < 3) {
      setError("Lý do từ chối cần ít nhất 3 ký tự.");
      return;
    }

    setActingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/dashboard/n-point-topup-requests/${item.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể từ chối yêu cầu" : payload.error);
      }
      setToast("Đã từ chối yêu cầu nạp điểm");
      setTimeout(() => setToast(""), 1600);
      await load();
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "Không thể từ chối yêu cầu");
    } finally {
      setActingId(null);
    }
  }

  async function uploadRefundProof(requestId: string, file: File) {
    setUploadingRefundFor(requestId);
    setError("");
    try {
      const formData = new FormData();
      formData.append("bill", file);
      const response = await fetch("/api/uploads/n-point-bill", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.billUrl) {
        throw new Error(payload.error ?? "Không thể tải biên lai hoàn tiền");
      }
      setRefundProofUrl((prev) => ({ ...prev, [requestId]: payload.data.billUrl as string }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải biên lai hoàn tiền");
    } finally {
      setUploadingRefundFor(null);
    }
  }

  async function onRefundProofFileChange(requestId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadRefundProof(requestId, file);
  }

  async function completeRefund(item: TopupRequest) {
    const proofUrl = (refundProofUrl[item.id] ?? "").trim();
    if (!proofUrl) {
      setError("Vui lòng tải lên biên lai hoàn tiền.");
      return;
    }

    setActingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/dashboard/n-point-topup-requests/${item.id}/refund-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundProofUrl: proofUrl,
          refundProcessedNote: (refundNote[item.id] ?? "").trim() || undefined
        })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể hoàn tất hoàn tiền" : payload.error);
      }
      setToast("Đã cập nhật hoàn tiền thành công");
      setTimeout(() => setToast(""), 1600);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể hoàn tất hoàn tiền");
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Xử lý Nạp tiền hoàn tiền" subtitle="Duyệt yêu cầu nạp N-Point và xử lý hoàn tiền cho Brand khi bị từ chối." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />

      {error ? <ErrorState title="Không thể xử lý yêu cầu N-Point" description={error} onRetry={() => void load()} /> : null}

      <section className="dc-grid-dashboard">
        <StatsCard title="Yêu cầu chờ duyệt" value={String(stats.pending)} />
        <StatsCard title="Đã duyệt" value={String(stats.approved)} />
        <StatsCard title="Chờ hoàn tiền" value={String(stats.refundQueue)} />
        <StatsCard title="Tổng tiền theo bộ lọc" value={formatVnd(stats.totalAmount)} />
      </section>

      <section className="dc-card mt-5 p-4">
        <label className="grid max-w-xs gap-1 text-sm text-zinc-700">
          <span>Lọc trạng thái</span>
          <select className="dc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="">Tất cả</option>
            <option value="PENDING_ADMIN_REVIEW">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
            <option value="REFUND_INFO_SUBMITTED">Chờ hoàn tiền</option>
            <option value="REFUND_COMPLETED">Đã hoàn tiền</option>
          </select>
        </label>
      </section>

      {loading ? <div className="mt-5"><LoadingSkeleton rows={5} /></div> : null}
      {!loading && items.length === 0 ? <div className="mt-5"><EmptyState title="Không có yêu cầu phù hợp" description="Hiện chưa có yêu cầu nạp/hoàn tiền theo bộ lọc." /></div> : null}

      {!loading && items.length > 0 ? (
        <section className="mt-5 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="dc-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">{item.brand.name} • {formatVnd(item.amountVnd)}</p>
                  <p className="text-sm text-zinc-600">Yêu cầu: {item.requestedPoints.toLocaleString("vi-VN")} N-Point • Người gửi: {item.requester.displayName || item.requester.email}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
              </div>

              <div className="mt-2 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                <p>Nội dung chuyển khoản: {item.transferNote}</p>
                <p>Thời gian gửi: {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                <p>Admin duyệt: {item.reviewedBy?.displayName ?? "Chưa có"}</p>
                <p>Cập nhật gần nhất: {new Date(item.updatedAt).toLocaleString("vi-VN")}</p>
              </div>

              <p className="mt-1 text-xs text-zinc-500">
                Biên lai nạp:{" "}
                <a href={item.bankTransferProofUrl} target="_blank" rel="noreferrer" className="underline">
                  Xem biên lai
                </a>
              </p>

              {item.adminDecisionReason ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Lý do từ admin: {item.adminDecisionReason}
                </p>
              ) : null}

              {item.status === "PENDING_ADMIN_REVIEW" ? (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <SectionHeader title="Xử lý duyệt/từ chối" />
                  <div className="grid gap-2">
                    <textarea className="dc-input min-h-24" placeholder="Nhập lý do nếu từ chối" value={rejectReason[item.id] ?? ""} onChange={(event) => setRejectReason((prev) => ({ ...prev, [item.id]: event.target.value }))} />
                    <div className="flex gap-2">
                      <button className="dc-btn-primary" disabled={actingId === item.id} onClick={() => void approve(item)}>
                        {actingId === item.id ? "Đang xử lý..." : "Duyệt nạp điểm"}
                      </button>
                      <button className="dc-btn-secondary" disabled={actingId === item.id} onClick={() => void reject(item)}>
                        {actingId === item.id ? "Đang xử lý..." : "Từ chối"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {item.status === "REFUND_INFO_SUBMITTED" ? (
                <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-semibold text-blue-800">Thông tin hoàn tiền từ Brand</p>
                  <p className="mt-1 text-sm text-blue-700">Ngân hàng: {item.refundBankName}</p>
                  <p className="text-sm text-blue-700">Chủ tài khoản: {item.refundAccountName}</p>
                  <p className="text-sm text-blue-700">Số tài khoản: {item.refundAccountNumber}</p>
                  {item.refundRequestNote ? <p className="text-sm text-blue-700">Ghi chú Brand: {item.refundRequestNote}</p> : null}

                  <div className="mt-3 grid gap-2">
                    <input
                      className="dc-input bg-white"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(event) => void onRefundProofFileChange(item.id, event)}
                      disabled={uploadingRefundFor === item.id}
                    />
                    {uploadingRefundFor === item.id ? <p className="text-xs text-blue-700">Đang tải biên lai hoàn tiền...</p> : null}
                    {refundProofUrl[item.id] ? (
                      <p className="text-xs text-blue-700">
                        Biên lai hoàn:{" "}
                        <a href={refundProofUrl[item.id]} target="_blank" rel="noreferrer" className="underline">
                          {refundProofUrl[item.id]}
                        </a>
                      </p>
                    ) : null}
                    <input className="dc-input" placeholder="Ghi chú hoàn tiền (tuỳ chọn)" value={refundNote[item.id] ?? ""} onChange={(event) => setRefundNote((prev) => ({ ...prev, [item.id]: event.target.value }))} />
                    <button className="dc-btn-primary w-fit" onClick={() => void completeRefund(item)} disabled={actingId === item.id || uploadingRefundFor === item.id}>
                      {actingId === item.id ? "Đang gửi..." : "Gửi biên lai hoàn tiền"}
                    </button>
                  </div>
                </div>
              ) : null}

              {item.status === "REFUND_COMPLETED" ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <p>Đã hoàn tiền lúc: {item.refundProcessedAt ? new Date(item.refundProcessedAt).toLocaleString("vi-VN") : "-"}</p>
                  <p>Admin hoàn tiền: {item.refundProcessedBy?.displayName ?? "-"}</p>
                  {item.refundProofUrl ? (
                    <p>
                      Biên lai hoàn tiền:{" "}
                      <a href={item.refundProofUrl} target="_blank" rel="noreferrer" className="underline">
                        Xem biên lai
                      </a>
                    </p>
                  ) : null}
                  {item.refundProcessedNote ? <p>Ghi chú: {item.refundProcessedNote}</p> : null}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
