"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DownloadSimple, FileArrowDown, ImageSquare } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { BrandMissionHistoryPanel } from "@/app/dashboard/brand/_components/BrandMissionHistoryPanel";
import { BrandSubscriptionPanel } from "@/app/dashboard/brand/_components/BrandSubscriptionPanel";
import { useCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";
import { MissionReviewsPage, type MissionReviewsTabKey } from "@/app/dashboard/brand/mission-reviews/page";
import { trackEvent } from "@/lib/analytics";
import { AnalyticsEvents } from "@/lib/analytics-events";
import { extractCampaignRequestMarkerValue, campaignRequestMarkers } from "@/lib/campaign-request-meta";

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
  fulfillmentMode?: "BRAND_SHIP" | "CREATOR_ORDER";
};

type ShippingCreatorItem = {
  id: string;
  creatorName: string;
  creatorEmail: string | null;
  depositStatus: string;
  creatorDepositAmountVnd: number;
  depositHeldAt: string | null;
  shippingRecipientName: string | null;
  shippingPhone: string | null;
  shippingAddressFull: string;
  shippingNote: string | null;
  shippingInfoSubmittedAt: string | null;
  sampleShippingStatus: string;
  sampleShippedAt: string | null;
  sampleReceivedAt: string | null;
  campaignTitle: string;
  productName: string | null;
  productLink: string | null;
};

type ShippingCreatorsResponse = {
  campaign: { id: string; title: string; fulfillmentMode: "BRAND_SHIP" | "CREATOR_ORDER" };
  items: ShippingCreatorItem[];
};

type CampaignRequestItem = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  requirements?: string;
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

type UploadResult = {
  url: string;
  filename: string;
  imageUrl?: string;
  coverImageUrl?: string;
  fileUrl?: string;
  contentFileUrl?: string;
  contractDocumentUrl?: string;
};

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

const CONTENT_FILE_MARKER = campaignRequestMarkers.content;

function BrandCampaignShippingModal({
  campaign,
  currentBrandId,
  onClose
}: {
  campaign: Pick<CampaignItem, "id" | "title" | "slug">;
  currentBrandId: string | null | undefined;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ShippingCreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const apiUrl = useMemo(() => {
    const base = `/api/brand/dashboard/campaigns/${campaign.id}/shipping`;
    return currentBrandId ? `${base}?brandId=${encodeURIComponent(currentBrandId)}` : base;
  }, [campaign.id, currentBrandId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<ShippingCreatorsResponse>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải danh sách gửi hàng");
      setItems(payload.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách gửi hàng");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyShipping(item: ShippingCreatorItem) {
    try {
      await navigator.clipboard.writeText(shippingCopyText(item));
      setNotice("Đã copy thông tin nhận hàng");
      setTimeout(() => setNotice(""), 2000);
    } catch {
      setError("Không thể copy tự động. Vui lòng copy thủ công.");
    }
  }

  async function markShipped(item: ShippingCreatorItem) {
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorMissionId: item.id })
      });
      const payload = (await response.json()) as ApiResponse<ShippingCreatorsResponse>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Cập nhật trạng thái gửi hàng thất bại");
      setItems(payload.data.items);
      setNotice("Đã cập nhật trạng thái gửi hàng");
      setTimeout(() => setNotice(""), 2000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Cập nhật trạng thái gửi hàng thất bại");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-zinc-900/50 p-3 md:p-6" onClick={onClose}>
      <div className="mx-auto max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">Creator cần gửi hàng</h3>
            <p className="text-sm text-zinc-600">{campaign.title} • /{campaign.slug}</p>
          </div>
          <button type="button" className="dc-btn-secondary" onClick={onClose}>Đóng</button>
        </div>

        {notice ? <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
        {error ? <ErrorState title="Không thể tải danh sách gửi hàng" description={error} onRetry={() => void load()} /> : null}
        {loading ? <LoadingSkeleton rows={4} /> : null}

        {!loading && !error ? (
          <section className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Chưa có Creator nào đã đặt cọc và cần gửi hàng." description="Danh sách sẽ xuất hiện khi Creator được duyệt, đã đặt cọc và đã nhập thông tin nhận hàng." />
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1.4fr_1fr_auto] xl:items-start">
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-zinc-900">{item.creatorName}</p>
                      <p className="break-all text-zinc-500">{item.creatorEmail ?? "-"}</p>
                      <p className="mt-2 text-zinc-600">Cọc: <strong className="text-zinc-900">{formatVnd(item.creatorDepositAmountVnd)}</strong></p>
                      <p className="text-zinc-600">Trạng thái cọc: <strong className="text-zinc-900">{shippingStatusLabel(item.depositStatus)}</strong></p>
                      <p className="text-zinc-600">Ngày cọc: {formatDateTime(item.depositHeldAt)}</p>
                    </div>
                    <div className="min-w-0 text-sm text-zinc-700">
                      <p className="font-semibold text-zinc-900">Thông tin nhận hàng</p>
                      <p>Họ tên: {item.shippingRecipientName ?? "-"}</p>
                      <p>SĐT: {item.shippingPhone ?? "-"}</p>
                      <p>Địa chỉ: {item.shippingAddressFull || "-"}</p>
                      {item.shippingNote ? <p>Ghi chú: {item.shippingNote}</p> : null}
                    </div>
                    <div className="min-w-0 text-sm text-zinc-700">
                      <p>Sản phẩm: <strong className="text-zinc-900">{item.productName ?? "-"}</strong></p>
                      <p>Link: {item.productLink ? <a className="font-semibold text-zinc-900 underline break-all" href={item.productLink} target="_blank" rel="noreferrer">{item.productLink}</a> : "-"}</p>
                      <p className="mt-2">Gửi hàng: <strong className="text-zinc-900">{shippingStatusLabel(item.sampleShippingStatus)}</strong></p>
                      {item.sampleShippedAt ? <p>Đã gửi lúc: {formatDateTime(item.sampleShippedAt)}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button type="button" className="dc-btn-secondary w-full whitespace-normal sm:w-auto" onClick={() => void copyShipping(item)}>
                        Copy thông tin nhận hàng
                      </button>
                      {item.sampleShippingStatus === "READY_TO_SHIP" ? (
                        <button type="button" className="dc-btn-primary w-full whitespace-normal sm:w-auto" disabled={busyId === item.id} onClick={() => void markShipped(item)}>
                          Đã gửi hàng
                        </button>
                      ) : (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                          {shippingStatusLabel(item.sampleShippingStatus)}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function getContentFileUrlFromBrief(brief: string) {
  return extractCampaignRequestMarkerValue(brief, CONTENT_FILE_MARKER);
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

function getUploadUrl(upload: UploadResult, preferredKeys: Array<keyof UploadResult>) {
  for (const key of preferredKeys) {
    const value = upload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return upload.url;
}

function getRequestRejectionReason(request: CampaignRequestItem) {
  return request.adminNote?.trim() || request.brandFeedback?.trim() || "Chưa có lý do từ chối được cung cấp.";
}

function formatDate(value: string | null) {
  if (!value) return "Chưa đặt";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function formatVnd(value: number | null | undefined) {
  return `${Math.max(0, value ?? 0).toLocaleString("vi-VN")}đ`;
}

function shippingStatusLabel(value: string | null | undefined) {
  const map: Record<string, string> = {
    NOT_REQUIRED: "Không yêu cầu",
    WAITING_DEPOSIT: "Chờ đặt cọc",
    READY_TO_SHIP: "Sẵn sàng gửi",
    SHIPPED: "Đã gửi hàng",
    RECEIVED: "Đã nhận hàng",
    HELD: "Đã cọc"
  };
  return value ? map[value] ?? value : "-";
}

function shippingCopyText(item: ShippingCreatorItem) {
  return [
    `Người nhận: ${item.shippingRecipientName ?? ""}`,
    `SĐT: ${item.shippingPhone ?? ""}`,
    `Địa chỉ: ${item.shippingAddressFull}`,
    `Ghi chú: ${item.shippingNote ?? ""}`,
    `Campaign: ${item.campaignTitle}`,
    `Sản phẩm: ${item.productName ?? ""}`
  ].join("\n");
}

function progress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBrandId } = useCurrentBrand();
  const [activeTab, setActiveTab] = useState<"campaigns" | "requests" | "packages">("campaigns");
  const [requestListTab, setRequestListTab] = useState<"pending" | "approved">("pending");
  const [reviewCampaign, setReviewCampaign] = useState<Pick<CampaignItem, "id" | "title" | "slug"> | null>(null);
  const [historyCampaign, setHistoryCampaign] = useState<Pick<CampaignItem, "id" | "title" | "slug"> | null>(null);
  const [shippingCampaign, setShippingCampaign] = useState<Pick<CampaignItem, "id" | "title" | "slug"> | null>(null);
  const [rejectedReasonTarget, setRejectedReasonTarget] = useState<CampaignRequestItem | null>(null);
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
  const requestImageInputRef = useRef<HTMLInputElement | null>(null);
  const requestContentFileInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "campaigns" || tab === "requests" || tab === "packages") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== "requests") return;
    trackEvent(AnalyticsEvents.BRAND_CAMPAIGN_CREATE_OPEN, {
      brand_id: currentBrandId ?? undefined,
      role: "brand"
    });
  }, [activeTab, currentBrandId]);

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
    const list = requests.filter((request) => (
      requestListTab === "approved"
        ? request.status === "APPROVED"
        : request.status !== "APPROVED"
    ));
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [requests, requestListTab]);

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
      formData.append("image", file);
      const response = await fetch("/api/uploads/campaign-image", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<UploadResult>;
      if (!response.ok || !payload.success || !payload.data?.url) throw new Error(payload.success ? "Không thể tải ảnh campaign" : payload.error);
      setRequestField("imageUrl", getUploadUrl(payload.data, ["imageUrl", "coverImageUrl"]));
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
      formData.append("file", file);
      const response = await fetch("/api/uploads/campaign-file", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<UploadResult>;
      if (!response.ok || !payload.success || !payload.data?.url) throw new Error(payload.success ? "Không thể tải file nội dung campaign" : payload.error);
      setRequestField("contentFileUrl", getUploadUrl(payload.data, ["contentFileUrl", "fileUrl", "contractDocumentUrl"]));
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
      formData.append("image", file);
      const response = await fetch("/api/uploads/campaign-image", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<UploadResult>;
      if (!response.ok || !payload.success || !payload.data?.url) throw new Error(payload.success ? "Không thể tải ảnh campaign" : payload.error);
      setRevisionField(requestId, "imageUrl", getUploadUrl(payload.data, ["imageUrl", "coverImageUrl"]));
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
      formData.append("file", file);
      const response = await fetch("/api/uploads/campaign-file", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<UploadResult>;
      if (!response.ok || !payload.success || !payload.data?.url) throw new Error(payload.success ? "Không thể tải file nội dung campaign" : payload.error);
      setRevisionField(requestId, "contentFileUrl", getUploadUrl(payload.data, ["contentFileUrl", "fileUrl", "contractDocumentUrl"]));
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
    trackEvent(AnalyticsEvents.BRAND_CAMPAIGN_CREATE_SUBMIT, {
      brand_id: currentBrandId ?? undefined,
      role: "brand"
    });
    const nextErrors = validateRequestForm();
    if (Object.values(nextErrors).some(Boolean)) {
      setRequestFieldErrors(nextErrors);
      setError("Vui lòng kiểm tra các trường được đánh dấu đỏ.");
      setNotice("");
      trackEvent(AnalyticsEvents.BRAND_CAMPAIGN_CREATE_FAILED, {
        brand_id: currentBrandId ?? undefined,
        role: "brand"
      });
      return;
    }
    setCreatingRequest(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(campaignRequestApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestForm,
          title: requestForm.title.trim(),
          imageUrl: requestForm.imageUrl.trim(),
          contentFileUrl: requestForm.contentFileUrl.trim()
        })
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequestItem>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi yêu cầu" : payload.error);
      trackEvent(AnalyticsEvents.BRAND_CAMPAIGN_CREATE_SUCCESS, {
        brand_id: currentBrandId ?? undefined,
        campaign_id: payload.data?.id,
        campaign_type: payload.data?.campaignType,
        role: "brand"
      });
      setRequestForm(defaultRequestForm);
      setRequestFieldErrors({});
      if (requestImageInputRef.current) requestImageInputRef.current.value = "";
      if (requestContentFileInputRef.current) requestContentFileInputRef.current.value = "";
      setNotice("Đã gửi yêu cầu tạo campaign cho Admin.");
      setActiveTab("requests");
      await load();
    } catch (requestError) {
      trackEvent(AnalyticsEvents.BRAND_CAMPAIGN_CREATE_FAILED, {
        brand_id: currentBrandId ?? undefined,
        role: "brand"
      });
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
                  action={<Link href="/dashboard/brand/campaigns?tab=requests" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
                />
              ) : (
                <div className="grid gap-4 xl:grid-cols-3">
                  {filtered.map((campaign) => {
                    const videoTarget = campaign.videoTarget ?? Math.max(0, campaign.ugcVideoQuota ?? 0);
                    const videoApproved = campaign.videoApproved ?? Math.max(0, campaign.ugcVideoApprovedCount ?? 0);
                    const videoProgressPercent = campaign.videoProgressPercent ?? progress(videoApproved, videoTarget);
                    const creatorJoined = campaign.creatorJoinedCount ?? 0;

                    return (
                      <article
                        key={campaign.id}
                        className="group dc-card cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-zinc-300 focus-visible:-translate-y-1 focus-visible:shadow-xl focus-visible:ring-2 focus-visible:ring-zinc-400"
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/dashboard/brand/campaigns/detail/${campaign.slug}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/dashboard/brand/campaigns/detail/${campaign.slug}`);
                          }
                        }}
                      >
                        <div className="relative flex h-40 items-end overflow-hidden bg-zinc-100">
                          <CampaignCoverImage
                            src={campaign.coverImageUrl}
                            alt={campaign.title}
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            sizes="(max-width: 1280px) 100vw, 50vw"
                          />
                          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-semibold text-zinc-900 opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                            Xem chi tiết
                          </div>
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

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              className="dc-btn-secondary w-full min-w-0 max-w-full whitespace-normal break-words px-3 py-2 text-xs leading-tight sm:w-auto"
                              onClick={(event) => {
                                event.stopPropagation();
                                setHistoryCampaign({ id: campaign.id, title: campaign.title, slug: campaign.slug });
                              }}
                            >
                              Xem lịch sử
                            </button>
                            <button type="button" className="dc-btn-secondary w-full min-w-0 max-w-full whitespace-normal break-words px-3 py-2 text-xs leading-tight sm:w-auto" disabled onClick={(event) => event.stopPropagation()}>KPI / Analytics</button>
                            {campaign.fulfillmentMode === "BRAND_SHIP" ? (
                              <button
                                type="button"
                                className="dc-btn-secondary w-full min-w-0 max-w-full whitespace-normal break-words px-3 py-2 text-xs leading-tight sm:w-auto"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setShippingCampaign({ id: campaign.id, title: campaign.title, slug: campaign.slug });
                                }}
                              >
                                Creator cần gửi hàng
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={`${campaign.reviewPendingCount ? "dc-btn-primary" : "dc-btn-secondary"} w-full min-w-0 max-w-full whitespace-normal break-words px-3 py-2 text-xs leading-tight sm:w-auto`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openMissionReview(campaign);
                              }}
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
              <input ref={requestImageInputRef} className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) void uploadCoverImage(file);
              }} disabled={uploadingCover} />
              {requestFieldErrors.imageUrl ? <span className="text-xs text-red-600">{requestFieldErrors.imageUrl}</span> : null}
              {uploadingCover ? <span className="text-xs font-semibold text-amber-700">Đang tải ảnh campaign...</span> : null}
              {requestForm.imageUrl ? (
                <div className="relative h-32 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  <CampaignRequestCover src={requestForm.imageUrl} title={requestForm.title || "Ảnh campaign"} />
                </div>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              File nội dung campaign
              <input ref={requestContentFileInputRef} className="dc-input bg-white" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) void uploadCampaignContentFile(file);
              }} disabled={uploadingContentFile} required={!requestForm.contentFileUrl} />
              {requestFieldErrors.contentFileUrl ? <span className="text-xs text-red-600">{requestFieldErrors.contentFileUrl}</span> : null}
              {uploadingContentFile ? <span className="text-xs font-semibold text-amber-700">Đang tải file nội dung campaign...</span> : null}
              {requestForm.contentFileUrl ? (
                <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  Đã tải: {getFileNameFromUrl(requestForm.contentFileUrl, "campaign-file")}
                </span>
              ) : null}
            </label>
            <div className="mx-auto w-full max-w-5xl rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
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
            <div className="flex justify-center md:col-span-2">
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRequestListTab("pending")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${requestListTab === "pending" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
                >
                  Chưa duyệt
                </button>
                <button
                  type="button"
                  onClick={() => setRequestListTab("approved")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${requestListTab === "approved" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
                >
                  Đã duyệt
                </button>
              </div>
              {requestCount === 0 ? (
                <EmptyState
                  title="Chưa có yêu cầu tạo campaign"
                  description="Gửi yêu cầu mới để Admin tạo campaign phù hợp cho brand của bạn."
                  action={<Link href="/dashboard/brand/campaigns?tab=requests" className="dc-btn-primary">Gửi yêu cầu tạo campaign</Link>}
                />
              ) : (
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
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
                          {request.status === "REJECTED" ? (
                            <button type="button" className="dc-btn-secondary" onClick={() => setRejectedReasonTarget(request)}>
                              Xem lý do
                            </button>
                          ) : null}
                          {request.status === "NEEDS_REVISION" ? (
                            <button type="button" className="dc-btn-primary" onClick={() => openRevisionModal(request)}>
                              Bổ sung
                            </button>
                          ) : null}
                        </div>
                        {request.requirements ? (
                          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Yêu cầu</p>
                            <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-zinc-700">{request.requirements}</p>
                          </div>
                        ) : null}
                        {request.createdCampaign ? (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            <p>Đã tạo campaign: {request.createdCampaign.title}</p>
                            <Link href={`/dashboard/brand/campaigns/detail/${request.createdCampaign.slug}`} className="font-semibold underline">Xem campaign</Link>
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
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadRevisionCoverImage(revisionTarget.id, file);
                  }}
                  disabled={uploadingCover}
                />
                {currentRevisionForm.imageUrl ? (
                  <div className="relative h-28 overflow-hidden rounded-xl border border-amber-200 bg-white">
                    <CampaignRequestCover src={currentRevisionForm.imageUrl} title={currentRevisionForm.title || revisionTarget.title} />
                  </div>
                ) : null}
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
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadRevisionCampaignContentFile(revisionTarget.id, file);
                  }}
                  disabled={uploadingContentFile}
                />
                {currentRevisionForm.contentFileUrl ? (
                  <span className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700">
                    Đã tải: {getFileNameFromUrl(currentRevisionForm.contentFileUrl, "campaign-file")}
                  </span>
                ) : null}
              </label>
              <button
                type="button"
                className="dc-btn-primary w-fit md:col-span-2"
                disabled={submittingRevisionId === revisionTarget.id || uploadingCover || uploadingContentFile}
                onClick={() => void submitRevisionFeedback(revisionTarget.id)}
              >
                {submittingRevisionId === revisionTarget.id ? "Đang gửi..." : "Gửi bổ sung"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectedReasonTarget ? (
        <div className="fixed inset-0 z-[90] bg-zinc-900/50 p-3 md:p-6" onClick={() => setRejectedReasonTarget(null)}>
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">Lý do từ chối</h3>
                <p className="text-sm text-zinc-600">{rejectedReasonTarget.title} • /{rejectedReasonTarget.requestedSlug}</p>
              </div>
              <button type="button" className="dc-btn-secondary" onClick={() => setRejectedReasonTarget(null)}>Đóng</button>
            </div>

            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {getRequestRejectionReason(rejectedReasonTarget)}
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

      {shippingCampaign ? (
        <BrandCampaignShippingModal
          campaign={shippingCampaign}
          currentBrandId={currentBrandId}
          onClose={() => setShippingCampaign(null)}
        />
      ) : null}
    </>
  );
}
