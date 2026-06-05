"use client";

import Link from "next/link";
import { DownloadSimple, FileArrowDown, ImageSquare } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ClickableUrl } from "@/app/components/dcreator/ui/clickable-url";
import { BrandMissionHistoryPanel } from "@/app/dashboard/brand/_components/BrandMissionHistoryPanel";
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

function getRevisionDefaultForm(request: CampaignRequestItem): RequestForm {
  return {
    title: request.title,
    imageUrl: request.coverImageUrl ?? "",
    contentFileUrl: getContentFileUrlFromBrief(request.brief)
  };
}

function getFileNameFromUrl(value: string, fallback: string) {
  const cleaned = value.split("?")[0] ?? "";
  const lastSegment = cleaned.split("/").pop()?.trim();
  return lastSegment || fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa đặt";
  return new Date(value).toLocaleDateString("vi-VN");
}

function progress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

const REQUEST_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "NEEDS_REVISION", label: "Đang xử lý" },
  { value: "DRAFT", label: "Nháp" },
  { value: "CAMPAIGN_CREATED", label: "Đã tạo campaign" }
];

const CAMPAIGN_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "LIVE", label: "Đang hoạt động" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "NEEDS_REVISION", label: "Cần bổ sung" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "COMPLETED", label: "Đã hoàn thành" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã hủy" }
];

function CampaignRequestCover({ src, title }: { src: string | null; title: string }) {
  if (!src) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-100 via-white to-zinc-200 text-zinc-500">
        <div className="grid justify-items-center gap-2 text-sm font-semibold">
          <ImageSquare size={28} weight="duotone" />
          <span>Chưa có ảnh</span>
        </div>
      </div>
    );
  }
  return <CampaignCoverImage src={src} alt={title} className="object-cover" sizes="(max-width: 1280px) 100vw, 50vw" />;
}

export default function BrandCampaignsPage() {
  const { currentBrandId } = useCurrentBrand();
  const [activeTab, setActiveTab] = useState<"campaigns" | "requests" | "packages">("campaigns");
  const [reviewCampaign, setReviewCampaign] = useState<Pick<CampaignItem, "id" | "title" | "slug"> | null>(null);
  const [historyCampaign, setHistoryCampaign] = useState<Pick<CampaignItem, "id" | "title" | "slug"> | null>(null);
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
  const [revisionForms, setRevisionForms] = useState<Record<string, RequestForm>>({});
  const [revisionTarget, setRevisionTarget] = useState<CampaignRequestItem | null>(null);
  const [submittingRevisionId, setSubmittingRevisionId] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const revisionImageInputRef = useRef<HTMLInputElement | null>(null);
  const revisionContentFileInputRef = useRef<HTMLInputElement | null>(null);

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
      if (templateResponse.ok && templatePayload.success && templatePayload.data) {
        setTemplateUrl(templatePayload.data.campaignContentTemplateUrl ?? "");
      } else {
        setTemplateUrl("");
      }
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
      if (statusFilter === "CAMPAIGN_CREATED" && !request.createdCampaign) return false;
      if (statusFilter && statusFilter !== "CAMPAIGN_CREATED" && request.status !== statusFilter) return false;
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

  function setRevisionField<K extends keyof RequestForm>(requestId: string, name: K, value: RequestForm[K]) {
    setRevisionForms((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] ?? defaultRequestForm),
        [name]: value
      }
    }));
  }

  function openRevisionModal(request: CampaignRequestItem) {
    setRevisionForms((current) => ({
      ...current,
      [request.id]: current[request.id] ?? getRevisionDefaultForm(request)
    }));
    if (revisionImageInputRef.current) revisionImageInputRef.current.value = "";
    if (revisionContentFileInputRef.current) revisionContentFileInputRef.current.value = "";
    setRevisionTarget(request);
  }

  function validateFormValues(formValues: RequestForm) {
    const nextErrors: FieldErrors = {};
    const imageUrl = formValues.imageUrl.trim();
    const contentFileUrl = formValues.contentFileUrl.trim();
    if (formValues.title.trim().length < 3) nextErrors.title = "Tên campaign cần tối thiểu 3 ký tự.";
    if (imageUrl && !imageUrl.startsWith("/uploads/") && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.imageUrl = "Ảnh campaign phải bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    if (!contentFileUrl) nextErrors.contentFileUrl = "Vui lòng tải lên hoặc dán link file nội dung campaign.";
    else if (!contentFileUrl.startsWith("/uploads/") && !/^https?:\/\//.test(contentFileUrl)) {
      nextErrors.contentFileUrl = "File nội dung phải bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    return nextErrors;
  }

  function validateRequestForm() {
    return validateFormValues(requestForm);
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

  async function uploadRevisionCoverImage(requestId: string, file: File) {
    setUploadingCover(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.logoUrl) throw new Error(payload.success ? "Không thể tải ảnh campaign" : payload.error);
      setRevisionField(requestId, "imageUrl", payload.data.logoUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh campaign");
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadRevisionCampaignContentFile(requestId: string, file: File) {
    setUploadingContentFile(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("contractDocument", file);
      const response = await fetch("/api/uploads/onboarding-doc", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ contractDocumentUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.contractDocumentUrl) throw new Error(payload.success ? "Không thể tải file nội dung campaign" : payload.error);
      setRevisionField(requestId, "contentFileUrl", payload.data.contractDocumentUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải file nội dung campaign");
    } finally {
      setUploadingContentFile(false);
    }
  }

  async function setNativeFileInputValue(input: HTMLInputElement | null, sourceUrl: string, fallbackFileName: string) {
    if (!input || !sourceUrl) return;
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error("Không thể tải file cũ.");
    const blob = await response.blob();
    const file = new File([blob], getFileNameFromUrl(sourceUrl, fallbackFileName), { type: blob.type || undefined });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
  }

  async function restoreOldRevisionImage(request: CampaignRequestItem) {
    if (!request.coverImageUrl) return;
    setError("");
    try {
      setRevisionField(request.id, "imageUrl", request.coverImageUrl);
      await setNativeFileInputValue(revisionImageInputRef.current, request.coverImageUrl, "campaign-image");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể dùng lại ảnh cũ.");
    }
  }

  async function restoreOldRevisionContentFile(request: CampaignRequestItem) {
    const contentFileUrl = getContentFileUrlFromBrief(request.brief);
    if (!contentFileUrl) return;
    setError("");
    try {
      setRevisionField(request.id, "contentFileUrl", contentFileUrl);
      await setNativeFileInputValue(
        revisionContentFileInputRef.current,
        `/api/uploads/onboarding-doc-download?url=${encodeURIComponent(contentFileUrl)}`,
        "campaign-content"
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể dùng lại file cũ.");
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
    const formValues = revisionForms[requestId] ?? (revisionTarget ? getRevisionDefaultForm(revisionTarget) : defaultRequestForm);
    const nextErrors = validateFormValues(formValues);
    if (Object.values(nextErrors).some(Boolean)) {
      setError("Vui lòng kiểm tra các trường bổ sung trước khi gửi.");
      setNotice("");
      return;
    }
    const feedback = `Brand đã bổ sung yêu cầu tạo campaign: ${formValues.title.trim()}`;
    setSubmittingRevisionId(requestId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brand/dashboard/campaign-requests/${requestId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          title: formValues.title.trim(),
          imageUrl: formValues.imageUrl.trim(),
          contentFileUrl: formValues.contentFileUrl.trim()
        })
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequestItem>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi bổ sung" : payload.error);
      setRevisionForms((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      setRevisionTarget(null);
      setNotice("Đã gửi nội dung bổ sung cho Admin.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi bổ sung");
    } finally {
      setSubmittingRevisionId("");
    }
  }

  const currentRevisionForm = revisionTarget
    ? revisionForms[revisionTarget.id] ?? getRevisionDefaultForm(revisionTarget)
    : defaultRequestForm;

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
          {error ? <div className="mt-4"><ErrorState title="Không thể tải campaign" description={error} onRetry={() => void load()} /></div> : null}
          {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

          {!loading ? (
            <section className="mt-6">
              <SectionHeader title="Danh sách campaign" subtitle={`${campaignCount} campaign`} />
              <div className="mt-4 rounded-2xl border border-zinc-100 bg-white/80 p-4">
                <div className="grid gap-2 md:grid-cols-5">
                  <input className="dc-input" placeholder="Tìm theo tên campaign" value={query} onChange={(event) => setQuery(event.target.value)} />
                  <select className="dc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {CAMPAIGN_STATUS_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select className="dc-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="">Tất cả loại campaign</option>
                    <option value="DONATION">Ủng hộ</option>
                    <option value="PREORDER">Đặt trước</option>
                    <option value="SPONSORSHIP">Tài trợ</option>
                    <option value="COMMUNITY">Cộng đồng</option>
                  </select>
                  <select className="dc-input" value={setupSourceFilter} onChange={(event) => setSetupSourceFilter(event.target.value)}>
                    <option value="">Tất cả nguồn tạo</option>
                    <option value="BRAND_REQUESTED">Brand gửi yêu cầu</option>
                    <option value="JOIN_EXISTING_DCREATOR_CAMP">Tham gia campaign dCreator</option>
                  </select>
                  <select className="dc-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as "newest" | "funded" | "ending")}>
                    <option value="newest">Mới nhất</option>
                    <option value="funded">Funding cao nhất</option>
                    <option value="ending">Gần kết thúc</option>
                  </select>
                </div>
              </div>
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
                            <p>Bắt đầu: {formatDate(campaign.startsAt)}</p>
                            <p>Kết thúc: {formatDate(campaign.endsAt)}</p>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-8 items-start text-[9.5px] leading-3.5 text-zinc-500">Creator ứng tuyển</p>
                              <p className="text-lg font-black text-zinc-900">{campaign.applicationCount ?? 0}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-8 items-start text-[9.5px] leading-3.5 text-zinc-500">Creator đã tham gia</p>
                              <p className="text-lg font-black text-zinc-900">{creatorJoined}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-8 items-start text-[9.5px] leading-3.5 text-zinc-500">Video dự kiến</p>
                              <p className="text-lg font-black text-zinc-900">{videoTarget}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="flex min-h-8 items-start text-[9.5px] leading-3.5 text-zinc-500">Video đã duyệt</p>
                              <p className="text-lg font-black text-zinc-900">{videoApproved}</p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="h-2 rounded-full bg-zinc-200">
                              <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${videoProgressPercent}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Tiến độ video hoàn thành: {videoProgressPercent}%</p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-1.5 lg:grid-cols-[1fr_1fr_1.2fr_1.2fr]">
                            <Link href={`/campaigns/${campaign.slug}`} className="dc-btn-secondary min-w-0 px-2 py-2 text-center text-xs leading-tight">Xem chi tiết</Link>
                            <button type="button" className="dc-btn-secondary min-w-0 px-2 py-2 text-xs leading-tight" onClick={() => setHistoryCampaign({ id: campaign.id, title: campaign.title, slug: campaign.slug })}>Xem lịch sử</button>
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
              {uploadingCover ? <span className="text-xs font-semibold text-amber-700">Đang tải ảnh campaign...</span> : null}
              {requestForm.imageUrl ? (
                <span className="text-xs font-medium text-emerald-700">
                  Đã chọn ảnh: <ClickableUrl url={requestForm.imageUrl} label={getFileNameFromUrl(requestForm.imageUrl, "campaign-image")} className="break-all underline decoration-emerald-300 underline-offset-4" />
                </span>
              ) : null}
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
              {uploadingContentFile ? <span className="text-xs font-semibold text-amber-700">Đang tải file nội dung campaign...</span> : null}
              {requestForm.contentFileUrl ? (
                <span className="text-xs font-medium text-emerald-700">
                  Đã chọn file: <ClickableUrl url={requestForm.contentFileUrl} label={getFileNameFromUrl(requestForm.contentFileUrl, "campaign-content")} className="break-all underline decoration-emerald-300 underline-offset-4" />
                </span>
              ) : null}
            </label>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700">
                    <FileArrowDown size={22} weight="duotone" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">Tải file mẫu nội dung campaign</p>
                    <p className="mt-1 text-sm font-normal text-zinc-600">Tải template để điền brief, yêu cầu nội dung, hashtag, deadline trước khi gửi yêu cầu tạo campaign.</p>
                  </div>
                </div>
                {templateUrl ? (
                  <a className="dc-btn-primary inline-flex w-fit items-center gap-2" href={`/api/uploads/onboarding-doc-download?url=${encodeURIComponent(templateUrl)}`} target="_blank" rel="noreferrer">
                    <DownloadSimple size={18} weight="bold" />
                    Tải template
                  </a>
                ) : (
                  <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">Chưa cấu hình file template</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <button className="dc-btn-primary" type="submit" disabled={creatingRequest || uploadingCover || uploadingContentFile}>
                {creatingRequest ? "Đang gửi..." : "Gửi yêu cầu tạo campaign"}
              </button>
            </div>
          </form>

          {error ? <div className="mt-4"><ErrorState title="Không thể tải yêu cầu campaign" description={error} onRetry={() => void load()} /></div> : null}
          {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

          {!loading ? (
            <section className="mt-6">
              <SectionHeader title="Yêu cầu tạo campaign của tôi" subtitle={`${requestCount} yêu cầu`} />
              <div className="mt-4 rounded-2xl border border-zinc-100 bg-white/80 p-4">
                <div className="grid gap-2 md:grid-cols-4">
                  <input className="dc-input" placeholder="Tìm theo tên campaign" value={query} onChange={(event) => setQuery(event.target.value)} />
                  <select className="dc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {REQUEST_STATUS_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select className="dc-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="">Tất cả loại campaign</option>
                    <option value="DONATION">Ủng hộ</option>
                    <option value="PREORDER">Đặt trước</option>
                    <option value="SPONSORSHIP">Tài trợ</option>
                    <option value="COMMUNITY">Cộng đồng</option>
                  </select>
                  <select className="dc-input" value={setupSourceFilter} onChange={(event) => setSetupSourceFilter(event.target.value)}>
                    <option value="">Tất cả nguồn tạo</option>
                    <option value="BRAND_REQUESTED">Brand gửi yêu cầu</option>
                    <option value="JOIN_EXISTING_DCREATOR_CAMP">Tham gia campaign dCreator</option>
                  </select>
                </div>
              </div>
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
                        <CampaignRequestCover src={request.coverImageUrl} title={request.title} />
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getContentFileUrlFromBrief(request.brief) ? (
                            <a className="inline-flex rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100" href={`/api/uploads/onboarding-doc-download?url=${encodeURIComponent(getContentFileUrlFromBrief(request.brief))}`} target="_blank" rel="noopener noreferrer">
                              Mở file nội dung đã gửi
                            </a>
                          ) : null}
                          {request.status === "NEEDS_REVISION" ? (
                            <button type="button" className="dc-btn-primary" onClick={() => openRevisionModal(request)}>
                              Bổ sung
                            </button>
                          ) : null}
                        </div>
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

      {revisionTarget ? (
        <div className="fixed inset-0 z-[90] bg-zinc-900/50 p-3 md:p-6" onClick={() => setRevisionTarget(null)}>
          <div className="mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">Bổ sung yêu cầu tạo campaign</h3>
                <p className="text-sm text-zinc-600">{revisionTarget.title} • /{revisionTarget.requestedSlug}</p>
              </div>
              <button type="button" className="dc-btn-secondary" onClick={() => setRevisionTarget(null)}>Đóng</button>
            </div>

            {revisionTarget.adminNote ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Ghi chú admin: {revisionTarget.adminNote}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-amber-800 md:col-span-2">
                Tên campaign
                <input
                  className="dc-input bg-white"
                  value={currentRevisionForm.title}
                  onChange={(event) => setRevisionField(revisionTarget.id, "title", event.target.value)}
                  placeholder="Nhập tên campaign"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-amber-800">
                <span className="flex items-center justify-between gap-2">
                  Ảnh campaign
                  {revisionTarget.coverImageUrl ? (
                    <button type="button" className="text-xs font-semibold text-amber-700 underline" onClick={() => void restoreOldRevisionImage(revisionTarget)}>
                      Dùng ảnh cũ
                    </button>
                  ) : null}
                </span>
                <input
                  ref={revisionImageInputRef}
                  className="dc-input bg-white"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadRevisionCoverImage(revisionTarget.id, file);
                  }}
                  disabled={uploadingCover}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-amber-800">
                <span className="flex items-center justify-between gap-2">
                  File nội dung campaign
                  {getContentFileUrlFromBrief(revisionTarget.brief) ? (
                    <button type="button" className="text-xs font-semibold text-amber-700 underline" onClick={() => void restoreOldRevisionContentFile(revisionTarget)}>
                      Dùng file cũ
                    </button>
                  ) : null}
                </span>
                <input
                  ref={revisionContentFileInputRef}
                  className="dc-input bg-white"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadRevisionCampaignContentFile(revisionTarget.id, file);
                  }}
                  disabled={uploadingContentFile}
                />
              </label>
              <button
                type="button"
                className="dc-btn-primary w-fit md:col-span-2"
                disabled={submittingRevisionId === revisionTarget.id}
                onClick={() => void submitRevisionFeedback(revisionTarget.id)}
              >
                {submittingRevisionId === revisionTarget.id ? "Đang gửi..." : "Gửi bổ sung"}
              </button>
            </div>
          </div>
        </div>
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

      {historyCampaign ? (
        <div className="fixed inset-0 z-[90] bg-zinc-900/50 p-3 md:p-6" onClick={() => setHistoryCampaign(null)}>
          <div className="mx-auto max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">Lịch sử nhiệm vụ campaign</h3>
                <p className="text-sm text-zinc-600">{historyCampaign.title} • /{historyCampaign.slug}</p>
              </div>
              <button type="button" className="dc-btn-secondary" onClick={() => setHistoryCampaign(null)}>Đóng</button>
            </div>

            <BrandMissionHistoryPanel embedded fixedCampaignId={historyCampaign.id} />
          </div>
        </div>
      ) : null}
    </>
  );
}
