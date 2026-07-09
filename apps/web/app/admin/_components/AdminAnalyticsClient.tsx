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
        throw new Error(payload.message ?? payload.error ?? "Không thể tải filter options");
      }
      setFilterOptions(payload.data);
    } catch (requestError) {
      setOptionsError(requestError instanceof Error ? requestError.message : "Không thể tải filter options");
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
        throw new Error(payload.message ?? payload.error ?? "Không thể tải Admin Analytics");
      }
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải Admin Analytics");
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
        title="Admin Analytics"
        subtitle="Tổng quan Campaign, Creator Mission funnel, review queue và commission theo dữ liệu thật."
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
                Brand ID
                <input className="dc-input" value={brandId} onChange={(event) => setBrandId(event.target.value)} placeholder="Tất cả brand" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Campaign ID
                <input className="dc-input" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="Tất cả campaign" />
              </label>
            </>
          ) : (
            <>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Brand
                <select
                  className="dc-input"
                  value={brandId}
                  disabled={optionsLoading}
                  onChange={(event) => {
                    setBrandId(event.target.value);
                    setCampaignId("");
                  }}
                >
                  <option value="">Tất cả brand</option>
                  {filterOptions.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name} ({brand.campaignCount})</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                Campaign
                <select className="dc-input" value={campaignId} disabled={optionsLoading} onChange={(event) => setCampaignId(event.target.value)}>
                  <option value="">Tất cả campaign</option>
                  {campaignOptions.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.title} · {campaign.status}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="flex flex-col gap-2 md:flex-row xl:flex-col xl:items-stretch xl:justify-end">
            <button className="dc-btn-primary w-full" onClick={() => void load()}>Áp dụng</button>
            <button className="dc-btn-secondary w-full" onClick={resetFilters}>Reset</button>
          </div>
        </div>
        {optionsError ? <p className="mt-3 text-sm text-amber-700">Không tải được dropdown filter: {optionsError}. Có thể nhập ID thủ công.</p> : null}
      </section>

      {loading ? <LoadingSkeleton rows={7} /> : null}
      {error ? <ErrorState title="Không tải được Admin Analytics" description={error} onRetry={() => void load()} /> : null}

      {!loading && !error && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Total Campaigns" value={data.overview.totalCampaigns.toLocaleString("vi-VN")} />
            <StatsCard title="Active Campaigns" value={data.overview.activeCampaigns.toLocaleString("vi-VN")} />
            <StatsCard title="Creator Applications" value={data.funnel.applications.toLocaleString("vi-VN")} />
            <StatsCard title="Proof Approved" value={data.funnel.proofApproved.toLocaleString("vi-VN")} hint={formatPercent(data.funnel.proofApprovalRate)} />
            <StatsCard title="Pending Reviews" value={totalPendingReviews.toLocaleString("vi-VN")} />
            <StatsCard title="Payout Pending" value={formatVnd(data.payments.payoutPendingVnd)} />
          </section>

          <section className="mt-8">
            <SectionHeader title="Campaign Overview" subtitle="Trạng thái campaign và yêu cầu tạo campaign từ Brand." />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricRow label="Completed" value={data.overview.completedCampaigns.toLocaleString("vi-VN")} />
              <MetricRow label="Draft" value={data.overview.draftCampaigns.toLocaleString("vi-VN")} />
              <MetricRow label="Cancelled / Archived" value={data.overview.cancelledCampaigns.toLocaleString("vi-VN")} />
              <MetricRow label="Brand requests pending" value={data.overview.pendingBrandCampaignRequests.toLocaleString("vi-VN")} />
              <MetricRow label="Brand requests approved" value={data.overview.approvedBrandCampaignRequests.toLocaleString("vi-VN")} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Creator Mission Funnel"
              subtitle="Nguồn chính: CreatorMission. Không tính donation/backer/contribution legacy."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("funnel")}>Export Funnel CSV</button>}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricRow label="Applications" value={data.funnel.applications.toLocaleString("vi-VN")} />
              <MetricRow label="Approved applications" value={data.funnel.approvedApplications.toLocaleString("vi-VN")} hint={formatPercent(data.funnel.applicationApprovalRate)} />
              <MetricRow label="Assigned missions" value={data.funnel.assignedMissions.toLocaleString("vi-VN")} />
              <MetricRow label="Proof submitted" value={data.funnel.proofSubmitted.toLocaleString("vi-VN")} />
              <MetricRow label="Reward credited" value={data.funnel.rewardCredited.toLocaleString("vi-VN")} hint={formatPercent(data.funnel.missionCompletionRate)} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Pending Review"
              subtitle="Các queue Admin/OPS cần xử lý."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("pendingReview")}>Export Pending CSV</button>}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricRow label="Pending applications" value={data.pendingReview.pendingApplications.toLocaleString("vi-VN")} />
              <MetricRow label="Pending proofs" value={data.pendingReview.pendingProofs.toLocaleString("vi-VN")} />
              <MetricRow label="Pending video reviews" value={data.pendingReview.pendingVideoReviews.toLocaleString("vi-VN")} />
              <MetricRow label="Pending final reviews" value={data.pendingReview.pendingFinalReviews.toLocaleString("vi-VN")} />
              <MetricRow label="Pending payouts" value={data.pendingReview.pendingPayouts.toLocaleString("vi-VN")} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Payment / Commission Summary" subtitle="Commission/payout đã qua mapping an toàn; payment intent chưa rõ được tách khỏi KPI chính." />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricRow label="Commission credited" value={formatVnd(data.payments.commissionCreditedVnd)} />
              <MetricRow label="Payout requested" value={formatVnd(data.payments.payoutRequestedVnd)} />
              <MetricRow label="Payout paid" value={formatVnd(data.payments.payoutPaidVnd)} />
              <MetricRow label="Payment success" value={formatVnd(data.payments.paymentTransactionsSucceededVnd)} />
              <MetricRow label="Payment pending" value={formatVnd(data.payments.paymentTransactionsPendingVnd)} />
              <MetricRow label="Payment failed" value={formatVnd(data.payments.paymentTransactionsFailedVnd)} />
              <MetricRow label="Unknown payment intent" value={formatVnd(data.payments.unknownPaymentTransactionsVnd ?? 0)} />
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Campaign Performance"
              subtitle="Hiệu suất mission/proof theo campaign."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("campaignPerformance")}>Export Campaign CSV</button>}
            />
            {data.campaignPerformance.length === 0 ? (
              <EmptyTable title="Chưa có dữ liệu campaign" description="Không có campaign phù hợp bộ lọc hiện tại." />
            ) : (
              <TableShell>
                <div className="hidden grid-cols-[minmax(220px,1.4fr)_120px_repeat(5,minmax(96px,.7fr))_140px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 xl:grid">
                  <span>Campaign</span>
                  <span>Status</span>
                  <span>Missions</span>
                  <span>Approved</span>
                  <span>Submitted</span>
                  <span>Proof OK</span>
                  <span>Completion</span>
                  <span>Commission</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {data.campaignPerformance.map((item) => (
                    <article key={item.campaignId} className="grid gap-3 p-4 xl:grid-cols-[minmax(220px,1.4fr)_120px_repeat(5,minmax(96px,.7fr))_140px] xl:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">{item.title}</p>
                        <p className="truncate text-xs text-zinc-500">{item.brandName ?? item.brandId ?? "Không rõ brand"}</p>
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
              title="Top Creators"
              subtitle="Xếp hạng theo proof được duyệt, mission được duyệt và commission credited."
              action={<button className="dc-btn-secondary" onClick={() => exportCsv("topCreators")}>Export Creators CSV</button>}
            />
            {data.topCreators.length === 0 ? (
              <EmptyTable title="Chưa có dữ liệu Creator" description="Không có creator mission phù hợp bộ lọc hiện tại." />
            ) : (
              <TableShell>
                <div className="hidden grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(96px,.7fr))_140px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 xl:grid">
                  <span>Creator</span>
                  <span>Approved</span>
                  <span>Submitted</span>
                  <span>Proof OK</span>
                  <span>Rejected</span>
                  <span>Completion</span>
                  <span>Commission</span>
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
