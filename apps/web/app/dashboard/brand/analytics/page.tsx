"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type AnalyticsPayload = {
  kpis?: {
    totalCampaigns: number;
    activeCampaigns: number;
    creatorApplicationCount: number;
    approvedCreatorCount: number;
    proofSubmitted: number;
    proofApproved: number;
    totalOrders: number;
    totalRevenueVnd: number;
    totalCommissionPaidVnd: number;
    conversionRatePercent: number;
  };
  campaignPerformance?: Array<{
    id: string;
    title: string;
    status: string;
    creatorApplied: number;
    creatorApproved: number;
    proofSubmitted: number;
    proofApproved: number;
    orderCount: number;
    revenueVnd: number;
    commissionPaidVnd: number;
    createdAt: string;
    deadline?: string | null;
  }>;
  topCreator?: { id: string; displayName: string } | null;
  topProduct?: { id: string; name: string; stockQty: number; voucherStock: number; priceVnd: number } | null;
  voucherRedemption?: number;
  conversionRate?: number;
  topCampaign?: {
    id: string;
    title: string;
    proofApproved: number;
    orderCount: number;
    revenueVnd: number;
    commissionPaidVnd: number;
  } | null;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

export default function BrandAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/analytics", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<AnalyticsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải dữ liệu thống kê");
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const perf = useMemo(() => data?.campaignPerformance ?? [], [data]);

  return (
    <>
      <PageHeader title="Thống kê nhãn hàng" subtitle="Theo dõi hiệu suất chiến dịch, nhà sáng tạo, bằng chứng và chuyển đổi." />

      {error ? <ErrorState title="Không thể tải dữ liệu thống kê" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng chiến dịch" value={`${data.kpis?.totalCampaigns ?? 0}`} />
            <StatsCard title="Chiến dịch đang hoạt động" value={`${data.kpis?.activeCampaigns ?? 0}`} />
            <StatsCard title="Nhà sáng tạo ứng tuyển" value={`${data.kpis?.creatorApplicationCount ?? 0}`} />
            <StatsCard title="Nhà sáng tạo được duyệt" value={`${data.kpis?.approvedCreatorCount ?? 0}`} />
            <StatsCard title="Bằng chứng đã nộp" value={`${data.kpis?.proofSubmitted ?? 0}`} />
            <StatsCard title="Bằng chứng được duyệt" value={`${data.kpis?.proofApproved ?? 0}`} />
            <StatsCard title="Tổng đơn hàng" value={`${data.kpis?.totalOrders ?? 0}`} />
            <StatsCard title="Tổng doanh thu" value={formatVnd(data.kpis?.totalRevenueVnd ?? 0)} />
            <StatsCard title="Hoa hồng nhà sáng tạo" value={formatVnd(data.kpis?.totalCommissionPaidVnd ?? 0)} />
            <StatsCard title="Voucher đã sử dụng" value={`${data.voucherRedemption ?? 0}`} />
            <StatsCard title="Tỷ lệ chuyển đổi" value={`${(data.kpis?.conversionRatePercent ?? 0).toFixed(2)}%`} />
            <StatsCard title="Giá trị đơn hàng trung bình" value={formatVnd(Number(data.conversionRate ?? 0))} />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="dc-card p-4">
              <SectionHeader title="Chiến dịch nổi bật" />
              {data.topCampaign ? (
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{data.topCampaign.title}</p>
                  <p>Doanh thu: {formatVnd(data.topCampaign.revenueVnd)}</p>
                  <p>Bằng chứng duyệt: {data.topCampaign.proofApproved.toLocaleString("vi-VN")}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có dữ liệu chiến dịch.</p>
              )}
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Nhà sáng tạo nổi bật" />
              {data.topCreator ? (
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{data.topCreator.displayName}</p>
                  <p>Mã nhà sáng tạo: {data.topCreator.id}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có dữ liệu creator.</p>
              )}
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Sản phẩm nổi bật" />
              {data.topProduct ? (
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{data.topProduct.name}</p>
                  <p>Tồn kho: {data.topProduct.stockQty.toLocaleString("vi-VN")}</p>
                  <p>Tồn kho voucher: {data.topProduct.voucherStock.toLocaleString("vi-VN")}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có dữ liệu sản phẩm.</p>
              )}
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Hiệu suất chiến dịch / nhiệm vụ" subtitle="Nhà sáng tạo, bằng chứng, đơn hàng và doanh thu theo từng chiến dịch." />
            {perf.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu hiệu suất" description="Hiệu suất chiến dịch sẽ xuất hiện khi có chiến dịch hoạt động." />
            ) : (
              <div className="grid gap-3">
                {perf.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{item.status === "ACTIVE" ? "Đang hoạt động" : item.status}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>Ứng tuyển: <span className="font-semibold text-zinc-900">{item.creatorApplied}</span></p>
                      <p>Được duyệt: <span className="font-semibold text-zinc-900">{item.creatorApproved}</span></p>
                      <p>Bằng chứng: <span className="font-semibold text-zinc-900">{item.proofSubmitted}/{item.proofApproved}</span></p>
                      <p>Đơn hàng: <span className="font-semibold text-zinc-900">{item.orderCount}</span></p>
                      <p>Doanh thu: <span className="font-semibold text-zinc-900">{formatVnd(item.revenueVnd)}</span></p>
                      <p>Hoa hồng: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionPaidVnd)}</span></p>
                    </div>
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
