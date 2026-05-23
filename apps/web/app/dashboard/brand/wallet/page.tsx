"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type WalletTx = {
  id: string;
  type: string;
  pointsDelta: number;
  cashDeltaVnd: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};

type WalletPayload = {
  prepaidFundBalance: number;
  transactionHistory: {
    items?: WalletTx[];
    pagination?: { totalItems: number };
  } | WalletTx[];
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

export default function BrandWalletPage() {
  const [data, setData] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand/dashboard/budget", { cache: "no-store" });
      const payload = (await res.json()) as ApiResponse<WalletPayload>;
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải quỹ Brand");
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải quỹ Brand");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const txItems = useMemo(() => {
    if (!data) return [] as WalletTx[];
    const tx = data.transactionHistory;
    if (Array.isArray(tx)) return tx;
    return tx.items ?? [];
  }, [data]);

  const totals = useMemo(() => {
    const topup = txItems.filter((item) => item.type.includes("TOPUP")).reduce((sum, item) => sum + Math.max(0, item.cashDeltaVnd), 0);
    const spent = txItems.filter((item) => item.type.includes("LOCK") || item.type.includes("SUPPORT") || item.type.includes("REWARD")).reduce((sum, item) => sum + Math.abs(Math.min(0, item.cashDeltaVnd)), 0);
    const locked = txItems.filter((item) => item.type.includes("LOCK")).reduce((sum, item) => sum + Math.abs(Math.min(0, item.cashDeltaVnd)), 0);
    return { topup, spent, locked };
  }, [txItems]);

  return (
    <>
      <PageHeader title="Quỹ Brand" subtitle="Quản lý số dư prepaid và lịch sử giao dịch quỹ Brand." />

      {error ? <ErrorState title="Không thể tải quỹ" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Số dư quỹ prepaid" value={formatVnd(data.prepaidFundBalance)} />
            <StatsCard title="Tổng đã nạp" value={formatVnd(totals.topup)} />
            <StatsCard title="Tổng đã dùng" value={formatVnd(totals.spent)} />
            <StatsCard title="Đang lock" value={formatVnd(totals.locked)} />
            <StatsCard title="Khả dụng" value={formatVnd(Math.max(0, data.prepaidFundBalance - totals.locked))} />
          </section>

          <section className="mt-6">
            <SectionHeader title="Lịch sử giao dịch" subtitle={`${txItems.length} giao dịch`} action={<button className="dc-btn-secondary" onClick={() => window.print()}>Xuất lịch sử</button>} />
            {txItems.length === 0 ? (
              <EmptyState title="Chưa có giao dịch quỹ" description="Giao dịch quỹ Brand sẽ xuất hiện sau khi nạp hoặc phân bổ ngân sách campaign." />
            ) : (
              <div className="grid gap-3">
                {txItems.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.type}</p>
                      <StatusBadge status={item.cashDeltaVnd >= 0 ? "SUCCESS" : "PENDING"} />
                    </div>
                    <div className="mt-1 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                      <p>Biến động tiền: {formatVnd(item.cashDeltaVnd)}</p>
                      <p>Biến động điểm: {item.pointsDelta.toLocaleString("vi-VN")}</p>
                      <p>Campaign/Ref type: {item.referenceType ?? "Không có"}</p>
                      <p>Thời gian: {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                    {item.referenceId ? <p className="mt-1 text-xs text-zinc-500">Ref ID: {item.referenceId}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
