"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type ReportData = {
  period: "7d" | "30d" | "month";
  totals: {
    totalCampaigns: number;
    activeCampaigns: number;
    pendingCampaigns: number;
    totalBrands: number;
    activeBrands: number;
    totalCreators: number;
    activeCreators: number;
    totalRevenueVnd: number;
  };
  pendingReviewsByType: {
    brand: number;
    creator: number;
    campaign: number;
    creatorApplications: number;
    content: number;
    productInventory: number;
  };
  opsStatus: { payoutPending: number; fulfillmentPendingIssues: number };
  contentReview: { reviewed: number; approved: number; rejected: number; approvalRate: number };
  topCreatorPerformance: Array<{ accountId: string; name: string; email: string; submissions: number }>;
  topCampaignPerformance: Array<{ campaignId: string; title: string; status: string; contributionCount: number; revenueVnd: number }>;
};

export function AdminReportsClient({ source = "reports" }: { source?: "reports" | "analytics" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"7d" | "30d" | "month">("7d");
  const [data, setData] = useState<ReportData | null>(null);

  async function load(nextPeriod = period) {
    setLoading(true);
    setError("");
    try {
      const endpoint = source === "analytics" ? "/api/admin/analytics" : "/api/admin/reports";
      const res = await fetch(`${endpoint}?period=${nextPeriod}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ReportData>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải báo cáo thất bại");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải báo cáo thất bại");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title={source === "analytics" ? "Phân tích quản trị" : "Báo cáo quản trị"}
        subtitle="Tổng hợp hiệu quả vận hành theo dữ liệu thật từ hệ thống."
        action={<button className="dc-btn-secondary" onClick={() => void load(period)}>Làm mới</button>}
      />
      <section className="dc-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className={`dc-btn-secondary ${period === "7d" ? "border-zinc-900" : ""}`} onClick={() => { setPeriod("7d"); void load("7d"); }}>7 ngày</button>
          <button className={`dc-btn-secondary ${period === "30d" ? "border-zinc-900" : ""}`} onClick={() => { setPeriod("30d"); void load("30d"); }}>30 ngày</button>
          <button className={`dc-btn-secondary ${period === "month" ? "border-zinc-900" : ""}`} onClick={() => { setPeriod("month"); void load("month"); }}>Tháng này</button>
        </div>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={6} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được báo cáo" description={error} onRetry={() => void load(period)} /></div> : null}
      {!loading && !error && data ? (
        <>
          <section className="mt-4 dc-grid-dashboard">
            <StatsCard title="Total campaigns" value={`${data.totals.totalCampaigns}`} />
            <StatsCard title="Active campaigns" value={`${data.totals.activeCampaigns}`} />
            <StatsCard title="Pending campaigns" value={`${data.totals.pendingCampaigns}`} />
            <StatsCard title="Total brands" value={`${data.totals.totalBrands}`} />
            <StatsCard title="Active brands" value={`${data.totals.activeBrands}`} />
            <StatsCard title="Total creators" value={`${data.totals.totalCreators}`} />
            <StatsCard title="Active creators" value={`${data.totals.activeCreators}`} />
            <StatsCard title="Total revenue" value={`${data.totals.totalRevenueVnd.toLocaleString("vi-VN")} VND`} />
          </section>

          <section className="mt-8">
            <SectionHeader title="Risk / Verification Operations" subtitle="Theo loại nghiệp vụ cần giám sát." />
            <div className="grid gap-3 md:grid-cols-3">
              <StatsCard title="Brand cần giám sát" value={`${data.pendingReviewsByType.brand}`} />
              <StatsCard title="Creator cần giám sát" value={`${data.pendingReviewsByType.creator}`} />
              <StatsCard title="Chiến dịch" value={`${data.pendingReviewsByType.campaign}`} />
              <StatsCard title="Creator missions đang chạy" value={`${data.pendingReviewsByType.creatorApplications}`} />
              <StatsCard title="Content" value={`${data.pendingReviewsByType.content}`} />
              <StatsCard title="Product/Inventory" value={`${data.pendingReviewsByType.productInventory}`} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Ops Status" subtitle="Fulfillment và payout queue." />
            <div className="grid gap-3 md:grid-cols-2">
              <StatsCard title="Payout pending" value={`${data.opsStatus.payoutPending}`} />
              <StatsCard title="Fulfillment pending/issues" value={`${data.opsStatus.fulfillmentPendingIssues}`} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Content Review Health" subtitle="Approval rate trên submissions đã review." />
            <div className="grid gap-3 md:grid-cols-4">
              <StatsCard title="Reviewed" value={`${data.contentReview.reviewed}`} />
              <StatsCard title="Approved" value={`${data.contentReview.approved}`} />
              <StatsCard title="Rejected" value={`${data.contentReview.rejected}`} />
              <StatsCard title="Approval rate" value={`${data.contentReview.approvalRate}%`} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Top Creator Performance" />
            {data.topCreatorPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu hiệu suất Creator" description="Chưa có dữ liệu trong kỳ lọc." />
            ) : (
              <div className="grid gap-3">
                {data.topCreatorPerformance.map((item) => (
                  <article key={item.accountId} className="dc-card p-4">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.email}</p>
                    <p className="mt-1 text-sm text-zinc-700">Completed submissions: {item.submissions}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <SectionHeader title="Top Campaign Performance" />
            {data.topCampaignPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu hiệu suất chiến dịch" description="Chưa có dữ liệu doanh thu campaign trong kỳ lọc." />
            ) : (
              <div className="grid gap-3">
                {data.topCampaignPerformance.map((item) => (
                  <article key={item.campaignId} className="dc-card p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-zinc-500">Status: {item.status}</p>
                    <p className="mt-1 text-sm text-zinc-700">Contribution count: {item.contributionCount}</p>
                    <p className="text-sm text-zinc-700">Revenue: {item.revenueVnd.toLocaleString("vi-VN")} VND</p>
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
