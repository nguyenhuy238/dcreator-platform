"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type Voucher = {
  id: string;
  voucherCode: string;
  status: "ISSUED" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  expiryAt: string | null;
  reward: { title: string; campaign: { title: string; slug: string } };
};

const statusLabel: Record<Voucher["status"], string> = {
  ISSUED: "issued",
  ACTIVE: "active",
  USED: "used",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
};

export default function UserVouchersPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/vouchers", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải voucher");
        setItems(payload.data as Voucher[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    total: items.length,
    active: items.filter((x) => x.status === "ACTIVE" || x.status === "ISSUED").length,
    used: items.filter((x) => x.status === "USED").length,
    expired: items.filter((x) => x.status === "EXPIRED" || x.status === "CANCELLED").length
  }), [items]);

  return (
    <>
      <AppShell>
        <PageHeader title="Voucher của tôi" subtitle="Theo dõi trạng thái voucher đã nhận." />
        {error ? <ErrorState title="Không thể tải voucher" description={error} /> : null}
        {!loading ? (
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng voucher" value={`${counts.total}`} />
            <StatsCard title="Đang dùng" value={`${counts.active}`} />
            <StatsCard title="Đã dùng" value={`${counts.used}`} />
            <StatsCard title="Hết hạn/Hủy" value={`${counts.expired}`} />
          </section>
        ) : <div className="h-32 animate-pulse rounded-3xl bg-zinc-100" />}
        <section className="mt-8">
          <SectionHeader title="Danh sách voucher" />
          {loading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title="Chưa có voucher" description="Tham gia campaign và nhiệm vụ để nhận voucher." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-lg font-bold tracking-wide text-zinc-900">{item.voucherCode}</p>
                    <StatusBadge status={statusLabel[item.status]} />
                  </div>
                  <p className="mt-2 font-semibold text-zinc-900">{item.reward.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">Chiến dịch: {item.reward.campaign.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">Hết hạn: {item.expiryAt ? new Date(item.expiryAt).toLocaleDateString("vi-VN") : "Không giới hạn"}</p>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/vouchers/${item.voucherCode}`} className="dc-btn-secondary">Xem voucher</Link>
                    <Link href={`/campaigns/${item.reward.campaign.slug}`} className="dc-btn-secondary">Xem campaign</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </AppShell>
    </>
  );
}
