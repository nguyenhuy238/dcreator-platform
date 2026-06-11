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
  topCampaignPerformance: Array<{ campaignId: string; title: string; status: string; orderCount: number; revenueVnd: number }>;
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
            <StatsCard title="Tổng chiến dịch" value={`${data.totals.totalCampaigns}`} />
            <StatsCard title="Chiến dịch đang hoạt động" value={`${data.totals.activeCampaigns}`} />
            <StatsCard title="Chiến dịch chờ xử lý" value={`${data.totals.pendingCampaigns}`} />
            <StatsCard title="Tổng nhãn hàng" value={`${data.totals.totalBrands}`} />
            <StatsCard title="Nhãn hàng đang hoạt động" value={`${data.totals.activeBrands}`} />
            <StatsCard title="Tổng nhà sáng tạo" value={`${data.totals.totalCreators}`} />
            <StatsCard title="Nhà sáng tạo đang hoạt động" value={`${data.totals.activeCreators}`} />
            <StatsCard title="Tổng doanh thu" value={`${data.totals.totalRevenueVnd.toLocaleString("vi-VN")} VNĐ`} />
          </section>

          <section className="mt-8">
            <SectionHeader title="Rủi ro và xác minh" subtitle="Theo loại nghiệp vụ cần giám sát." />
            <div className="grid gap-3 md:grid-cols-3">
              <StatsCard title="Nhãn hàng cần giám sát" value={`${data.pendingReviewsByType.brand}`} />
              <StatsCard title="Nhà sáng tạo cần giám sát" value={`${data.pendingReviewsByType.creator}`} />
              <StatsCard title="Chiến dịch" value={`${data.pendingReviewsByType.campaign}`} />
              <StatsCard title="Nhiệm vụ nhà sáng tạo đang chạy" value={`${data.pendingReviewsByType.creatorApplications}`} />
              <StatsCard title="Nội dung" value={`${data.pendingReviewsByType.content}`} />
              <StatsCard title="Sản phẩm / tồn kho" value={`${data.pendingReviewsByType.productInventory}`} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Trạng thái vận hành" subtitle="Đơn xử lý và yêu cầu chi trả đang chờ." />
            <div className="grid gap-3 md:grid-cols-2">
              <StatsCard title="Chi trả đang chờ" value={`${data.opsStatus.payoutPending}`} />
              <StatsCard title="Đơn xử lý chờ / có lỗi" value={`${data.opsStatus.fulfillmentPendingIssues}`} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Tình trạng duyệt nội dung" subtitle="Tỷ lệ duyệt trên các nội dung đã được kiểm tra." />
            <div className="grid gap-3 md:grid-cols-4">
              <StatsCard title="Đã kiểm tra" value={`${data.contentReview.reviewed}`} />
              <StatsCard title="Đã duyệt" value={`${data.contentReview.approved}`} />
              <StatsCard title="Bị từ chối" value={`${data.contentReview.rejected}`} />
              <StatsCard title="Tỷ lệ duyệt" value={`${data.contentReview.approvalRate}%`} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Hiệu suất nhà sáng tạo nổi bật" />
            {data.topCreatorPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu hiệu suất nhà sáng tạo" description="Chưa có dữ liệu trong kỳ lọc." />
            ) : (
              <div className="grid gap-3">
                {data.topCreatorPerformance.map((item) => (
                  <article key={item.accountId} className="dc-card p-4">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.email}</p>
                    <p className="mt-1 text-sm text-zinc-700">Nội dung hoàn thành: {item.submissions}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <SectionHeader title="Hiệu suất chiến dịch nổi bật" />
            {data.topCampaignPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu hiệu suất chiến dịch" description="Chưa có dữ liệu doanh thu chiến dịch trong kỳ lọc." />
            ) : (
              <div className="grid gap-3">
                {data.topCampaignPerformance.map((item) => (
                  <article key={item.campaignId} className="dc-card p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-zinc-500">Trạng thái: {item.status === "ACTIVE" ? "Đang hoạt động" : item.status}</p>
                    <p className="mt-1 text-sm text-zinc-700">Số đơn hàng: {item.orderCount}</p>
                    <p className="text-sm text-zinc-700">Doanh thu: {item.revenueVnd.toLocaleString("vi-VN")} VNĐ</p>
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
