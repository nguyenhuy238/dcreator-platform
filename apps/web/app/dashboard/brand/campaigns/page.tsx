"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { BrandSubscriptionPanel } from "@/app/dashboard/brand/_components/BrandSubscriptionPanel";
import { useCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";

type CampaignItem = {
  id: string;
  title: string;
  slug: string;
  campaignType: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
  setupSource: "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
  feasibilityStatus: string;
  status: string;
  budgetVnd: number;
  targetAmountVnd: number;
  fundedAmountVnd: number;
  backerCount: number;
  startsAt: string | null;
  endsAt: string | null;
  coverImageUrl: string | null;
  ugcVideoQuota: number | null;
  ugcVideoApprovedCount: number;
  _count?: { contributions?: number; missions?: number };
  applicationCount?: number;
  creatorJoinedCount?: number;
  videoTarget?: number;
  videoApproved?: number;
  videoProgressPercent?: number;
};

type CampaignRequestItem = {
  id: string;
  requestedSlug: string;
  title: string;
  setupSource: "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
  status: string;
  budgetVnd: number;
  targetAmountVnd: number;
  campaignType: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
  startsAt: string | null;
  endsAt: string | null;
  adminNote: string | null;
  brandFeedback: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdCampaign: { id: string; slug: string; title: string; status: string } | null;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string; message?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa đặt";
  return new Date(value).toLocaleDateString("vi-VN");
}

function progress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function BrandCampaignsPage() {
  const { currentBrandId } = useCurrentBrand();
  const [activeTab, setActiveTab] = useState<"campaigns" | "packages">("campaigns");
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [requests, setRequests] = useState<CampaignRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [setupSourceFilter, setSetupSourceFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "funded" | "ending">("newest");

  const campaignApiPath = useMemo(() => {
    if (!currentBrandId) return "/api/brand/dashboard/campaigns";
    return `/api/brand/dashboard/campaigns?brandId=${encodeURIComponent(currentBrandId)}`;
  }, [currentBrandId]);
  const campaignRequestApiPath = useMemo(() => {
    if (!currentBrandId) return "/api/brand/dashboard/campaign-requests";
    return `/api/brand/dashboard/campaign-requests?brandId=${encodeURIComponent(currentBrandId)}`;
  }, [currentBrandId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [campaignResponse, requestResponse] = await Promise.all([
        fetch(campaignApiPath, { cache: "no-store" }),
        fetch(campaignRequestApiPath, { cache: "no-store" })
      ]);
      const campaignPayload = (await campaignResponse.json()) as ApiResponse<CampaignItem[]>;
      const requestPayload = (await requestResponse.json()) as ApiResponse<CampaignRequestItem[]>;
      if (!campaignResponse.ok || !campaignPayload.success || !campaignPayload.data) {
        throw new Error(campaignPayload.error ?? "Không thể tải campaign");
      }
      if (!requestResponse.ok || !requestPayload.success || !requestPayload.data) {
        throw new Error(requestPayload.error ?? "Không thể tải yêu cầu campaign");
      }
      setItems(campaignPayload.data);
      setRequests(requestPayload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignApiPath, campaignRequestApiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = items.filter((item) => {
      if (normalized && !(`${item.title} ${item.slug}`.toLowerCase().includes(normalized))) return false;
      if (statusFilter && item.status !== statusFilter && item.feasibilityStatus !== statusFilter) return false;
      if (typeFilter && item.campaignType !== typeFilter) return false;
      if (setupSourceFilter && item.setupSource !== setupSourceFilter) return false;
      return true;
    });

    if (sortBy === "funded") {
      list = list.sort((a, b) => b.fundedAmountVnd - a.fundedAmountVnd);
    } else if (sortBy === "ending") {
      list = list.sort((a, b) => {
        const da = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else {
      list = list.sort((a, b) => new Date(b.startsAt ?? 0).getTime() - new Date(a.startsAt ?? 0).getTime());
    }

    return list;
  }, [items, query, statusFilter, typeFilter, setupSourceFilter, sortBy]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => !request.createdCampaign && (request.status === "PENDING_REVIEW" || request.status === "NEEDS_REVISION")),
    [requests]
  );
  const filteredPendingRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return pendingRequests.filter((request) => {
      if (normalized && !(`${request.title} ${request.requestedSlug}`.toLowerCase().includes(normalized))) return false;
      if (statusFilter && request.status !== statusFilter) return false;
      if (typeFilter && request.campaignType !== typeFilter) return false;
      if (setupSourceFilter && request.setupSource !== setupSourceFilter) return false;
      return true;
    });
  }, [pendingRequests, query, statusFilter, typeFilter, setupSourceFilter]);
  const listCount = filteredPendingRequests.length + filtered.length;

  return (
    <>
      <PageHeader
        title="Campaign / Job"
        subtitle="Theo dõi campaign hiện có và gửi yêu cầu để Admin tạo campaign mới."
        action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === "campaigns" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
          }`}
        >
          Campaign / Job
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === "packages" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
          }`}
        >
          Mục tiêu gói
        </button>
      </div>

      {activeTab === "packages" ? <BrandSubscriptionPanel showHeader={false} /> : null}

      {activeTab === "campaigns" ? (
        <>
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input" placeholder="Tìm tên campaign" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          <select className="dc-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tất cả loại</option>
            <option value="DONATION">DONATION</option>
            <option value="PREORDER">PREORDER</option>
            <option value="SPONSORSHIP">SPONSORSHIP</option>
            <option value="COMMUNITY">COMMUNITY</option>
          </select>
          <select className="dc-input" value={setupSourceFilter} onChange={(e) => setSetupSourceFilter(e.target.value)}>
            <option value="">Tất cả setup source</option>
            <option value="BRAND_REQUESTED">BRAND_REQUESTED</option>
            <option value="JOIN_EXISTING_DCREATOR_CAMP">JOIN_EXISTING_DCREATOR_CAMP</option>
          </select>
          <select className="dc-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "funded" | "ending")}>
            <option value="newest">Mới nhất</option>
            <option value="funded">Nhiều funding nhất</option>
            <option value="ending">Gần kết thúc</option>
          </select>
        </div>
      </section>

      {error ? <div className="mt-4"><ErrorState title="Không thể tải campaign" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading ? (
        <section className="mt-6">
          <SectionHeader title="Danh sách campaign" subtitle={`${listCount} campaign`} />
          {listCount === 0 ? (
            <EmptyState
              title="Chưa có campaign"
              description="Gửi yêu cầu để Admin tạo campaign đầu tiên cho brand của bạn."
              action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredPendingRequests.map((request) => (
                <article key={request.id} className="dc-card overflow-hidden p-0">
                  <div className="relative flex h-40 items-end overflow-hidden bg-zinc-100">
                    <CampaignCoverImage src={request.coverImageUrl} alt={request.title} className="object-cover" sizes="(max-width: 1280px) 100vw, 50vw" />
                    <div className="relative w-full bg-black/50 px-4 py-3 text-white">
                      <p className="text-lg font-bold">{request.title}</p>
                      <p className="text-xs">/{request.requestedSlug}</p>
                    </div>
                  </div>
                  <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {request.status === "NEEDS_REVISION" ? "Cần bổ sung" : "Đang chờ duyệt"}
                      </span>
                      <StatusBadge status={request.campaignType} />
                      <StatusBadge status={request.setupSource} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                    <p>Setup source: {request.setupSource}</p>
                    <p>Ngân sách dự kiến: {formatVnd(request.budgetVnd)}</p>
                    <p>Target: {formatVnd(request.targetAmountVnd)}</p>
                    <p>Loại campaign: {request.campaignType}</p>
                    <p>Bắt đầu: {formatDate(request.startsAt)}</p>
                    <p>Kết thúc: {formatDate(request.endsAt)}</p>
                    <p>Gửi lúc: {new Date(request.createdAt).toLocaleString("vi-VN")}</p>
                    <p>Cập nhật: {new Date(request.updatedAt).toLocaleString("vi-VN")}</p>
                  </div>
                  {request.adminNote ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      Ghi chú admin: {request.adminNote}
                    </p>
                  ) : null}
                  {request.brandFeedback ? (
                    <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                      Phản hồi Brand: {request.brandFeedback}
                    </p>
                  ) : null}
                  </div>
                </article>
              ))}
              {filtered.map((campaign) => {
                const videoTarget = campaign.videoTarget ?? Math.max(0, campaign.ugcVideoQuota ?? 0);
                const videoApproved = campaign.videoApproved ?? Math.max(0, campaign.ugcVideoApprovedCount ?? 0);
                const videoProgressPercent = campaign.videoProgressPercent ?? progress(videoApproved, videoTarget);
                const creatorJoined = campaign.creatorJoinedCount ?? 0;

                return (
                  <article key={campaign.id} className="dc-card overflow-hidden p-0">
                    <div className="relative flex h-40 items-end overflow-hidden bg-zinc-100">
                      <CampaignCoverImage src={campaign.coverImageUrl} alt={campaign.title} className="object-cover" sizes="(max-width: 1280px) 100vw, 50vw" />
                      <div className="relative w-full bg-black/50 px-4 py-3 text-white">
                        <p className="text-lg font-bold">{campaign.title}</p>
                        <p className="text-xs">/{campaign.slug}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <StatusBadge status={campaign.status} />
                        <StatusBadge status={campaign.feasibilityStatus} />
                        <StatusBadge status={campaign.campaignType} />
                      </div>

                      <div className="grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                        <p>Setup source: {campaign.setupSource}</p>
                        <p>Ngân sách: {formatVnd(campaign.budgetVnd)}</p>
                        <p>Target: {formatVnd(campaign.targetAmountVnd)}</p>
                        <p>Đã huy động: {formatVnd(campaign.fundedAmountVnd)}</p>
                        <p>Creator ứng tuyển: {campaign.applicationCount ?? 0}</p>
                        <p>Backer: {campaign.backerCount.toLocaleString("vi-VN")}</p>
                        <p>Bắt đầu: {formatDate(campaign.startsAt)}</p>
                        <p>Kết thúc: {formatDate(campaign.endsAt)}</p>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <p className="text-xs text-zinc-500">Creator đã tham gia</p>
                          <p className="text-lg font-black text-zinc-900">{creatorJoined}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <p className="text-xs text-zinc-500">Video dự kiến</p>
                          <p className="text-lg font-black text-zinc-900">{videoTarget}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <p className="text-xs text-zinc-500">Video đã duyệt</p>
                          <p className="text-lg font-black text-zinc-900">{videoApproved}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-zinc-200">
                          <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${videoProgressPercent}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">Tiến độ video hoàn thành: {videoProgressPercent}%</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/campaigns/${campaign.slug}`} className="dc-btn-secondary">Xem chi tiết</Link>
                        <Link href={`/dashboard/brand/campaigns/${campaign.id}/missions`} className="dc-btn-secondary">KPI / Analytics</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
        </>
      ) : null}
    </>
  );
}
