"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type Voucher = {
  id: string;
  voucherCode: string;
  status: "ISSUED" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  expiryAt: string | null;
  reward: { title: string; campaign: { title: string; slug: string } };
};

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/campaigns", label: "Campaign" },
  { href: "/wallet", label: "Wallet" },
  { href: "/vouchers", label: "Voucher" }
];

const statusLabel: Record<Voucher["status"], string> = {
  ISSUED: "issued",
  ACTIVE: "active",
  USED: "used",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
};

export default function MyVouchersPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/vouchers", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => {
        if (!body.success) throw new Error(body.error ?? "Load vouchers failed");
        setItems(body.data as Voucher[]);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const active = items.filter((item) => item.status === "ACTIVE" || item.status === "ISSUED").length;
    const used = items.filter((item) => item.status === "USED").length;
    const expired = items.filter((item) => item.status === "EXPIRED" || item.status === "CANCELLED").length;
    return { total: items.length, active, used, expired };
  }, [items]);

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="My Vouchers" subtitle="Theo dõi mã voucher theo trạng thái và hạn sử dụng." action={<Link className="dc-btn-primary" href="/campaigns">Khám phá campaign</Link>} />

        {error ? <ErrorState title="Không thể tải voucher" description={error} /> : null}

        {!loading ? (
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng voucher" value={`${counts.total}`} />
            <StatsCard title="Đang dùng" value={`${counts.active}`} />
            <StatsCard title="Đã dùng" value={`${counts.used}`} />
            <StatsCard title="Hết hạn/Hủy" value={`${counts.expired}`} />
          </section>
        ) : null}

        <section className="mt-8">
          <SectionHeader title="Danh sách voucher" subtitle="Sắp xếp theo thời gian nhận mới nhất" />
          {loading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-zinc-100" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title="Chưa có voucher" description="Hãy tham gia campaign và mission để nhận voucher." action={<Link href="/campaigns" className="dc-btn-primary">Xem campaign</Link>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-lg font-bold tracking-wide text-zinc-900">{item.voucherCode}</p>
                    <StatusBadge status={statusLabel[item.status]} />
                  </div>
                  <p className="mt-2 font-semibold text-zinc-900">{item.reward.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">Campaign: {item.reward.campaign.title}</p>
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
