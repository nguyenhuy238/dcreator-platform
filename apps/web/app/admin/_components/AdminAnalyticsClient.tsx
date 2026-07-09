"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";
import type { AdminAnalyticsFilterOptions, AdminAnalyticsOverview } from "@/lib/services/admin-analytics.service";

type ApiResult<T> = { success: boolean; data?: T; error?: string; message?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function todayInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toApiDate(value: string, endOfDay = false) {
  if (!value) return "";
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`;
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">{children}</div>;
}

function EmptyTable({ title, description }: { title: string; description: string }) {
  return <EmptyState title={title} description={description} />;
}

export function AdminAnalyticsClient() {
  const defaultFrom = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return todayInputValue(date);
  }, []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayInputValue(new Date()));
  const [brandId, setBrandId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [filterOptions, setFilterOptions] = useState<AdminAnalyticsFilterOptions>({ brands: [], campaigns: [] });
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);

  const buildAnalyticsParams = useCallback((includeType?: string) => {
    const params = new URLSearchParams();
    if (includeType) params.set("type", includeType);
    if (from) params.set("from", toApiDate(from));
    if (to) params.set("to", toApiDate(to, true));
    if (brandId.trim()) params.set("brandId", brandId.trim());
    if (campaignId.trim()) params.set("campaignId", campaignId.trim());
    return params;
  }, [brandId, campaignId, from, to]);

  const loadFilterOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError("");
    const params = new URLSearchParams();
    if (from) params.set("from", toApiDate(from));
    if (to) params.set("to", toApiDate(to, true));

    try {
      const response = await fetch(`/api/admin/dashboard/analytics/filter-options?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResult<AdminAnalyticsFilterOptions>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? payload.error ?? "Không thể tải danh sách bộ lọc");
      }
      setFilterOptions(payload.data);
    } catch (requestError) {
      setOptionsError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách bộ lọc");
      setFilterOptions({ brands: [], campaigns: [] });
    } finally {
      setOptionsLoading(false);
    }
  }, [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = buildAnalyticsParams();

    try {
      const response = await fetch(`/api/admin/dashboard/analytics?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResult<AdminAnalyticsOverview>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? payload.error ?? "Không thể tải thống kê quản trị");
      }
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải thống kê quản trị");
    } finally {
      setLoading(false);
    }
  }, [buildAnalyticsParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  const totalPendingReviews = data
    ? data.pendingReview.pendingApplications + data.pendingReview.pendingProofs + data.pendingReview.pendingVideoReviews + data.pendingReview.pendingFinalReviews + data.pendingReview.pendingPayouts
    : 0;
  const campaignOptions = brandId ? filterOptions.campaigns.filter((item) => item.brandId === brandId) : filterOptions.campaigns;

  function resetFilters() {
    setFrom(defaultFrom);
    setTo(todayInputValue(new Date()));
    setBrandId("");
    setCampaignId("");
  }

  function exportCsv(type: "campaignPerformance" | "topCreators" | "funnel" | "pendingReview") {
    window.location.href = `/api/admin/dashboard/analytics/export?${buildAnalyticsParams(type).toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Thống kê quản trị"
        subtitle="Theo dõi toàn bộ chiến dịch, nhà sáng tạo, minh chứng và thanh toán trên hệ thống."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="dc-card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_160px_1fr_1fr_auto]">
          <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
            Từ ngày
            <input className="dc-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
            Đến ngày
            <input className="dc-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          {optionsError ? (
            <>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Mã thương hiệu
                <input className="dc-input" value={brandId} onChange={(event) => setBrandId(event.target.value)} placeholder="Tất cả thương hiệu" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Mã chiến dịch
                <input className="dc-input" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="Tất cả chiến dịch" />
              </label>
            </>
          ) : (
            <>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Thương hiệu
                <select
                  className="dc-input"
                  value={brandId}
                  disabled={optionsLoading}
                  onChange={(event) => {
                    setBrandId(event.target.value);
                    setCampaignId("");
                  }}
                >
                  <option value="">Tất cả thương hiệu</option>
                  {filterOptions.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name} ({brand.campaignCount})</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Chiến dịch
                <select className="dc-input" value={campaignId} disabled={optionsLoading} onChange={(event) => setCampaignId(event.target.value)}>
                  <option value="">Tất cả chiến dịch</option>
                  {campaignOptions.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.title} · {campaign.status}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="flex flex-col gap-2 md:flex-row xl:flex-col xl:items-stretch xl:justify-end">
            <button className="dc-btn-primary w-full" onClick={() => void load()}>Áp dụng bộ lọc</button>
            <button className="dc-btn-secondary w-full" onClick={resetFilters}>Đặt lại</button>
          </div>
        </div>
        {optionsError ? <p className="mt-3 text-sm text-amber-700">Không thể tải danh sách bộ lọc: {optionsError}. Có thể nhập ID thủ công.</p> : null}
      </section>

      {loading ? <LoadingSkeleton rows={7} /> : null}
      {error ? <ErrorState title="Không thể tải thống kê quản trị" description={error} onRetry={() => void load()} /> : null}

      {!loading && !error && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng chiến dịch" value={data.overview.totalCampaigns.toLocaleString("vi-VN")} />
            <StatsCard title="Chiến dịch đang chạy" value={data.overview.activeCampaigns.toLocaleString("vi-VN")} />
            <StatsCard title="Tổng lượt ứng tuyển" value={data.funnel.applications.toLocaleString("vi-VN")} />
            <StatsCard title="Minh chứng đã duyệt" value={data.funnel.proofApproved.toLocaleString("vi-VN")} hint={formatPercent(data.funnel.proofApprovalRate)} />
            <StatsCard title="Chờ duyệt" value={totalPendingReviews.toLocaleString("vi-VN")} />
            <StatsCard title="Rút tiền đang chờ" value={formatVnd(data.payments.payoutPendingVnd)} />
          </section>

          <section className="mt-8">
            <SectionHeader title="Tổng quan chiến dịch" subtitle="Trạng thái chiến dịch và yêu cầu tạo chiến dịch từ thương hiệu." />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricRow label="Đã hoàn tất" value={data.overview.completedCampaigns.toLocaleString("vi-VN")} />
              <MetricRow label="Bản nháp" value={data.overview.draftCampaigns.toLocaleString("vi-VN")} />
              <MetricRow label="Đã hủy / lưu trữ" value={data.overview.cancelledCampaigns.toLocaleString("vi-VN")} />
              <MetricRow label="Yêu cầu thương hiệu chờ duyệt" value={data.overview.pendingBrandCampaignRequests.toLocaleString("vi-VN")} />
              <MetricRow label="Yêu cầu thương hiệu đã duyệt" value={data.overview.approvedBrandCampaignRequests.toLocaleString("vi-VN")} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Phễu chuyển đổi nhiệm vụ"
              subtitle="Nguồn chính: CreatorMission. Không tính donation/backer/contribution legacy."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("funnel")}>Xuất CSV phễu</button>}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricRow label="Lượt ứng tuyển" value={data.funnel.applications.toLocaleString("vi-VN")} />
              <MetricRow label="Ứng tuyển đã duyệt" value={data.funnel.approvedApplications.toLocaleString("vi-VN")} hint={formatPercent(data.funnel.applicationApprovalRate)} />
              <MetricRow label="Nhiệm vụ đã giao" value={data.funnel.assignedMissions.toLocaleString("vi-VN")} />
              <MetricRow label="Minh chứng đã nộp" value={data.funnel.proofSubmitted.toLocaleString("vi-VN")} />
              <MetricRow label="Thưởng đã ghi nhận" value={data.funnel.rewardCredited.toLocaleString("vi-VN")} hint={formatPercent(data.funnel.missionCompletionRate)} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Chờ duyệt"
              subtitle="Các hàng chờ Admin/OPS cần xử lý."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("pendingReview")}>Xuất CSV chờ duyệt</button>}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricRow label="Ứng tuyển chờ duyệt" value={data.pendingReview.pendingApplications.toLocaleString("vi-VN")} />
              <MetricRow label="Minh chứng chờ duyệt" value={data.pendingReview.pendingProofs.toLocaleString("vi-VN")} />
              <MetricRow label="Video chờ duyệt" value={data.pendingReview.pendingVideoReviews.toLocaleString("vi-VN")} />
              <MetricRow label="Duyệt cuối chờ xử lý" value={data.pendingReview.pendingFinalReviews.toLocaleString("vi-VN")} />
              <MetricRow label="Rút tiền chờ xử lý" value={data.pendingReview.pendingPayouts.toLocaleString("vi-VN")} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Tổng quan thanh toán / hoa hồng" subtitle="Hoa hồng và rút tiền đã qua mapping an toàn; giao dịch chưa phân loại được tách khỏi KPI chính." />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricRow label="Hoa hồng đã ghi nhận" value={formatVnd(data.payments.commissionCreditedVnd)} />
              <MetricRow label="Rút tiền đã yêu cầu" value={formatVnd(data.payments.payoutRequestedVnd)} />
              <MetricRow label="Rút tiền đã thanh toán" value={formatVnd(data.payments.payoutPaidVnd)} />
              <MetricRow label="Thanh toán thành công" value={formatVnd(data.payments.paymentTransactionsSucceededVnd)} />
              <MetricRow label="Thanh toán đang chờ" value={formatVnd(data.payments.paymentTransactionsPendingVnd)} />
              <MetricRow label="Thanh toán thất bại" value={formatVnd(data.payments.paymentTransactionsFailedVnd)} />
              <MetricRow label="Giao dịch chưa phân loại" value={formatVnd(data.payments.unknownPaymentTransactionsVnd ?? 0)} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Hiệu quả chiến dịch"
              subtitle="Hiệu suất nhiệm vụ và minh chứng theo chiến dịch."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("campaignPerformance")}>Xuất CSV chiến dịch</button>}
            />
            {data.campaignPerformance.length === 0 ? (
              <EmptyTable title="Chưa có dữ liệu chiến dịch" description="Không có chiến dịch phù hợp bộ lọc hiện tại." />
            ) : (
              <TableShell>
                <div className="hidden grid-cols-[minmax(220px,1.4fr)_120px_repeat(5,minmax(96px,.7fr))_140px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 xl:grid">
                  <span>Chiến dịch</span>
                  <span>Trạng thái</span>
                  <span>Nhiệm vụ</span>
                  <span>Đã duyệt</span>
                  <span>Đã nộp</span>
                  <span>Minh chứng OK</span>
                  <span>Hoàn thành</span>
                  <span>Hoa hồng</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {data.campaignPerformance.map((item) => (
                    <article key={item.campaignId} className="grid gap-3 p-4 xl:grid-cols-[minmax(220px,1.4fr)_120px_repeat(5,minmax(96px,.7fr))_140px] xl:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">{item.title}</p>
                        <p className="truncate text-xs text-zinc-500">{item.brandName ?? item.brandId ?? "Không rõ thương hiệu"}</p>
                      </div>
                      <StatusBadge status={item.status} />
                      <p className="text-sm font-semibold text-zinc-900">{item.totalCreatorMissions}</p>
                      <p className="text-sm text-zinc-700">{item.approvedApplications}</p>
                      <p className="text-sm text-zinc-700">{item.submittedProofs}</p>
                      <p className="text-sm text-zinc-700">{item.approvedProofs}</p>
                      <p className="text-sm text-zinc-700">{formatPercent(item.completionRate)}</p>
                      <p className="text-sm font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</p>
                    </article>
                  ))}
                </div>
              </TableShell>
            )}
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Nhà sáng tạo nổi bật"
              subtitle="Xếp hạng theo minh chứng được duyệt, nhiệm vụ được duyệt và hoa hồng đã ghi nhận."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("topCreators")}>Xuất CSV top nhà sáng tạo</button>}
            />
            {data.topCreators.length === 0 ? (
              <EmptyTable title="Chưa có dữ liệu nhà sáng tạo" description="Không có nhiệm vụ nhà sáng tạo phù hợp bộ lọc hiện tại." />
            ) : (
              <TableShell>
                <div className="hidden grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(96px,.7fr))_140px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 xl:grid">
                  <span>Nhà sáng tạo</span>
                  <span>Đã duyệt</span>
                  <span>Đã nộp</span>
                  <span>Minh chứng OK</span>
                  <span>Từ chối</span>
                  <span>Hoàn thành</span>
                  <span>Hoa hồng</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {data.topCreators.map((item) => (
                    <article key={item.creatorId} className="grid gap-3 p-4 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(96px,.7fr))_140px] xl:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">{item.displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{item.accountId ?? item.creatorId}</p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{item.approvedMissions}</p>
                      <p className="text-sm text-zinc-700">{item.submittedProofs}</p>
                      <p className="text-sm text-zinc-700">{item.approvedProofs}</p>
                      <p className="text-sm text-zinc-700">{item.rejectedProofs}</p>
                      <p className="text-sm text-zinc-700">{formatPercent(item.completionRate)}</p>
                      <p className="text-sm font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</p>
                    </article>
                  ))}
                </div>
              </TableShell>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
