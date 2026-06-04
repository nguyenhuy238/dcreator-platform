"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { BrandSubscriptionPanel } from "@/app/dashboard/brand/_components/BrandSubscriptionPanel";
import { useCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";
import { MissionReviewsPage, type MissionReviewsTabKey } from "@/app/dashboard/brand/mission-reviews/page";

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
  reviewPendingCount?: number;
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
  const [activeTab, setActiveTab] = useState<"campaigns" | "requests" | "packages">("campaigns");
  const [reviewCampaign, setReviewCampaign] = useState<Pick<CampaignItem, "id" | "title" | "slug"> | null>(null);
  const [reviewInitialTab, setReviewInitialTab] = useState<MissionReviewsTabKey>("applications");
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải campaign");
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
        const aDeadline = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDeadline = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDeadline - bDeadline;
      });
    } else {
      list = list.sort((a, b) => new Date(b.startsAt ?? 0).getTime() - new Date(a.startsAt ?? 0).getTime());
    }

    return list;
  }, [items, query, statusFilter, typeFilter, setupSourceFilter, sortBy]);

  const filteredRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = requests.filter((request) => {
      if (normalized && !(`${request.title} ${request.requestedSlug}`.toLowerCase().includes(normalized))) return false;
      if (statusFilter && request.status !== statusFilter) return false;
      if (typeFilter && request.campaignType !== typeFilter) return false;
      if (setupSourceFilter && request.setupSource !== setupSourceFilter) return false;
      return true;
    });
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [requests, query, statusFilter, typeFilter, setupSourceFilter]);

  const campaignCount = filtered.length;
  const requestCount = filteredRequests.length;

  function openMissionReview(campaign: CampaignItem, initialTab: MissionReviewsTabKey = "applications") {
    setReviewCampaign({ id: campaign.id, title: campaign.title, slug: campaign.slug });
    setReviewInitialTab(initialTab);
  }

  return (
    <>
      <PageHeader
        title="Campaign / Job"
        subtitle="Theo dõi campaign hiện có, gửi yêu cầu tạo campaign mới và duyệt nhiệm vụ ngay trong từng campaign."
        action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === "campaigns" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          Campaign / Job
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === "requests" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          Yêu cầu tạo campaign
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === "packages" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          Mục tiêu gói
        </button>
      </div>

      {activeTab === "packages" ? <BrandSubscriptionPanel showHeader={false} /> : null}

      {activeTab === "campaigns" ? (
        <>
          <section className="dc-card p-4">
            <div className="grid gap-2 md:grid-cols-5">
              <input className="dc-input" placeholder="Tìm tên campaign" value={query} onChange={(event) => setQuery(event.target.value)} />
              <input className="dc-input" placeholder="Filter status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
              <select className="dc-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">Tất cả loại</option>
                <option value="DONATION">DONATION</option>
                <option value="PREORDER">PREORDER</option>
                <option value="SPONSORSHIP">SPONSORSHIP</option>
                <option value="COMMUNITY">COMMUNITY</option>
              </select>
              <select className="dc-input" value={setupSourceFilter} onChange={(event) => setSetupSourceFilter(event.target.value)}>
                <option value="">Tất cả setup source</option>
                <option value="BRAND_REQUESTED">BRAND_REQUESTED</option>
                <option value="JOIN_EXISTING_DCREATOR_CAMP">JOIN_EXISTING_DCREATOR_CAMP</option>
              </select>
              <select className="dc-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as "newest" | "funded" | "ending")}>
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
              <SectionHeader title="Danh sách campaign" subtitle={`${campaignCount} campaign`} />
              {campaignCount === 0 ? (
                <EmptyState
                  title="Chưa có campaign"
                  description="Gửi yêu cầu để Admin tạo campaign đầu tiên cho brand của bạn."
                  action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
                />
              ) : (
                <div className="grid gap-4 xl:grid-cols-3">
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
                            <p>Creator ứng tuyển: {campaign.applicationCount ?? 0}</p>
                            <p>Bắt đầu: {formatDate(campaign.startsAt)}</p>
                            <p>Kết thúc: {formatDate(campaign.endsAt)}</p>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-12 items-start text-xs leading-4 text-zinc-500">Creator đã tham gia</p>
                              <p className="text-lg font-black text-zinc-900">{creatorJoined}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-12 items-start text-xs leading-4 text-zinc-500">Video dự kiến</p>
                              <p className="text-lg font-black text-zinc-900">{videoTarget}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-12 items-start text-xs leading-4 text-zinc-500">Video đã duyệt</p>
                              <p className="text-lg font-black text-zinc-900">{videoApproved}</p>
                            </div>
                            <div className={`rounded-xl border px-3 py-2 ${campaign.reviewPendingCount ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-zinc-50"}`}>
                              <p className={`flex min-h-12 items-start text-xs leading-4 ${campaign.reviewPendingCount ? "text-amber-700" : "text-zinc-500"}`}>Nhiệm vụ chờ duyệt</p>
                              <p className={`text-lg font-black ${campaign.reviewPendingCount ? "text-amber-800" : "text-zinc-900"}`}>{campaign.reviewPendingCount ?? 0}</p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="h-2 rounded-full bg-zinc-200">
                              <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${videoProgressPercent}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Tiến độ video hoàn thành: {videoProgressPercent}%</p>
                          </div>

                          <div className="mt-4 grid grid-cols-[1fr_1fr_1.2fr] gap-1.5">
                            <Link href={`/campaigns/${campaign.slug}`} className="dc-btn-secondary min-w-0 px-2 py-2 text-center text-xs leading-tight">Xem chi tiết</Link>
                            <button type="button" className="dc-btn-secondary min-w-0 px-2 py-2 text-xs leading-tight" disabled>KPI / Analytics</button>
                            <button
                              type="button"
                              className={`${campaign.reviewPendingCount ? "dc-btn-primary" : "dc-btn-secondary"} min-w-0 px-2 py-2 text-xs leading-tight`}
                              onClick={() => openMissionReview(campaign)}
                            >
                              Duyệt nhiệm vụ{campaign.reviewPendingCount ? ` (${campaign.reviewPendingCount})` : ""}
                            </button>
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

      {activeTab === "requests" ? (
        <>
          <section className="dc-card p-4">
            <div className="grid gap-2 md:grid-cols-4">
              <input className="dc-input" placeholder="Tìm tên campaign request" value={query} onChange={(event) => setQuery(event.target.value)} />
              <input className="dc-input" placeholder="Filter status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
              <select className="dc-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">Tất cả loại</option>
                <option value="DONATION">DONATION</option>
                <option value="PREORDER">PREORDER</option>
                <option value="SPONSORSHIP">SPONSORSHIP</option>
                <option value="COMMUNITY">COMMUNITY</option>
              </select>
              <select className="dc-input" value={setupSourceFilter} onChange={(event) => setSetupSourceFilter(event.target.value)}>
                <option value="">Tất cả setup source</option>
                <option value="BRAND_REQUESTED">BRAND_REQUESTED</option>
                <option value="JOIN_EXISTING_DCREATOR_CAMP">JOIN_EXISTING_DCREATOR_CAMP</option>
              </select>
            </div>
          </section>

          {error ? <div className="mt-4"><ErrorState title="Không thể tải yêu cầu campaign" description={error} onRetry={() => void load()} /></div> : null}
          {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

          {!loading ? (
            <section className="mt-6">
              <SectionHeader title="Yêu cầu tạo campaign của tôi" subtitle={`${requestCount} yêu cầu`} />
              {requestCount === 0 ? (
                <EmptyState
                  title="Chưa có yêu cầu tạo campaign"
                  description="Gửi yêu cầu mới để Admin tạo campaign phù hợp cho brand của bạn."
                  action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
                />
              ) : (
                <div className="grid gap-4 xl:grid-cols-3">
                  {filteredRequests.map((request) => (
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
                            <StatusBadge status={request.status} />
                            <StatusBadge status={request.campaignType} />
                            <StatusBadge status={request.setupSource} />
                          </div>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
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
                        {request.createdCampaign ? (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            <p>Đã tạo campaign: {request.createdCampaign.title}</p>
                            <Link href={`/campaigns/${request.createdCampaign.slug}`} className="font-semibold underline">Xem campaign</Link>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {reviewCampaign ? (
        <div className="fixed inset-0 z-[90] bg-zinc-900/50 p-3 md:p-6" onClick={() => setReviewCampaign(null)}>
          <div className="mx-auto max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">Duyệt nhiệm vụ campaign</h3>
                <p className="text-sm text-zinc-600">{reviewCampaign.title} • /{reviewCampaign.slug}</p>
              </div>
              <button type="button" className="dc-btn-secondary" onClick={() => setReviewCampaign(null)}>Đóng</button>
            </div>

            <MissionReviewsPage
              pageTitle=""
              subtitle=""
              apiBasePath="/api/brand/dashboard"
              initialTab={reviewInitialTab}
              embedded
              fixedCampaignId={reviewCampaign.id}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
