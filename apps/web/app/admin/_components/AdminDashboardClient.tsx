"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type AdminOverview = {
  totalUsers: number;
  totalCreators: number;
  totalBrands: number;
  activeCampaigns: number;
  pendingReviews: number;
  totalContributions: number;
  fraudAlerts: number;
  queues: {
    brandPendingReview: number;
    creatorPendingReview: number;
    campaignPendingReview: number;
    creatorApplicationsPendingReview: number;
    contentSubmissionsPendingReview: number;
    productInventoryPendingReview: number;
    fulfillmentPendingIssues: number;
    payoutPendingReview: number;
  };
  totals: {
    activeCampaigns: number;
    activeBrands: number;
    activeCreators: number;
    grossRevenueVnd: number;
    commissionPayoutVnd: number;
  };
  systemAlerts: string[];
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

async function getOverview() {
  const res = await fetch("/api/admin/dashboard/overview", { cache: "no-store" });
  const body = (await res.json()) as ApiResult<AdminOverview>;
  if (!res.ok || !body.success) throw new Error(body.error ?? "Load overview failed");
  return body.data;
}

const queueCards: Array<{ key: keyof AdminOverview["queues"]; title: string; href: string }> = [
  { key: "brandPendingReview", title: "Brand chờ duyệt", href: "/admin/brand-applications" },
  { key: "creatorPendingReview", title: "Creator chờ duyệt", href: "/admin/creator-applications" },
  { key: "campaignPendingReview", title: "Campaign chờ duyệt", href: "/admin/campaigns" },
  { key: "creatorApplicationsPendingReview", title: "Creator applications", href: "/admin/creator-applications" },
  { key: "contentSubmissionsPendingReview", title: "Content submissions", href: "/admin/content-review" },
  { key: "productInventoryPendingReview", title: "Product/Inventory review", href: "/admin/product-inventory" },
  { key: "fulfillmentPendingIssues", title: "Fulfillment lỗi/chờ xử lý", href: "/admin/fulfillment" },
  { key: "payoutPendingReview", title: "Payout/commission chờ duyệt", href: "/admin/payouts" }
];

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await getOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load overview failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalQueue = useMemo(() => {
    if (!overview) return 0;
    return Object.values(overview.queues).reduce((sum, value) => sum + value, 0);
  }, [overview]);

  if (loading) {
    return (
      <>
        <PageHeader title="Admin Command Center" subtitle="Hàng chờ xử lý và cảnh báo vận hành." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !overview) {
    return <ErrorState title="Không tải được Admin Command Center" description={error || "Unknown error"} onRetry={() => void refresh()} />;
  }

  return (
    <>
      <PageHeader
        title="Admin Command Center"
        subtitle="Ưu tiên xử lý các queue pending trước khi theo dõi KPI tổng."
        action={<button className="dc-btn-secondary" onClick={() => void refresh()}>Làm mới</button>}
      />

      <section className="dc-grid-dashboard">
        <StatsCard title="Tổng queue cần xử lý" value={`${totalQueue}`} hint="Brand/Creator/Campaign/Content/Payout" />
        <StatsCard title="Campaign active" value={`${overview.totals.activeCampaigns}`} />
        <StatsCard title="Brand active" value={`${overview.totals.activeBrands}`} />
        <StatsCard title="Creator active" value={`${overview.totals.activeCreators}`} />
        <StatsCard title="Doanh thu (contribution)" value={formatVnd(overview.totals.grossRevenueVnd)} />
        <StatsCard title="Commission payout" value={formatVnd(overview.totals.commissionPayoutVnd)} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Queue xử lý" subtitle="Nhấn vào card để mở module tương ứng." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {queueCards.map((card) => (
            <Link key={card.key} href={card.href} className="dc-card p-4 transition hover:border-zinc-400">
              <p className="text-sm font-semibold text-zinc-700">{card.title}</p>
              <p className="mt-2 text-3xl font-black text-zinc-900">{overview.queues[card.key]}</p>
              <p className="mt-2 text-xs text-zinc-500">Mở chi tiết</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader title="Cảnh báo hệ thống" subtitle="Dựa trên fraud flags, payout queue và payment failures." />
        {overview.systemAlerts.length === 0 ? (
          <EmptyState title="Không có cảnh báo nghiêm trọng" description="Hệ thống đang ổn định theo ngưỡng cảnh báo hiện tại." />
        ) : (
          <div className="grid gap-2">
            {overview.systemAlerts.map((alert) => (
              <div key={alert} className="dc-card border-l-4 border-l-amber-500 p-3 text-sm text-zinc-700">
                {alert}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
