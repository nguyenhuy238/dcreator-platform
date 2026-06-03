"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

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
  requester: { id: string; displayName: string; email: string };
  reviewedBy: { id: string; displayName: string; email: string } | null;
  refundProcessedBy: { id: string; displayName: string; email: string } | null;
};

type WalletPayload = {
  brand: { id: string; name: string; ownerAccountId: string };
  currentPoints: number;
  requests: TopupRequest[];
};

type RefundForm = {
  refundBankName: string;
  refundAccountName: string;
  refundAccountNumber: string;
  refundRequestNote: string;
};

const INITIAL_REFUND_FORM: RefundForm = {
  refundBankName: "",
  refundAccountName: "",
  refundAccountNumber: "",
  refundRequestNote: ""
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function statusStyle(status: TopupRequest["status"]) {
  switch (status) {
    case "PENDING_ADMIN_REVIEW":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";
    case "REFUND_INFO_SUBMITTED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "REFUND_COMPLETED":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function statusLabel(status: TopupRequest["status"]) {
  switch (status) {
    case "PENDING_ADMIN_REVIEW":
      return "Chờ admin duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Từ chối";
    case "REFUND_INFO_SUBMITTED":
      return "Đã gửi thông tin hoàn tiền";
    case "REFUND_COMPLETED":
      return "Đã hoàn tiền";
    default:
      return status;
  }
}

function SampleQr() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <Image src="/qr-dcreator.jpg" alt="QR của dCreator" width={320} height={320} className="mx-auto h-40 w-40 rounded-lg border border-zinc-100 object-contain" />
      <p className="mt-2 text-center text-xs text-zinc-500">QR của dCreator</p>
    </div>
  );
}

export default function BrandWalletPage() {
  const [data, setData] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [amountVnd, setAmountVnd] = useState(0);
  const [transferNote, setTransferNote] = useState("");
  const [activeTab, setActiveTab] = useState<"topup" | "history">("topup");
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [billUrl, setBillUrl] = useState("");
  const [uploadingBill, setUploadingBill] = useState(false);
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [refundForms, setRefundForms] = useState<Record<string, RefundForm>>({});
  const [submittingRefundId, setSubmittingRefundId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/n-point-wallet", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<WalletPayload>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể tải ví N-Point" : payload.error);
      }
      setData(payload.data);
      const shortBrandId = payload.data.brand.id.slice(-6).toUpperCase();
      setTransferNote((current) => current || `NAP NPOINT ${shortBrandId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải ví N-Point");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approvedTotal = useMemo(
    () => (data?.requests ?? []).filter((item) => item.status === "APPROVED").reduce((sum, item) => sum + item.requestedPoints, 0),
    [data]
  );
  const pendingCount = useMemo(
    () => (data?.requests ?? []).filter((item) => item.status === "PENDING_ADMIN_REVIEW" || item.status === "REFUND_INFO_SUBMITTED").length,
    [data]
  );
  const formattedTopupAmount = useMemo(() => formatVnd(amountVnd), [amountVnd]);

  function revealTransferInfo() {
    if (amountVnd < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000 VNĐ.");
      setShowTransferInfo(false);
      return;
    }
    setError("");
    setShowTransferInfo(true);
  }

  async function uploadBill(file: File) {
    setUploadingBill(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("bill", file);
      const response = await fetch("/api/uploads/n-point-bill", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.billUrl) {
        throw new Error(payload.error ?? "Không thể tải ảnh biên lai");
      }
      setBillUrl(payload.data.billUrl as string);
      setToast("Đã tải ảnh biên lai thành công");
      setTimeout(() => setToast(""), 1500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải ảnh biên lai");
    } finally {
      setUploadingBill(false);
    }
  }

  async function onBillFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadBill(file);
  }

  async function submitTopupRequest() {
    if (amountVnd < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000 VNĐ.");
      return;
    }
    if (!transferNote.trim()) {
      setError("Bạn cần nhập nội dung chuyển khoản.");
      return;
    }
    if (!billUrl.trim()) {
      setError("Bạn cần tải ảnh biên lai chuyển khoản.");
      return;
    }

    setSubmittingTopup(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/n-point-wallet/topup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountVnd,
          transferNote: transferNote.trim(),
          bankTransferProofUrl: billUrl.trim()
        })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể gửi yêu cầu nạp điểm" : payload.error);
      }

      setBillUrl("");
      setShowTransferInfo(false);
      setActiveTab("history");
      setToast("Đã gửi yêu cầu nạp N-Point sang admin");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi yêu cầu nạp điểm");
    } finally {
      setSubmittingTopup(false);
    }
  }

  function setRefundField(requestId: string, field: keyof RefundForm, value: string) {
    setRefundForms((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] ?? INITIAL_REFUND_FORM),
        [field]: value
      }
    }));
  }

  async function submitRefundInfo(requestId: string) {
    const form = refundForms[requestId] ?? INITIAL_REFUND_FORM;
    if (!form.refundBankName.trim() || !form.refundAccountName.trim() || !form.refundAccountNumber.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin ngân hàng để hoàn tiền.");
      return;
    }

    setSubmittingRefundId(requestId);
    setError("");
    try {
      const response = await fetch(`/api/brand/dashboard/n-point-wallet/topup-requests/${requestId}/refund-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundBankName: form.refundBankName.trim(),
          refundAccountName: form.refundAccountName.trim(),
          refundAccountNumber: form.refundAccountNumber.trim(),
          refundRequestNote: form.refundRequestNote.trim() || undefined
        })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể gửi thông tin hoàn tiền" : payload.error);
      }

      setToast("Đã gửi thông tin hoàn tiền sang admin");
      setTimeout(() => setToast(""), 1800);
      setRefundForms((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi thông tin hoàn tiền");
    } finally {
      setSubmittingRefundId(null);
    }
  }

  return (
    <>
      <Link href="/dashboard/brand/settings" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900">
        <span aria-hidden="true">←</span>
        Quay lại
      </Link>
      <PageHeader title="Ví N-Point" subtitle="Theo dõi số dư N-Point và gửi yêu cầu nạp/hoàn tiền với admin." />

      {error ? <ErrorState title="Không thể xử lý ví N-Point" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Số dư N-Point hiện tại" value={`${data.currentPoints.toLocaleString("vi-VN")} điểm`} />
            <StatsCard title="Tổng điểm đã duyệt nạp" value={`${approvedTotal.toLocaleString("vi-VN")} điểm`} />
            <StatsCard title="Yêu cầu đang xử lý" value={String(pendingCount)} />
          </section>

          <section className="mt-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" className={activeTab === "topup" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setActiveTab("topup")}>
                Nạp tiền
              </button>
              <button type="button" className={activeTab === "history" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setActiveTab("history")}>
                Lịch sử
              </button>
            </div>

            {activeTab === "topup" ? (
              <div className="grid gap-4">
                <section className="dc-card p-5">
                  <SectionHeader title="Nạp tiền" subtitle="Nhập số tiền muốn nạp trước, sau đó hệ thống mới hiển thị thông tin chuyển khoản." />
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="grid gap-1 text-sm text-zinc-700">
                      <span>Số tiền muốn nạp (VNĐ)</span>
                      <input
                        className="dc-input"
                        type="number"
                        min={10000}
                        step={1000}
                        value={amountVnd || ""}
                        placeholder="Nhập số tiền muốn nạp"
                        onChange={(event) => {
                          setAmountVnd(Number(event.target.value || 0));
                          setShowTransferInfo(false);
                        }}
                      />
                    </label>
                    <button type="button" className="dc-btn-primary" onClick={revealTransferInfo}>
                      Hiện thông tin chuyển khoản
                    </button>
                  </div>
                </section>

                {showTransferInfo ? (
                  <>
                    <section className="grid gap-4 lg:grid-cols-2">
                      <article className="dc-card p-5">
                        <SectionHeader title="Thông tin chuyển khoản" subtitle="Chuyển đúng số tiền và nội dung để admin đối soát nhanh." />
                        <div className="grid gap-3 text-sm text-zinc-700">
                          <p><strong>Số tiền:</strong> {formattedTopupAmount}</p>
                          <p><strong>Ngân hàng:</strong> MB Bank</p>
                          <p><strong>Số tài khoản:</strong> 0344 000 496</p>
                          <p><strong>Chủ tài khoản:</strong> Nguyễn Thị Thanh Nhàn</p>
                          <p><strong>Nội dung chuyển khoản:</strong> {transferNote || "NAP NPOINT [MÃ BRAND]"}</p>
                        </div>
                      </article>

                      <article className="dc-card p-5">
                        <SectionHeader title="Mã QR" subtitle="Quét QR rồi nhập đúng số tiền và nội dung chuyển khoản." />
                        <SampleQr />
                      </article>
                    </section>

                    <section className="dc-card p-5">
                      <SectionHeader title="Gửi yêu cầu nạp N-Point" subtitle="Sau khi chuyển khoản, upload biên lai để gửi admin duyệt." />
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm text-zinc-700">
                          <span>Nội dung chuyển khoản</span>
                          <input className="dc-input" value={transferNote} onChange={(event) => setTransferNote(event.target.value)} />
                        </label>
                        <div className="grid gap-1 text-sm text-zinc-700">
                          <span>Ảnh/PDF biên lai chuyển tiền</span>
                          <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={onBillFileChange} disabled={uploadingBill} />
                          {uploadingBill ? <p className="text-xs text-zinc-500">Đang tải biên lai...</p> : null}
                          {billUrl ? (
                            <p className="text-xs text-zinc-600">
                              Biên lai đã tải:{" "}
                              <a href={billUrl} target="_blank" rel="noreferrer" className="underline">
                                {billUrl}
                              </a>
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4">
                        <button type="button" className="dc-btn-primary" onClick={() => void submitTopupRequest()} disabled={submittingTopup || uploadingBill}>
                          {submittingTopup ? "Đang gửi..." : "Gửi yêu cầu nạp"}
                        </button>
                      </div>
                    </section>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>

          {activeTab === "history" ? (
          <section className="mt-6">
            <SectionHeader title="Lịch sử yêu cầu nạp/hoàn tiền" subtitle={`${data.requests.length} yêu cầu`} />
            {data.requests.length === 0 ? (
              <EmptyState title="Chưa có yêu cầu nào" description="Khi Brand gửi yêu cầu nạp N-Point, lịch sử sẽ hiển thị tại đây." />
            ) : (
              <div className="grid gap-3">
                {data.requests.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{formatVnd(item.amountVnd)} • {item.requestedPoints.toLocaleString("vi-VN")} N-Point</p>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(item.status)}`}>{statusLabel(item.status)}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                      <p>Nội dung chuyển khoản: {item.transferNote}</p>
                      <p>Người gửi yêu cầu: {item.requester.displayName || item.requester.email}</p>
                      <p>Thời gian gửi: {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                      <p>Admin xử lý: {item.reviewedBy?.displayName ?? "Chưa xử lý"}</p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Biên lai chuyển tiền:{" "}
                      <a href={item.bankTransferProofUrl} target="_blank" rel="noreferrer" className="underline">
                        Xem biên lai
                      </a>
                    </p>

                    {item.adminDecisionReason ? (
                      <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Lý do từ admin: {item.adminDecisionReason}
                      </p>
                    ) : null}

                    {item.status === "REJECTED" ? (
                      <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-sm font-semibold text-zinc-900">Nhập thông tin ngân hàng để hoàn tiền</p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <input className="dc-input" placeholder="Tên ngân hàng" value={refundForms[item.id]?.refundBankName ?? ""} onChange={(event) => setRefundField(item.id, "refundBankName", event.target.value)} />
                          <input className="dc-input" placeholder="Tên chủ tài khoản" value={refundForms[item.id]?.refundAccountName ?? ""} onChange={(event) => setRefundField(item.id, "refundAccountName", event.target.value)} />
                          <input className="dc-input" placeholder="Số tài khoản" value={refundForms[item.id]?.refundAccountNumber ?? ""} onChange={(event) => setRefundField(item.id, "refundAccountNumber", event.target.value)} />
                          <input className="dc-input" placeholder="Ghi chú hoàn tiền (tuỳ chọn)" value={refundForms[item.id]?.refundRequestNote ?? ""} onChange={(event) => setRefundField(item.id, "refundRequestNote", event.target.value)} />
                        </div>
                        <button className="dc-btn-primary mt-3" onClick={() => void submitRefundInfo(item.id)} disabled={submittingRefundId === item.id}>
                          {submittingRefundId === item.id ? "Đang gửi..." : "Gửi thông tin hoàn tiền"}
                        </button>
                      </div>
                    ) : null}

                    {item.status === "REFUND_INFO_SUBMITTED" ? (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        Đã gửi thông tin hoàn tiền. Admin đang xử lý chuyển khoản hoàn.
                      </div>
                    ) : null}

                    {item.status === "REFUND_COMPLETED" ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <p>Admin đã hoàn tiền vào tài khoản bạn cung cấp.</p>
                        {item.refundProofUrl ? (
                          <p className="mt-1">
                            Biên lai hoàn tiền:{" "}
                            <a href={item.refundProofUrl} target="_blank" rel="noreferrer" className="underline">
                              Xem biên lai
                            </a>
                          </p>
                        ) : null}
                        {item.refundProcessedNote ? <p className="mt-1">Ghi chú: {item.refundProcessedNote}</p> : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
          ) : null}
        </>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
