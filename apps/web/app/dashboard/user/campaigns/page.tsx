"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type MyContribution = {
  id: string;
  amountVnd: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string;
  paymentMethod: "N_POINTS" | "PAYOS";
  campaign: { id: string; title: string; slug: string };
  reward: { id: string; title: string } | null;
  rewardClaim: { voucherCode: string } | null;
};

function contributionStatusLabel(status: MyContribution["status"]) {
  if (status === "SUCCESS") return "Thành công";
  if (status === "PENDING") return "Đang chờ";
  return "Thất bại";
}

export default function UserCampaignsPage() {
  const [items, setItems] = useState<MyContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/contributions", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải lịch sử campaign");
        setItems(payload.data as MyContribution[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const successful = useMemo(() => items.filter((x) => x.status === "SUCCESS").length, [items]);

  return (
    <>
      <AppShell>
        <PageHeader title="Campaign đã tham gia" subtitle="Lịch sử ủng hộ và trạng thái phần thưởng của bạn." action={<Link href="/campaigns" className="dc-btn-primary">Khám phá campaign</Link>} />
        {error ? <ErrorState title="Không thể tải dữ liệu" description={error} /> : null}
        {!loading ? (
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng lượt tham gia" value={`${items.length}`} />
            <StatsCard title="Thành công" value={`${successful}`} />
            <StatsCard title="Đang chờ" value={`${items.filter((x) => x.status === "PENDING").length}`} />
            <StatsCard title="Thất bại" value={`${items.filter((x) => x.status === "FAILED").length}`} />
          </section>
        ) : <div className="h-32 animate-pulse rounded-3xl bg-zinc-100" />}

        <section className="mt-8">
          <SectionHeader title="Lịch sử đóng góp" />
          {loading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title="Chưa tham gia campaign" description="Chọn campaign phù hợp để bắt đầu." action={<Link href="/campaigns" className="dc-btn-primary">Xem campaign</Link>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <p className="text-sm text-zinc-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                  <p className="mt-1 text-base font-semibold text-zinc-900">{item.campaign.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">Số tiền: {item.amountVnd.toLocaleString("vi-VN")} VND</p>
                  <p className="text-sm text-zinc-600">Thanh toán: {item.paymentMethod}</p>
                  <p className="text-sm text-zinc-600">Trạng thái: {contributionStatusLabel(item.status)}</p>
                  {item.reward ? <p className="text-sm text-zinc-600">Phần thưởng: {item.reward.title}</p> : null}
                  {item.rewardClaim ? <p className="text-sm text-emerald-700">Voucher: {item.rewardClaim.voucherCode}</p> : null}
                  <div className="mt-3">
                    <Link href={`/campaigns/${item.campaign.slug}`} className="dc-btn-secondary">Xem campaign</Link>
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
