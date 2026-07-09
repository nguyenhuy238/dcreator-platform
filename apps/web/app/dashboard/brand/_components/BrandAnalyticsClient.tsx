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
      <PageHeader title="Brand Analytics" subtitle="Theo dõi hiệu quả campaign, creator, proof và commission." />

      <section className="dc-card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Date from
            <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Date to
            <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700 md:col-span-2">
            Campaign
            {filterOptions ? (
              <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                <option value="">Tất cả campaign</option>
                {filterOptions.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} ({campaign.status})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder={optionsLoading ? "Đang tải campaign..." : "Campaign ID"}
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
              />
            )}
          </label>
        </div>
        {optionsError ? <p className="mt-2 text-sm text-amber-600">Không tải được danh sách campaign. Có thể nhập Campaign ID để lọc.</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" onClick={() => void load()}>
            Apply filters
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={resetFilters}>
            Reset filters
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("campaignPerformance")}>
            Export Campaign CSV
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("creatorPerformance")}>
            Export Creator CSV
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("funnel")}>
            Export Funnel CSV
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("pendingReview")}>
            Export Pending CSV
          </button>
        </div>
      </section>

      {error ? <ErrorState title="Không thể tải dữ liệu thống kê" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}
      {!loading && data && !hasData ? <EmptyState title="Chưa có dữ liệu Brand Analytics" description="Dữ liệu sẽ xuất hiện khi brand có campaign, creator mission hoặc proof." /> : null}

      {!loading && data && hasData ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Total Campaigns" value={`${data.overview.totalCampaigns}`} />
            <StatsCard title="Active Campaigns" value={`${data.overview.activeCampaigns}`} />
            <StatsCard title="Total Applications" value={`${data.overview.totalApplications}`} />
            <StatsCard title="Approved Applications" value={`${data.overview.approvedApplications}`} />
            <StatsCard title="Proof Approved" value={`${data.overview.proofApproved}`} />
            <StatsCard title="Pending Reviews" value={`${data.overview.pendingReviews}`} />
            <StatsCard title="Commission Credited" value={formatVnd(data.payments.commissionCreditedVnd)} />
            <StatsCard title="Pending Payout" value={formatVnd(data.payments.payoutPendingVnd)} />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="dc-card p-4 lg:col-span-2">
              <SectionHeader title="Campaign Funnel" subtitle="Ứng tuyển, mission, proof và reward trong phạm vi brand." />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Applications", data.funnel.applications],
                  ["Approved Applications", data.funnel.approvedApplications],
                  ["Assigned Missions", data.funnel.assignedMissions],
                  ["Proof Submitted", data.funnel.proofSubmitted],
                  ["Proof Approved", data.funnel.proofApproved],
                  ["Reward Credited", data.funnel.rewardCredited]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-3">
                <p>Application approval rate: <span className="font-semibold text-zinc-900">{formatRate(data.funnel.applicationApprovalRate)}</span></p>
                <p>Proof approval rate: <span className="font-semibold text-zinc-900">{formatRate(data.funnel.proofApprovalRate)}</span></p>
                <p>Mission completion rate: <span className="font-semibold text-zinc-900">{formatRate(data.funnel.missionCompletionRate)}</span></p>
              </div>
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Pending Review" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Applications: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingApplications}</span></p>
                <p>Proofs: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingProofs}</span></p>
                <p>Video reviews: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingVideoReviews}</span></p>
                <p>Final reviews: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingFinalReviews}</span></p>
                <p>Payouts: <span className="font-semibold text-zinc-900">{data.pendingReview.pendingPayouts}</span></p>
              </div>
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Payment / Commission Summary" />
            <div className="grid gap-3 md:grid-cols-4">
              <StatsCard title="Commission Credited" value={formatVnd(data.payments.commissionCreditedVnd)} />
              <StatsCard title="Payout Requested" value={formatVnd(data.payments.payoutRequestedVnd)} />
              <StatsCard title="Payout Paid" value={formatVnd(data.payments.payoutPaidVnd)} />
              <StatsCard title="Payout Pending" value={formatVnd(data.payments.payoutPendingVnd)} />
            </div>
          </section>

          <section className="mt-6">
            <SectionHeader title="Campaign Performance" subtitle="Hiệu suất creator mission và proof theo campaign." />
            {data.campaignPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu campaign" description="Campaign performance sẽ xuất hiện khi brand có campaign trong bộ lọc hiện tại." />
            ) : (
              <div className="grid gap-3">
                {data.campaignPerformance.map((item) => (
                  <article key={item.campaignId} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{item.status}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-5">
                      <p>Missions: <span className="font-semibold text-zinc-900">{item.totalCreatorMissions}</span></p>
                      <p>Approved: <span className="font-semibold text-zinc-900">{item.approvedApplications}</span></p>
                      <p>Proof: <span className="font-semibold text-zinc-900">{item.submittedProofs}/{item.approvedProofs}</span></p>
                      <p>Completion: <span className="font-semibold text-zinc-900">{formatRate(item.completionRate)}</span></p>
                      <p>Commission: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</span></p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <SectionHeader title="Creator Performance" subtitle="Hiệu suất creator trong campaign của brand." />
            {data.creatorPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu creator" description="Creator performance sẽ xuất hiện khi có creator mission trong phạm vi brand." />
            ) : (
              <div className="grid gap-3">
                {data.creatorPerformance.map((item) => (
                  <article key={item.creatorId} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.displayName}</p>
                      <p className="text-xs text-zinc-500">{item.creatorId}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-5">
                      <p>Campaigns: <span className="font-semibold text-zinc-900">{item.campaignCount}</span></p>
                      <p>Approved missions: <span className="font-semibold text-zinc-900">{item.approvedMissions}</span></p>
                      <p>Proof: <span className="font-semibold text-zinc-900">{item.submittedProofs}/{item.approvedProofs}</span></p>
                      <p>Completion: <span className="font-semibold text-zinc-900">{formatRate(item.completionRate)}</span></p>
                      <p>Commission: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</span></p>
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
