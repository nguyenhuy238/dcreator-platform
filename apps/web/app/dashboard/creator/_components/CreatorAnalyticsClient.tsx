"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";
import type { CreatorAnalyticsExportType } from "@/lib/creator-analytics-csv";
import type { CreatorAnalyticsFilterOptions, CreatorAnalyticsOverview } from "@/lib/services/creator-analytics.service";

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
    ACCEPTED: "Đã nhận",
    IN_PROGRESS: "Đang thực hiện",
    DONE: "Hoàn tất",
    PRODUCT_PENDING: "Chờ sản phẩm",
    NOT_SUBMITTED: "Chưa nộp",
    PENDING: "Đang chờ"
  };
  return status ? labels[status] ?? status : "-";
}

export function CreatorAnalyticsClient() {
  const [data, setData] = useState<CreatorAnalyticsOverview | null>(null);
  const [filterOptions, setFilterOptions] = useState<CreatorAnalyticsFilterOptions | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  function buildParams(includeType?: CreatorAnalyticsExportType) {
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
      const response = await fetch(`/api/creator/dashboard/analytics${query ? `?${query}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CreatorAnalyticsOverview>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? payload.error ?? "Không thể tải thống kê nhà sáng tạo");
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải thống kê nhà sáng tạo");
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
      const response = await fetch(`/api/creator/dashboard/analytics/filter-options${query ? `?${query}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CreatorAnalyticsFilterOptions>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? payload.error ?? "Không tải được danh sách chiến dịch");
      setFilterOptions(payload.data);
      if (campaignId && !payload.data.campaigns.some((campaign) => campaign.id === campaignId)) setCampaignId("");
    } catch (requestError) {
      setOptionsError(requestError instanceof Error ? requestError.message : "Không tải được danh sách chiến dịch");
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

  function exportCsv(type: CreatorAnalyticsExportType) {
    const query = buildParams(type);
    window.location.href = `/api/creator/dashboard/analytics/export?${query}`;
  }

  useEffect(() => {
    void load();
    void loadFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = useMemo(() => {
    if (!data) return false;
    return data.overview.totalApplications > 0 || data.overview.totalMissions > 0 || data.campaignPerformance.length > 0;
  }, [data]);

  return (
    <>
      <PageHeader title="Thống kê nhà sáng tạo" subtitle="Theo dõi hiệu suất campaign, nhiệm vụ, minh chứng và thu nhập của bạn." />

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
              <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={campaignId} disabled={optionsLoading} onChange={(event) => setCampaignId(event.target.value)}>
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
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("funnel")}>
            Xuất CSV phễu
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("pendingActions")}>
            Xuất CSV chờ xử lý
          </button>
        </div>
      </section>

      {error ? <ErrorState title="Không thể tải thống kê nhà sáng tạo" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}
      {!loading && data && !hasData ? <EmptyState title="Chưa có dữ liệu thống kê nhà sáng tạo" description="Dữ liệu sẽ xuất hiện khi bạn ứng tuyển chiến dịch, nhận nhiệm vụ hoặc nộp minh chứng." /> : null}

      {!loading && data && hasData ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng lượt ứng tuyển" value={`${data.overview.totalApplications}`} />
            <StatsCard title="Ứng tuyển đã duyệt" value={`${data.overview.approvedApplications}`} />
            <StatsCard title="Tổng nhiệm vụ" value={`${data.overview.totalMissions}`} />
            <StatsCard title="Minh chứng đã duyệt" value={`${data.overview.approvedProofs}`} />
            <StatsCard title="Chờ duyệt" value={`${data.overview.pendingReviews}`} />
            <StatsCard title="Thu nhập đã ghi nhận" value={formatVnd(data.earnings.commissionCreditedVnd)} />
            <StatsCard title="Rút tiền đang chờ" value={formatVnd(data.earnings.payoutPendingVnd)} />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="dc-card p-4 lg:col-span-2">
              <SectionHeader title="Phễu chuyển đổi nhiệm vụ" subtitle="Ứng tuyển, nhiệm vụ, minh chứng và thưởng của nhà sáng tạo." />
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
              <SectionHeader title="Việc cần xử lý" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Ứng tuyển chờ duyệt: <span className="font-semibold text-zinc-900">{data.pendingActions.pendingApplications}</span></p>
                <p>Nhiệm vụ cần nhận: <span className="font-semibold text-zinc-900">{data.pendingActions.missionsToAccept}</span></p>
                <p>Minh chứng cần nộp: <span className="font-semibold text-zinc-900">{data.pendingActions.proofsToSubmit}</span></p>
                <p>Minh chứng chờ duyệt: <span className="font-semibold text-zinc-900">{data.pendingActions.pendingProofReview}</span></p>
                <p>Minh chứng cần chỉnh sửa: <span className="font-semibold text-zinc-900">{data.pendingActions.rejectedProofsToRevise}</span></p>
                <p>Rút tiền chờ xử lý: <span className="font-semibold text-zinc-900">{data.pendingActions.pendingPayouts}</span></p>
              </div>
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Tổng quan thu nhập / hoa hồng" />
            <div className="grid gap-3 md:grid-cols-4">
              <StatsCard title="Hoa hồng đã ghi nhận" value={formatVnd(data.earnings.commissionCreditedVnd)} />
              <StatsCard title="Rút tiền đã yêu cầu" value={formatVnd(data.earnings.payoutRequestedVnd)} />
              <StatsCard title="Rút tiền đã thanh toán" value={formatVnd(data.earnings.payoutPaidVnd)} />
              <StatsCard title="Rút tiền đang chờ" value={formatVnd(data.earnings.payoutPendingVnd)} />
            </div>
          </section>

          <section className="mt-6">
            <SectionHeader title="Hiệu quả chiến dịch" subtitle="Hiệu suất chiến dịch trong phạm vi nhà sáng tạo." />
            {data.campaignPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu chiến dịch" description="Hiệu quả chiến dịch sẽ xuất hiện khi bạn có ứng tuyển hoặc nhiệm vụ trong bộ lọc hiện tại." />
            ) : (
              <div className="grid gap-3">
                {data.campaignPerformance.map((item) => (
                  <article key={item.campaignId} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-zinc-900">{item.title}</p>
                        <p className="text-xs text-zinc-500">{item.brandName ?? "Không rõ thương hiệu"}</p>
                      </div>
                      <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{formatStatus(item.status)}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-5">
                      <p>Ứng tuyển: <span className="font-semibold text-zinc-900">{formatStatus(item.applicationStatus)}</span></p>
                      <p>Nhiệm vụ: <span className="font-semibold text-zinc-900">{formatStatus(item.missionStatus)}</span></p>
                      <p>Minh chứng: <span className="font-semibold text-zinc-900">{formatStatus(item.proofStatus)}</span></p>
                      <p>Hoàn thành: <span className="font-semibold text-zinc-900">{formatRate(item.completionRate)}</span></p>
                      <p>Hoa hồng: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</span></p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <SectionHeader title="Hoạt động gần đây" />
            {data.recentActivity.length === 0 ? (
              <EmptyState title="Chưa có hoạt động gần đây" description="Hoạt động sẽ xuất hiện khi có ứng tuyển, nhiệm vụ hoặc minh chứng." />
            ) : (
              <div className="grid gap-3">
                {data.recentActivity.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">{item.description ?? item.type}</p>
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
