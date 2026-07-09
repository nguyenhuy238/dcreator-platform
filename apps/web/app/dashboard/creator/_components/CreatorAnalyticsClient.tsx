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
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? payload.error ?? "Không thể tải Creator Analytics");
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải Creator Analytics");
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
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? payload.error ?? "Không tải được danh sách campaign");
      setFilterOptions(payload.data);
      if (campaignId && !payload.data.campaigns.some((campaign) => campaign.id === campaignId)) setCampaignId("");
    } catch (requestError) {
      setOptionsError(requestError instanceof Error ? requestError.message : "Không tải được danh sách campaign");
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
      <PageHeader title="Creator Analytics" subtitle="Theo dõi hiệu suất campaign, mission, proof và thu nhập." />

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
              <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={campaignId} disabled={optionsLoading} onChange={(event) => setCampaignId(event.target.value)}>
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
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("funnel")}>
            Export Funnel CSV
          </button>
          <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => exportCsv("pendingActions")}>
            Export Pending CSV
          </button>
        </div>
      </section>

      {error ? <ErrorState title="Không thể tải Creator Analytics" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}
      {!loading && data && !hasData ? <EmptyState title="Chưa có dữ liệu Creator Analytics" description="Dữ liệu sẽ xuất hiện khi bạn apply campaign, nhận mission hoặc nộp proof." /> : null}

      {!loading && data && hasData ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Total Applications" value={`${data.overview.totalApplications}`} />
            <StatsCard title="Approved Applications" value={`${data.overview.approvedApplications}`} />
            <StatsCard title="Total Missions" value={`${data.overview.totalMissions}`} />
            <StatsCard title="Proof Approved" value={`${data.overview.approvedProofs}`} />
            <StatsCard title="Pending Reviews" value={`${data.overview.pendingReviews}`} />
            <StatsCard title="Commission Credited" value={formatVnd(data.earnings.commissionCreditedVnd)} />
            <StatsCard title="Payout Pending" value={formatVnd(data.earnings.payoutPendingVnd)} />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="dc-card p-4 lg:col-span-2">
              <SectionHeader title="Mission Funnel" subtitle="Apply, mission, proof và reward của creator." />
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
              <SectionHeader title="Pending Actions" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Applications: <span className="font-semibold text-zinc-900">{data.pendingActions.pendingApplications}</span></p>
                <p>Missions to accept: <span className="font-semibold text-zinc-900">{data.pendingActions.missionsToAccept}</span></p>
                <p>Proofs to submit: <span className="font-semibold text-zinc-900">{data.pendingActions.proofsToSubmit}</span></p>
                <p>Pending proof review: <span className="font-semibold text-zinc-900">{data.pendingActions.pendingProofReview}</span></p>
                <p>Rejected to revise: <span className="font-semibold text-zinc-900">{data.pendingActions.rejectedProofsToRevise}</span></p>
                <p>Pending payout: <span className="font-semibold text-zinc-900">{data.pendingActions.pendingPayouts}</span></p>
              </div>
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Earnings / Commission Summary" />
            <div className="grid gap-3 md:grid-cols-4">
              <StatsCard title="Commission Credited" value={formatVnd(data.earnings.commissionCreditedVnd)} />
              <StatsCard title="Payout Requested" value={formatVnd(data.earnings.payoutRequestedVnd)} />
              <StatsCard title="Payout Paid" value={formatVnd(data.earnings.payoutPaidVnd)} />
              <StatsCard title="Payout Pending" value={formatVnd(data.earnings.payoutPendingVnd)} />
            </div>
          </section>

          <section className="mt-6">
            <SectionHeader title="Campaign Performance" subtitle="Hiệu suất campaign trong phạm vi creator." />
            {data.campaignPerformance.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu campaign" description="Campaign performance sẽ xuất hiện khi bạn có application hoặc mission trong bộ lọc hiện tại." />
            ) : (
              <div className="grid gap-3">
                {data.campaignPerformance.map((item) => (
                  <article key={item.campaignId} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-zinc-900">{item.title}</p>
                        <p className="text-xs text-zinc-500">{item.brandName ?? "Không rõ brand"}</p>
                      </div>
                      <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{item.status}</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-5">
                      <p>Application: <span className="font-semibold text-zinc-900">{item.applicationStatus ?? "-"}</span></p>
                      <p>Mission: <span className="font-semibold text-zinc-900">{item.missionStatus ?? "-"}</span></p>
                      <p>Proof: <span className="font-semibold text-zinc-900">{item.proofStatus ?? "-"}</span></p>
                      <p>Completion: <span className="font-semibold text-zinc-900">{formatRate(item.completionRate)}</span></p>
                      <p>Commission: <span className="font-semibold text-zinc-900">{formatVnd(item.commissionCreditedVnd)}</span></p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <SectionHeader title="Recent Activity" />
            {data.recentActivity.length === 0 ? (
              <EmptyState title="Chưa có hoạt động gần đây" description="Hoạt động sẽ xuất hiện khi có application, mission hoặc proof." />
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
