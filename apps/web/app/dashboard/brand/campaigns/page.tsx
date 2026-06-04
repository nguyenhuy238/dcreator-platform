"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
  brief: string;
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

type RequestForm = {
  title: string;
  imageUrl: string;
  contentFileUrl: string;
};

type FieldErrors = Partial<Record<keyof RequestForm, string>>;

const defaultRequestForm: RequestForm = {
  title: "",
  imageUrl: "",
  contentFileUrl: ""
};

const CONTENT_FILE_MARKER = "[[CONTENT_FILE_URL]]:";

function getContentFileUrlFromBrief(brief: string) {
  const line = brief.split("\n").find((item) => item.trim().startsWith(CONTENT_FILE_MARKER));
  return line ? line.trim().slice(CONTENT_FILE_MARKER.length).trim() : "";
}

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
  const [notice, setNotice] = useState("");
  const [requestForm, setRequestForm] = useState<RequestForm>(defaultRequestForm);
  const [requestFieldErrors, setRequestFieldErrors] = useState<FieldErrors>({});
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingContentFile, setUploadingContentFile] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState<Record<string, string>>({});
  const [submittingRevisionId, setSubmittingRevisionId] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");

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

  const campaignTemplateApiPath = useMemo(() => {
    if (!currentBrandId) return "/api/brand/dashboard/campaign-template";
    return `/api/brand/dashboard/campaign-template?brandId=${encodeURIComponent(currentBrandId)}`;
  }, [currentBrandId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [campaignResponse, requestResponse, templateResponse] = await Promise.all([
        fetch(campaignApiPath, { cache: "no-store" }),
        fetch(campaignRequestApiPath, { cache: "no-store" }),
        fetch(campaignTemplateApiPath, { cache: "no-store" })
      ]);
      const campaignPayload = (await campaignResponse.json()) as ApiResponse<CampaignItem[]>;
      const requestPayload = (await requestResponse.json()) as ApiResponse<CampaignRequestItem[]>;
      const templatePayload = (await templateResponse.json()) as ApiResponse<{ campaignContentTemplateUrl: string }>;
      if (!campaignResponse.ok || !campaignPayload.success || !campaignPayload.data) {
        throw new Error(campaignPayload.error ?? "Không thể tải campaign");
      }
      if (!requestResponse.ok || !requestPayload.success || !requestPayload.data) {
        throw new Error(requestPayload.error ?? "Không thể tải yêu cầu campaign");
      }
      setItems(campaignPayload.data);
      setRequests(requestPayload.data);
      if (templateResponse.ok && templatePayload.success && templatePayload.data) {
        setTemplateUrl(templatePayload.data.campaignContentTemplateUrl ?? "");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignApiPath, campaignRequestApiPath, campaignTemplateApiPath]);

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

  function setRequestField<K extends keyof RequestForm>(name: K, value: RequestForm[K]) {
    setRequestForm((current) => ({ ...current, [name]: value }));
    setRequestFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validateRequestForm() {
    const nextErrors: FieldErrors = {};
    const imageUrl = requestForm.imageUrl.trim();
    const contentFileUrl = requestForm.contentFileUrl.trim();
    if (requestForm.title.trim().length < 3) nextErrors.title = "Tên campaign cần tối thiểu 3 ký tự.";
    if (imageUrl && !imageUrl.startsWith("/uploads/") && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.imageUrl = "Ảnh campaign phải bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    if (!contentFileUrl) nextErrors.contentFileUrl = "Vui lòng tải lên hoặc dán link file nội dung campaign.";
    else if (!contentFileUrl.startsWith("/uploads/") && !/^https?:\/\//.test(contentFileUrl)) {
      nextErrors.contentFileUrl = "File nội dung phải bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    return nextErrors;
  }

  async function uploadCoverImage(file: File) {
    setUploadingCover(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.logoUrl) throw new Error(payload.success ? "Không thể tải ảnh campaign" : payload.error);
      setRequestField("imageUrl", payload.data.logoUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh campaign");
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadCampaignContentFile(file: File) {
    setUploadingContentFile(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("contractDocument", file);
      const response = await fetch("/api/uploads/onboarding-doc", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ contractDocumentUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.contractDocumentUrl) throw new Error(payload.success ? "Không thể tải file nội dung campaign" : payload.error);
      setRequestField("contentFileUrl", payload.data.contractDocumentUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải file nội dung campaign");
    } finally {
      setUploadingContentFile(false);
    }
  }

  async function createCampaignRequest(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateRequestForm();
    if (Object.values(nextErrors).some(Boolean)) {
      setRequestFieldErrors(nextErrors);
      setError("Vui lòng kiểm tra các trường được đánh dấu đỏ.");
      setNotice("");
      return;
    }
    setCreatingRequest(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(campaignRequestApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm)
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequestItem>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi yêu cầu" : payload.error);
      setRequestForm(defaultRequestForm);
      setRequestFieldErrors({});
      setNotice("Đã gửi yêu cầu tạo campaign cho Admin.");
      setActiveTab("requests");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi yêu cầu");
    } finally {
      setCreatingRequest(false);
    }
  }

  async function submitRevisionFeedback(requestId: string) {
    const feedback = (revisionFeedback[requestId] ?? "").trim();
    if (feedback.length < 10) {
      setError("Nội dung bổ sung cần tối thiểu 10 ký tự.");
      setNotice("");
      return;
    }
    setSubmittingRevisionId(requestId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brand/dashboard/campaign-requests/${requestId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequestItem>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi bổ sung" : payload.error);
      setRevisionFeedback((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      setNotice("Đã gửi nội dung bổ sung cho Admin.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi bổ sung");
    } finally {
      setSubmittingRevisionId("");
    }
  }

  return (
    <>
      <PageHeader
        title="Campaign / Job"
        subtitle="Theo dõi campaign hiện có, gửi yêu cầu tạo campaign mới và duyệt nhiệm vụ ngay trong từng campaign."
        action={<button type="button" className="dc-btn-primary" onClick={() => setActiveTab("requests")}>Gửi yêu cầu tạo campaign</button>}
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
          {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

          <form className="dc-card grid gap-4 p-5 md:grid-cols-2" onSubmit={createCampaignRequest}>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              Tên campaign
              <input className={`dc-input ${requestFieldErrors.title ? "border-red-500 ring-1 ring-red-300" : ""}`} value={requestForm.title} onChange={(event) => setRequestField("title", event.target.value)} placeholder="Nhập tên campaign" required />
              {requestFieldErrors.title ? <span className="text-xs text-red-600">{requestFieldErrors.title}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Ảnh campaign
              <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) void uploadCoverImage(file);
                event.currentTarget.value = "";
              }} disabled={uploadingCover} />
              <input className={`dc-input ${requestFieldErrors.imageUrl ? "border-red-500 ring-1 ring-red-300" : ""}`} value={requestForm.imageUrl} onChange={(event) => setRequestField("imageUrl", event.target.value.trim())} placeholder="/uploads/... hoặc https://..." />
              {requestFieldErrors.imageUrl ? <span className="text-xs text-red-600">{requestFieldErrors.imageUrl}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              File nội dung campaign
              <input className="dc-input bg-white" type="file" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) void uploadCampaignContentFile(file);
                event.currentTarget.value = "";
              }} disabled={uploadingContentFile} />
              <input className={`dc-input ${requestFieldErrors.contentFileUrl ? "border-red-500 ring-1 ring-red-300" : ""}`} value={requestForm.contentFileUrl} onChange={(event) => setRequestField("contentFileUrl", event.target.value.trim())} placeholder="/uploads/... hoặc https://..." required />
              {requestFieldErrors.contentFileUrl ? <span className="text-xs text-red-600">{requestFieldErrors.contentFileUrl}</span> : null}
              {templateUrl ? (
                <a className="text-xs font-semibold text-sky-700 underline" href={`/api/uploads/onboarding-doc-download?url=${encodeURIComponent(templateUrl)}`} target="_blank" rel="noreferrer">
                  Tải template form nội dung campaign
                </a>
              ) : (
                <span className="text-xs text-zinc-500">Template nội dung đang chờ Admin cấu hình.</span>
              )}
            </label>
            <div className="md:col-span-2">
              <button className="dc-btn-primary" type="submit" disabled={creatingRequest || uploadingCover || uploadingContentFile}>
                {creatingRequest ? "Đang gửi..." : "Gửi yêu cầu tạo campaign"}
              </button>
            </div>
          </form>

          <section className="dc-card mt-4 p-4">
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
                        {getContentFileUrlFromBrief(request.brief) ? (
                          <a className="mt-3 inline-flex rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100" href={`/api/uploads/onboarding-doc-download?url=${encodeURIComponent(getContentFileUrlFromBrief(request.brief))}`} target="_blank" rel="noreferrer">
                            Mở file nội dung đã gửi
                          </a>
                        ) : null}
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
                        {request.status === "NEEDS_REVISION" ? (
                          <div className="mt-3 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <label className="grid gap-2 text-sm font-semibold text-amber-800">
                              Nội dung bổ sung gửi Admin
                              <textarea
                                className="dc-input min-h-28 bg-white"
                                value={revisionFeedback[request.id] ?? ""}
                                onChange={(event) => setRevisionFeedback((current) => ({ ...current, [request.id]: event.target.value }))}
                                placeholder="Nhập phần đã bổ sung, link tài liệu mới hoặc ghi chú để Admin tiếp tục xử lý."
                              />
                            </label>
                            <button
                              type="button"
                              className="dc-btn-primary w-fit"
                              disabled={submittingRevisionId === request.id}
                              onClick={() => void submitRevisionFeedback(request.id)}
                            >
                              {submittingRevisionId === request.id ? "Đang gửi..." : "Gửi bổ sung"}
                            </button>
                          </div>
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
