"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type Settings = {
  reviewSlaHours: number;
  payoutAutoThresholdVnd: number;
  fraudScoreThreshold: number;
  requireRejectReason: boolean;
  requireRequestChangesReason: boolean;
  maintenanceMessage: string;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<Settings>({
    reviewSlaHours: 24,
    payoutAutoThresholdVnd: 5000000,
    fraudScoreThreshold: 70,
    requireRejectReason: true,
    requireRequestChangesReason: true,
    maintenanceMessage: ""
  });

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/settings", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Không thể tải cấu hình.");
      setLoading(false);
      return;
    }
    setForm(payload.data as Settings);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Cập nhật cấu hình thất bại.");
      return;
    }
    setToast("Đã lưu cấu hình vận hành.");
    setTimeout(() => setToast(""), 2000);
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error && !submitting) return <ErrorState title="Không thể tải trang cài đặt" description={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt vận hành Admin" subtitle="Quản lý SLA duyệt, ngưỡng payout và rule kiểm soát rủi ro." />
      {toast ? <ActionToast message={toast} /> : null}
      {error ? <ErrorState title="Lỗi cập nhật" description={error} /> : null}

      <form className="dc-card grid gap-4 p-5 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          SLA duyệt (giờ)
          <input className="dc-input" type="number" min={1} max={168} value={form.reviewSlaHours} onChange={(e) => setForm((prev) => ({ ...prev, reviewSlaHours: Number(e.target.value) }))} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Ngưỡng payout tự động (VND)
          <input className="dc-input" type="number" min={0} value={form.payoutAutoThresholdVnd} onChange={(e) => setForm((prev) => ({ ...prev, payoutAutoThresholdVnd: Number(e.target.value) }))} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Ngưỡng cảnh báo fraud (%)
          <input className="dc-input" type="number" min={0} max={100} value={form.fraudScoreThreshold} onChange={(e) => setForm((prev) => ({ ...prev, fraudScoreThreshold: Number(e.target.value) }))} />
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" checked={form.requireRejectReason} onChange={(e) => setForm((prev) => ({ ...prev, requireRejectReason: e.target.checked }))} />
          Bắt buộc lý do khi từ chối
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" checked={form.requireRequestChangesReason} onChange={(e) => setForm((prev) => ({ ...prev, requireRequestChangesReason: e.target.checked }))} />
          Bắt buộc lý do khi yêu cầu chỉnh sửa
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700 md:col-span-2">
          Thông báo bảo trì (tuỳ chọn)
          <textarea className="dc-input min-h-24" value={form.maintenanceMessage} onChange={(e) => setForm((prev) => ({ ...prev, maintenanceMessage: e.target.value }))} />
        </label>
        <div className="md:col-span-2">
          <button className="dc-btn-primary" disabled={submitting}>{submitting ? "Đang lưu..." : "Lưu cấu hình"}</button>
        </div>
      </form>
    </div>
  );
}
