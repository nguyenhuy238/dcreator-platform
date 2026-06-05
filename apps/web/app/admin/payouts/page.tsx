"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { ActionToast, ConfirmDialog, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type PayoutStatus = "" | "PENDING" | "APPROVED" | "REJECTED" | "PAID";
type Item = {
  id: string;
  amountVnd: number;
  status: string;
  note: string | null;
  createdAt: string;
  account: { id: string; displayName: string; email: string };
};

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<PayoutStatus>("PENDING");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [actingId, setActingId] = useState("");
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null);

  const tabs = [
    { key: "PENDING", label: "Chờ duyệt" },
    { key: "APPROVED", label: "Đã duyệt, chờ chuyển tiền" },
    { key: "PAID", label: "Đã chuyển tiền" },
    { key: "REJECTED", label: "Bị từ chối" },
    { key: "", label: "Tất cả" }
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/payouts?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải yêu cầu rút thưởng thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải yêu cầu rút thưởng thất bại");
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAsPaid(id: string) {
    setActingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${id}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không thể xác nhận đã chuyển tiền");
      setToast("Đã xác nhận chuyển tiền thành công.");
      setTimeout(() => setToast(""), 2200);
      setConfirmPaidId(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xác nhận đã chuyển tiền");
    } finally {
      setActingId("");
    }
  }

  return (
    <>
      <PageHeader title="Payout Requests" subtitle="Admin/OPS review payout queue." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <AdminTabs items={tabs} value={status} onChange={(key) => setStatus(key as PayoutStatus)} />
        <div className="grid gap-2 md:grid-cols-3">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value as PayoutStatus)}>
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="PAID">PAID</option>
          </select>
          <input className="dc-input md:col-span-2" placeholder="Search creator/email/note" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Lọc</button>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được payout requests" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có payout requests" description="Queue đang trống theo bộ lọc hiện tại." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.account.email}</p>
                    <p className="mt-1 text-sm text-zinc-700">{item.amountVnd.toLocaleString("vi-VN")} VND</p>
                    {item.note ? <p className="text-xs text-zinc-600">{item.note}</p> : null}
                  </div>
                  <StatusBadge status={item.status.toLowerCase()} />
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    <Link className="dc-btn-primary" href={`/admin/payouts/${item.id}`}>Xem chi tiết</Link>
                    {item.status === "APPROVED" ? (
                      <button
                        type="button"
                        className="dc-btn-secondary"
                        disabled={actingId === item.id}
                        onClick={() => setConfirmPaidId(item.id)}
                      >
                        {actingId === item.id ? "Đang xác nhận..." : "Xác nhận đã chuyển tiền"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
      <ConfirmDialog
        open={Boolean(confirmPaidId)}
        title="Xác nhận đã chuyển tiền?"
        message="Thao tác này sẽ đánh dấu yêu cầu rút tiền là đã chuyển khoản thành công."
        confirmLabel="Đã chuyển tiền"
        cancelLabel="Huỷ"
        onCancel={() => setConfirmPaidId(null)}
        onConfirm={() => {
          if (confirmPaidId) void markAsPaid(confirmPaidId);
        }}
      />
      {toast ? <ActionToast message={toast} onClose={() => setToast("")} /> : null}
    </>
  );
}
