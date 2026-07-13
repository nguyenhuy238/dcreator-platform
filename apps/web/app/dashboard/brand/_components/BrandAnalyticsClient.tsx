"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";
import type { BrandAnalyticsExportType } from "@/lib/brand-analytics-csv";
import type { BrandAnalyticsFilterOptions, BrandAnalyticsOverview } from "@/lib/services/brand-analytics.service";

type ApiResponse<T> = { success: boolean; data?: T; error?: string; message?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatStatus(status: string | null | undefined) {
  const labels: Record<string, string> = {
    ACTIVE: "Đang chạy",
    COMPLETED: "Hoàn tất",
    DRAFT: "Bản nháp",
    CANCELLED: "Đã hủy",
    ARCHIVED: "Lưu trữ",
    PAUSED: "Tạm dừng",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    PENDING_REVIEW: "Chờ duyệt",
    IN_PROGRESS: "Đang thực hiện",
    DONE: "Hoàn tất"
  };
  return status ? labels[status] ?? status : "-";
}

export function BrandAnalyticsClient() {
  const [data, setData] = useState<BrandAnalyticsOverview | null>(null);
  const [filterOptions, setFilterOptions] = useState<BrandAnalyticsFilterOptions | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  function buildParams(includeType?: BrandAnalyticsExportType) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (campaignId) params.set("campaignId", campaignId);
    if (includeType) params.set("type", includeType);
    return params.toString();
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = buildParams();
      const response = await fetch(`/api/brand/dashboard/analytics${query ? `?${query}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<BrandAnalyticsOverview>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? payload.error ?? "Không thể tải dữ liệu thống kê");
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  }

  async function loadFilterOptions() {
    setOptionsLoading(true);
    setOptionsError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      const response = await fetch(`/api/brand/dashboard/analytics/filter-options${query ? `?${query}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<BrandAnalyticsFilterOptions>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? payload.error ?? "Không tải được danh sách campaign");
      setFilterOptions(payload.data);
      if (campaignId && !payload.data.campaigns.some((campaign) => campaign.id === campaignId)) setCampaignId("");
    } catch (e) {
      setOptionsError(e instanceof Error ? e.message : "Không tải được danh sách campaign");
      setFilterOptions(null);
    } finally {
      setOptionsLoading(false);
    }
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setCampaignId("");
  }

  function exportCsv(type: BrandAnalyticsExportType) {
    const query = buildParams(type);
    window.location.href = `/api/brand/dashboard/analytics/export?${query}`;
  }

  useEffect(() => {
    void load();
    void loadFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = useMemo(() => {
    if (!data) return false;
    return data.overview.totalCampaigns > 0 || data.campaignPerformance.length > 0 || data.creatorPerformance.length > 0;
  }, [data]);

  return (
    <>
      <PageHeader title="Thống kê thương hiệu" subtitle="Theo dõi hiệu quả chiến dịch, nhà sáng tạo, minh chứng và hoa hồng." />

      <section className="dc-card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Từ ngày
            <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Đến ngày
            <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700 md:col-span-2">
            Chiến dịch
            {filterOptions ? (
              <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                <option value="">Tất cả chiến dịch</option>
                {filterOptions.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} ({formatStatus(campaign.status)})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder={optionsLoading ? "Đang tải chiến dịch..." : "Mã chiến dịch"}
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
              />
            )}
          </label>
        </div>
        {optionsError ? <p className="mt-2 text-sm text-amber-600">Không tải được danh sách chiến dịch. Có thể nhập mã chiến dịch để lọc.</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" onClick={() => void load()}>
            Áp dụng bộ lọc
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={resetFilters}>
            Đặt lại
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("campaignPerformance")}>
            Xuất CSV chiến dịch
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("creatorPerformance")}>
            Xuất CSV nhà sáng tạo
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("funnel")}>
            Xuất CSV phễu
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("pendingReview")}>
            Xuất CSV chờ duyệt
          </button>
        </div>
      </section>

      {error ? <ErrorState title="Không thể tải dữ liệu thống kê" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}
      {!loading && data && !hasData ? <EmptyState title="Chưa có dữ liệu thống kê thương hiệu" description="Dữ liệu sẽ xuất hiện khi thương hiệu có chiến dịch, nhiệm vụ nhà sáng tạo hoặc minh chứng." /> : null}

      {!loading && data && hasData ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng chiến dịch" value={`${data.overview.totalCampaigns}`} />
            <StatsCard title="Chiến dịch đang chạy" value={`${data.overview.activeCampaigns}`} />
            <StatsCard title="Tổng lượt ứng tuyển" value={`${data.overview.totalApplications}`} />
            <StatsCard title="Ứng tuyển đã duyệt" value={`${data.overview.approvedApplications}`} />
            <StatsCard title="Minh chứng đã duyệt" value={`${data.overview.proofApproved}`} />
            <StatsCard title="Chờ duyệt" value={`${data.overview.pendingReviews}`} />
            <StatsCard title="Hoa hồng đã ghi nhận" value={formatVnd(data.payments.commissionCreditedVnd)} />
            <StatsCard title="Rút tiền đang chờ" value={formatVnd(data.payments.payoutPendingVnd)} />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="dc-card p-4 lg:col-span-2">
              <SectionHeader title="Phễu chuyển đổi chiến dịch" subtitle="Ứng tuyển, nhiệm vụ, minh chứng và thưởng trong phạm vi thương hiệu." />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Lượt ứng tuyển", data.funnel.applications],
                  ["Ứng tuyển đã duyệt", data.funnel.approvedApplications],
                  ["Nhiệm vụ đã giao", data.funnel.assignedMissions],
                  ["Minh chứng đã nộp", data.funnel.proofSubmitted],
                  ["Minh chứng đã duyệt", data.funnel.proofApproved],
                  ["Thưởng đã ghi nhận", data.funnel.rewardCredited]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-3">
                <p>Tỷ lệ duyệt ứng tuyển: <span className="font-semibold text-zinc-900">{formatRate(data.funnel.applicationApprovalRate)}</span></p>
                <p>Tỷ lệ duyệt minh chứng: <span className="font-semibold text-zinc-900">{formatRate(data.funnel.proofApprovalRate)}</span></p>
                <p>Tỷ lệ hoàn thành nhiệm vụ: <span className="font-semibold text-zinc-900">{formatRate(data.funnel.missionCompletionRate)}</span></p>
              </div>
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Chờ duyệt" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Ứng tuyển: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingApplications}</span></p>
                <p>Minh chứng: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingProofs}</span></p>
                <p>Video chờ duyệt: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingVideoReviews}</span></p>
                <p>Duyệt cuối: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingFinalReviews}</span></p>
                <p>Rút tiền: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingPayouts}</span></p>
              </div>
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Tổng quan thanh toán / hoa hồng" />
            <div className="grid gap-3 md:grid-cols-4">
              <StatsCard title="Hoa hồng đã ghi nhận" value={formatVnd(data.payments.commissionCreditedVnd)} />
              <StatsCard title="Rút tiền đã yêu cầu" value={formatVnd(data.payments.payoutRequestedVnd)} />
              <StatsCard title="Rút tiền đã thanh toán" value={formatVnd(data.payments.payoutPaidVnd)} />
              <StatsCard title="Rút tiền đang chờ" value={formatVnd(data.payments.payoutPendingVnd)} />
            </div>
          </section>

          <section className="mt-6">
            <SectionHeader title="Hiệu quả chiến dịch" subtitle="Hiệu suất nhiệm vụ nhà sáng tạo và minh chứng theo chiến dịch." />
            {data.campaignPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu chiến dịch" description="Hiệu quả chiến dịch sẽ xuất hiện khi thương hiệu có chiến dịch trong bộ lọc hiện tại." />
            ) : (
              <div className="grid gap-3">
                {data.campaignPerformance.map((item) => (
                  <article key={item.campaignId} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{formatStatus(item.status)}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-5">
                      <p>Nhiệm vụ: <span className="font-semibold text-zinc-900">{item.totalCreatorMissions}</span></p>
                      <p>Đã duyệt: <span className="font-semibold text-zinc-900">{item.approvedApplications}</span></p>
                      <p>Minh chứng: <span className="font-semibold text-zinc-900">{item.submittedProofs}/{item.approvedProofs}</span></p>
                      <p>Hoàn thành: <span className="font-semibold text-zinc-900">{formatRate(item.completionRate)}</span></p>
                      <p>Hoa hồng: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</span></p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <SectionHeader title="Hiệu quả nhà sáng tạo" subtitle="Hiệu suất nhà sáng tạo trong chiến dịch của thương hiệu." />
            {data.creatorPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu nhà sáng tạo" description="Hiệu quả nhà sáng tạo sẽ xuất hiện khi có nhiệm vụ trong phạm vi thương hiệu." />
            ) : (
              <div className="grid gap-3">
                {data.creatorPerformance.map((item) => (
                  <article key={item.creatorId} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.displayName}</p>
                      <p className="text-xs text-zinc-500">{item.creatorId}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-5">
                      <p>Chiến dịch: <span className="font-semibold text-zinc-900">{item.campaignCount}</span></p>
                      <p>Nhiệm vụ đã duyệt: <span className="font-semibold text-zinc-900">{item.approvedMissions}</span></p>
                      <p>Minh chứng: <span className="font-semibold text-zinc-900">{item.submittedProofs}/{item.approvedProofs}</span></p>
                      <p>Hoàn thành: <span className="font-semibold text-zinc-900">{formatRate(item.completionRate)}</span></p>
                      <p>Hoa hồng: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</span></p>
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
