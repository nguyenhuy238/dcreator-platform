"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type WalletData = {
  wallet: { pointsBalance: number; cashBalanceVnd: number };
  transactions: Array<{ id: string; type: string; pointsDelta: number; cashDeltaVnd: number; createdAt: string; referenceType: string | null }>;
  pendingPayments: Array<{ id: string; orderCode: string; requestedAmountVnd: number; status: string }>;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export default function UserWalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wallet/me", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải ví");
        setData(payload.data as WalletData);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppShell>
        <PageHeader title="Ví / N-Points" subtitle="Số dư, giao dịch và thanh toán đang chờ xác nhận." />
        {error ? <ErrorState title="Không thể tải ví" description={error} /> : null}
        {loading ? <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" /> : null}
        {data ? (
          <>
            <section className="dc-grid-dashboard">
              <StatsCard title="Số dư N-Points" value={`${data.wallet.pointsBalance.toLocaleString("vi-VN")} điểm`} />
              <StatsCard title="Giao dịch đang xử lý" value={`${data.pendingPayments.length}`} />
              <StatsCard title="Tổng giao dịch" value={`${data.transactions.length}`} />
            </section>
            <section className="mt-8">
              <SectionHeader title="Thanh toán chờ xác nhận" />
              {data.pendingPayments.length === 0 ? (
                <EmptyState title="Không có giao dịch đang xử lý" description="Trạng thái chờ xác nhận sẽ xuất hiện tại đây." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.pendingPayments.map((payment) => (
                    <article key={payment.id} className="dc-card p-4">
                      <p className="font-semibold text-zinc-900">{payment.orderCode}</p>
                      <p className="mt-1 text-sm text-zinc-600">{formatVnd(payment.requestedAmountVnd)}</p>
                      <div className="mt-2"><StatusBadge status={payment.status.toLowerCase()} /></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="mt-8">
              <SectionHeader title="Lịch sử giao dịch" subtitle="20 giao dịch gần nhất" />
              {data.transactions.length === 0 ? (
                <EmptyState title="Chưa có giao dịch" description="Các giao dịch sẽ hiển thị tại đây." />
              ) : (
                <div className="grid gap-3">
                  {data.transactions.map((tx) => (
                    <article key={tx.id} className="dc-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-zinc-900">{tx.type}</p>
                        <p className="text-xs text-zinc-500">{new Date(tx.createdAt).toLocaleString("vi-VN")}</p>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-zinc-600 sm:grid-cols-3">
                        <p>Points: {tx.pointsDelta > 0 ? "+" : ""}{tx.pointsDelta.toLocaleString("vi-VN")}</p>
                        <p>Cash: {tx.cashDeltaVnd > 0 ? "+" : ""}{formatVnd(tx.cashDeltaVnd)}</p>
                        <p>Ref: {tx.referenceType ?? "Không có"}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </AppShell>
    </>
  );
}
