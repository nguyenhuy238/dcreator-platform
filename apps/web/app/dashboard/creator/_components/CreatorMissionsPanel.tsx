"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, IdentificationCard, Megaphone, Package, Scroll, VideoCamera } from "@phosphor-icons/react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, SectionHeader } from "@/app/components/dcreator/ui/base";
import type { CreatorOverview } from "@/app/dashboard/creator/_components/CreatorDashboardClient";
import { trackEvent } from "@/lib/analytics";
import { AnalyticsEvents } from "@/lib/analytics-events";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type MissionItem = {
  id: string;
  createdAt: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  depositStatus: string;
  reimbursementStatus?: string | null;
  purchaseProofSubmittedAt?: string | null;
  purchaseProofReviewedAt?: string | null;
  productPurchasedConfirmedAt?: string | null;
  videoSubmittedAt?: string | null;
  videoReviewedAt?: string | null;
  videoReviewStatus: string;
  videoReviewFeedback: string | null;
  publishStatus: string;
  publishFeedback: string | null;
  publishResubmitFields?: string[] | null;
  publishSubmittedAt: string | null;
  publishReviewedAt?: string | null;
  mission: {
    title: string;
    description: string;
    rewardPoints: number;
    productName: string | null;
    productDescription: string | null;
    productImageUrl: string | null;
    productLink: string | null;
    audience: string;
    allowRepeat: boolean;
    deadlineAt: string | null;
  };
  campaign: {
    title: string;
    slug: string;
    fulfillmentMode?: "BRAND_SHIP" | "CREATOR_ORDER" | null;
    creatorDepositRequired?: boolean | null;
    creatorDepositAmountVnd?: number | null;
  };
  submission: {
    transcriptType: "TEXT" | "FILE" | "URL" | null;
    transcriptTextNote: string | null;
    transcriptResourceUrl: string | null;
    videoUrl: string | null;
    note: string | null;
    rejectReason: string | null;
    publicVideoUrl: string | null;
    socialPostUrl: string | null;
    adCode: string | null;
    screenshotUrl: string | null;
    purchaseBillImageUrl: string | null;
    productReviewScreenshotUrl: string | null;
    finalProofNote: string | null;
    proofTextNote: string | null;
    fileUploadUrl: string | null;
    status: string;
  } | null;
  missionApplication: {
    status: string;
    rejectReason: string | null;
    reviewedAt?: string | null;
    createdAt?: string | null;
  } | null;
};

type FormMap = Record<string, string>;
type PreVideoChoice = "VIDEO" | "TRANSCRIPT";
type PreVideoChoiceMap = Record<string, PreVideoChoice>;
type TranscriptMode = "TEXT" | "FILE" | "URL";
type TranscriptModeMap = Record<string, TranscriptMode>;
type MissionFilter = "ALL" | "DOING" | "PENDING" | "REVISION" | "COMPLETED" | "OVERDUE";
type MissionSort = "APPROVED_NEWEST" | "APPROVED_OLDEST" | "EXPIRING_SOON";
type MissionErrorField = "form" | "bill" | "rating" | "transcript" | "transcriptFile" | "transcriptUrl" | "videoUrl" | "videoNote" | "publicUrl" | "adCode" | "screenshot" | "finalNote";
type MissionFormErrors = Partial<Record<MissionErrorField, string>>;
type DetailTab = "ACTIONS" | "HISTORY";

type CreatorMissionsPanelProps = {
  overview: CreatorOverview | null;
  initialDetailMissionId?: string;
  detailOnly?: boolean;
  onDetailClose?: () => void;
};

function missionAnalyticsParams(item: MissionItem, proofType: string) {
  return {
    mission_id: item.id,
    campaign_id: item.campaign.slug,
    proof_type: proofType,
    role: "creator"
  };
}

const publishResubmitFieldLabelMap: Record<string, string> = {
  PUBLIC_URL: "Link public",
  AD_CODE: "Mã quảng cáo",
  SCREENSHOT: "Screenshot",
  PURCHASE_BILL: "Ảnh bill mua hàng",
  PRODUCT_REVIEW_SCREENSHOT: "Ảnh vote 5 sao"
};

function toPlainTranscript(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|blockquote)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fmtDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

function fmtVnd(value: number | null | undefined) {
  return `${Math.max(0, value ?? 0).toLocaleString("vi-VN")}đ`;
}

function campaignFulfillmentMode(item: MissionItem) {
  return item.campaign.fulfillmentMode === "CREATOR_ORDER" ? "CREATOR_ORDER" : "BRAND_SHIP";
}

function requiresCreatorDeposit(item: MissionItem) {
  return campaignFulfillmentMode(item) === "BRAND_SHIP" && item.campaign.creatorDepositRequired !== false;
}

function hasHeldCreatorDeposit(item: MissionItem) {
  return !requiresCreatorDeposit(item) || item.depositStatus === "HELD";
}

function asLink(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/uploads/creator-transcript/")) {
    return `/api/uploads/transcript-download?url=${encodeURIComponent(trimmed)}`;
  }
  if (trimmed.startsWith("/uploads/creator-mission-proof/")) {
    return `/api/uploads/creator-mission-proof-download?url=${encodeURIComponent(trimmed)}`;
  }
  if (trimmed.startsWith("/")) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function UrlValue({ value, label }: { value: string | null | undefined; label?: string }) {
  const href = asLink(value);
  if (!href) return <span>-</span>;
  const isDownload = href.startsWith("/api/uploads/");
  return (
    <a href={href} download={isDownload} className="font-semibold text-zinc-900 underline break-all">
      {label ?? value}
    </a>
  );
}

function transcriptDownloadHref(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("/uploads/creator-transcript/")) {
    return `/api/uploads/transcript-download?url=${encodeURIComponent(value)}`;
  }
  const external = asLink(value);
  return external ?? null;
}

function isTranscriptUploadPath(value: string | null | undefined) {
  return Boolean(value?.trim().startsWith("/uploads/creator-transcript/"));
}

function transcriptModeFromSubmission(submission: MissionItem["submission"]): TranscriptMode {
  if (submission?.transcriptType) return submission.transcriptType;
  if (toPlainTranscript(submission?.transcriptTextNote)) return "TEXT";
  if (isTranscriptUploadPath(submission?.transcriptResourceUrl)) return "FILE";
  if (submission?.transcriptResourceUrl?.trim()) return "URL";
  return "TEXT";
}

function transcriptLinkLabel(value: string | null | undefined) {
  return isTranscriptUploadPath(value) ? "Tải file kịch bản" : "Mở link kịch bản";
}

function transcriptModeLabel(mode: TranscriptMode | null | undefined, resourceUrl?: string | null) {
  if (mode === "TEXT") return "Viết trực tiếp";
  if (mode === "FILE") return "Tải file lên";
  if (mode === "URL") return "Gửi link URL";
  return resourceUrl ? (isTranscriptUploadPath(resourceUrl) ? "Tải file lên" : "Gửi link URL") : "Viết trực tiếp";
}

function workflowStatus(item: MissionItem) {
  const purchaseDone = item.productReceiveOption === "NO_PRODUCT_REQUIRED" || item.productStatus === "RECEIVED";
  const transcriptText = Boolean(toPlainTranscript(item.submission?.transcriptTextNote));
  const transcriptFile = Boolean(item.submission?.transcriptResourceUrl?.trim());
  const hasTranscriptSubmitted =
    item.status === "DRAFT_PENDING" ||
    item.submission?.status === "SUBMITTED" ||
    item.submission?.status === "APPROVED" ||
    transcriptText ||
    transcriptFile;
  const transcriptPending = item.status === "DRAFT_PENDING" && item.submission?.status === "SUBMITTED";
  const transcriptRejected = item.status === "DRAFT_PENDING" && item.submission?.status === "REJECTED";
  const transcriptApproved = hasTranscriptSubmitted && !transcriptPending && !transcriptRejected;
  const hasVideoSubmitted = item.videoReviewStatus !== "NOT_SUBMITTED" || Boolean(item.submission?.videoUrl?.trim());

  if (item.missionApplication?.status === "PENDING_REVIEW") return "Chờ duyệt campaign";
  if (item.missionApplication?.status === "REJECTED") return "Bị từ chối";
  if (item.status === "COMPLETED") return "Hoàn thành";
  if (item.status === "CANCELLED") return "Bị từ chối";
  if (isMissionOverdue(item)) return "Quá hạn";
  if (item.reimbursementStatus === "PAYOUT_PENDING") return "Chờ hoàn tiền";
  if (requiresCreatorDeposit(item) && item.depositStatus !== "HELD") {
    return item.depositStatus === "PENDING" ? "Chờ Admin xác nhận cọc" : "Chờ đặt cọc";
  }
  if (item.publishStatus === "PENDING") return "Link public đang chờ duyệt";
  if (item.publishStatus === "REJECTED") return "Link public bị từ chối";
  if (item.videoReviewStatus === "PENDING") return "Video đang chờ duyệt";
  if (item.videoReviewStatus === "REJECTED") return "Video bị từ chối";
  if (item.videoReviewStatus === "APPROVED") return "Chờ nộp link social public";
  if (item.status === "DRAFT_PENDING") {
    if (item.submission?.status === "SUBMITTED") return "Kịch bản đang chờ duyệt";
    if (item.submission?.status === "REJECTED") return "Kịch bản bị từ chối";
    return "Chờ nộp kịch bản";
  }
  if (item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED") {
    return campaignFulfillmentMode(item) === "BRAND_SHIP" ? "Chờ nhận sản phẩm" : "Chờ mua sản phẩm";
  }
  if (purchaseDone && !hasVideoSubmitted && transcriptApproved) return "Nộp video";
  return "Chờ chọn kịch bản hoặc nộp video";
}

function isMissionOverdue(item: MissionItem) {
  if (!item.mission.deadlineAt) return false;
  if (item.status === "COMPLETED" || item.missionApplication?.status === "REJECTED" || item.status === "CANCELLED") return false;
  return new Date(item.mission.deadlineAt).getTime() < Date.now();
}

function getRequestedPublishResubmitFields(item: MissionItem) {
  if (item.publishStatus !== "REJECTED" || !item.publishResubmitFields?.length) return null;
  return new Set(item.publishResubmitFields);
}

function missionGroup(item: MissionItem): Exclude<MissionFilter, "ALL"> {
  if (item.status === "COMPLETED") return "COMPLETED";
  if (item.missionApplication?.status === "REJECTED") return "REVISION";
  if (isMissionOverdue(item)) return "OVERDUE";
  if (item.missionApplication?.status === "PENDING_REVIEW") return "PENDING";
  if (item.missionApplication?.status !== "APPROVED") return "PENDING";
  if (item.videoReviewStatus === "REJECTED" || item.publishStatus === "REJECTED" || item.submission?.status === "REJECTED") return "REVISION";
  if (
    item.videoReviewStatus === "PENDING" ||
    item.publishStatus === "PENDING" ||
    item.submission?.status === "SUBMITTED"
  ) {
    return "PENDING";
  }
  return "DOING";
}

function isApprovedAndUncompleted(item: MissionItem) {
  return item.missionApplication?.status === "APPROVED" && missionGroup(item) === "DOING" && item.status !== "COMPLETED";
}

function statusTone(item: MissionItem) {
  if (item.reimbursementStatus === "PAYOUT_PENDING") return "bg-amber-50 text-amber-700";
  const group = missionGroup(item);
  if (group === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (group === "REVISION") return "bg-red-50 text-red-700";
  if (group === "OVERDUE") return "bg-red-50 text-red-700";
  if (group === "PENDING") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

function daysLeft(deadlineAt: string | null) {
  if (!deadlineAt) return null;
  const end = new Date(deadlineAt).getTime();
  const start = new Date().getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function deadlineLabel(deadlineAt: string | null) {
  const days = daysLeft(deadlineAt);
  if (days === null) return "Không giới hạn";
  if (days < 0) return "Đã quá hạn";
  if (days === 0) return "Hôm nay";
  if (days <= 7) return `${days} ngày nữa`;
  return fmtDate(deadlineAt);
}

function missionStatusLabel(status: string) {
  if (status === "PRODUCT_PENDING") return "Đang chờ mua sản phẩm";
  if (status === "DRAFT_PENDING") return "Đang chờ duyệt kịch bản";
  if (status === "IN_PROGRESS") return "Đang thực hiện";
  if (status === "COMPLETED") return "Đã hoàn thành";
  if (status === "CANCELLED") return "Đã hủy";
  return "Không xác định";
}

type TimelineStep = {
  key: string;
  label: string;
  icon: "application" | "purchase" | "draftChoice" | "draftSubmit" | "draftReview" | "videoSubmit" | "videoReview" | "publish" | "publishReview" | "refund" | "completed";
  done: boolean;
  current: boolean;
  failed: boolean;
};

function TimelineStepIcon({ step }: { step: TimelineStep["icon"] }) {
  if (step === "application") return <IdentificationCard size={18} weight="duotone" />;
  if (step === "purchase") return <Package size={18} weight="duotone" />;
  if (step === "draftChoice") return <Scroll size={18} weight="duotone" />;
  if (step === "draftSubmit") return <Scroll size={18} weight="duotone" />;
  if (step === "draftReview") return <CheckCircle size={18} weight="duotone" />;
  if (step === "videoSubmit") return <VideoCamera size={18} weight="duotone" />;
  if (step === "videoReview") return <CheckCircle size={18} weight="duotone" />;
  if (step === "publish") return <Megaphone size={18} weight="duotone" />;
  if (step === "publishReview") return <CheckCircle size={18} weight="duotone" />;
  if (step === "refund") return <Package size={18} weight="duotone" />;
  return <CheckCircle size={18} weight="fill" />;
}

function missionApprovedTime(item: MissionItem) {
  const value =
    item.missionApplication?.status === "APPROVED"
      ? item.missionApplication?.reviewedAt ?? item.missionApplication?.createdAt ?? item.createdAt
      : item.missionApplication?.createdAt ?? item.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function missionDeadlineTime(item: MissionItem) {
  if (!item.mission.deadlineAt) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(item.mission.deadlineAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = (await res.json()) as ApiResult<T> & { code?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
  if (!res.ok || !body.success || !body.data) {
    if (body.code === "VALIDATION_ERROR") {
      const firstFormError = body.details?.formErrors?.[0];
      if (firstFormError) throw new Error(firstFormError);
      const fieldEntries = Object.entries(body.details?.fieldErrors ?? {});
      const firstFieldMessage = fieldEntries.find(([, values]) => Array.isArray(values) && values.length > 0)?.[1]?.[0];
      if (firstFieldMessage) throw new Error(firstFieldMessage);
    }
    throw new Error(body.error ?? `Yêu cầu thất bại (${res.status})`);
  }
  return body.data;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function CreatorMissionsPanel({
  overview,
  initialDetailMissionId = "",
  detailOnly = false,
  onDetailClose
}: CreatorMissionsPanelProps) {
  const router = useRouter();
  const PAGE_SIZE = 8;
  const [items, setItems] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [detailMissionId, setDetailMissionId] = useState("");
  const [rejectedMissionId, setRejectedMissionId] = useState("");
  const [activeFilter, setActiveFilter] = useState<MissionFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [missionSort, setMissionSort] = useState<MissionSort>("APPROVED_NEWEST");
  const [detailTab, setDetailTab] = useState<DetailTab>("ACTIONS");
  const [missionErrors, setMissionErrors] = useState<Record<string, MissionFormErrors>>({});
  const [uploadingKey, setUploadingKey] = useState("");

  const [billUrlMap, setBillUrlMap] = useState<FormMap>({});
  const [ratingUrlMap, setRatingUrlMap] = useState<FormMap>({});
  const [videoUrlMap, setVideoUrlMap] = useState<FormMap>({});
  const [videoNoteMap, setVideoNoteMap] = useState<FormMap>({});
  const [transcriptMap, setTranscriptMap] = useState<FormMap>({});
  const [transcriptModeMap, setTranscriptModeMap] = useState<TranscriptModeMap>({});
  const [transcriptUrlMap, setTranscriptUrlMap] = useState<FormMap>({});
  const [preVideoChoiceMap, setPreVideoChoiceMap] = useState<PreVideoChoiceMap>({});
  const [publicUrlMap, setPublicUrlMap] = useState<FormMap>({});
  const [adCodeMap, setAdCodeMap] = useState<FormMap>({});
  const [screenshotMap, setScreenshotMap] = useState<FormMap>({});
  const [finalNoteMap, setFinalNoteMap] = useState<FormMap>({});

  function setMissionFormErrors(missionId: string, nextErrors: MissionFormErrors) {
    setMissionErrors((prev) => ({ ...prev, [missionId]: nextErrors }));
  }

  function clearMissionFormErrors(missionId: string) {
    setMissionErrors((prev) => {
      if (!prev[missionId]) return prev;
      const next = { ...prev };
      delete next[missionId];
      return next;
    });
  }

  function clearMissionErrorField(missionId: string, field: MissionErrorField) {
    setMissionErrors((prev) => {
      const current = prev[missionId];
      if (!current?.[field] && !current?.form) return prev;
      return {
        ...prev,
        [missionId]: { ...current, [field]: undefined, form: undefined }
      };
    });
  }

  function pushSuccess(message: string) {
    setNotice(message);
    setToast(message);
    setTimeout(() => setToast(""), 2600);
    window.dispatchEvent(new CustomEvent("dcreator:notifications-refresh", { detail: { suppressToast: true } }));
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson<MissionItem[]>("/api/creator/missions");
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải nhiệm vụ");
    } finally {
      setLoading(false);
    }
  }

  async function submitPurchaseProof(item: MissionItem) {
    clearMissionFormErrors(item.id);
    setBusyId(item.id);
    setNotice("");
    trackEvent(AnalyticsEvents.MISSION_SUBMIT, missionAnalyticsParams(item, "purchase"));
    try {
      await fetchJson(`/api/creator/missions/${item.id}/purchase-proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_SUCCESS, missionAnalyticsParams(item, "purchase"));
      pushSuccess("Đã xác nhận mua hàng. Bạn có thể chọn nộp kịch bản trước hoặc nộp video trực tiếp.");
      await load();
    } catch (e) {
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "purchase"));
      setMissionFormErrors(item.id, { form: toErrorMessage(e) });
    } finally {
      setBusyId("");
    }
  }

  async function submitCreatorDeposit(item: MissionItem) {
    clearMissionFormErrors(item.id);
    setBusyId(item.id);
    setNotice("");
    try {
      await fetchJson(`/api/me/mission/${item.id}/confirm-deposit`, { method: "POST" });
      pushSuccess("Đã ghi nhận yêu cầu đặt cọc. Vui lòng chờ Admin xác nhận sau khi đối soát.");
      await load();
    } catch (e) {
      setMissionFormErrors(item.id, { form: toErrorMessage(e) });
    } finally {
      setBusyId("");
    }
  }

  async function submitTranscript(item: MissionItem) {
    const mode = transcriptModeMap[item.id] ?? transcriptModeFromSubmission(item.submission);
    const transcript = transcriptMap[item.id]?.trim() ?? toPlainTranscript(item.submission?.transcriptTextNote);
    const transcriptUrl = transcriptUrlMap[item.id]?.trim() ?? item.submission?.transcriptResourceUrl?.trim() ?? "";

    if (mode === "TEXT" && !transcript) {
      setMissionFormErrors(item.id, { transcript: "Bạn chưa nhập nội dung kịch bản." });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "transcript"));
      return;
    }
    if (mode === "FILE" && !transcriptUrl) {
      setMissionFormErrors(item.id, { transcriptFile: "Bạn chưa tải file kịch bản lên." });
      return;
    }
    if (mode === "URL" && !transcriptUrl) {
      setMissionFormErrors(item.id, { transcriptUrl: "Bạn chưa nhập link kịch bản." });
      return;
    }

    clearMissionFormErrors(item.id);
    setBusyId(item.id);
    setNotice("");
    trackEvent(AnalyticsEvents.MISSION_SUBMIT, missionAnalyticsParams(item, "transcript"));
    try {
      await fetchJson(`/api/creator/missions/${item.id}/transcript-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "TEXT"
            ? { mode, transcript }
            : { mode, fileUploadUrl: mode === "URL" ? normalizeHttpUrl(transcriptUrl) : transcriptUrl }
        )
      });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_SUCCESS, missionAnalyticsParams(item, "transcript"));
      pushSuccess("Đã gửi kịch bản. Vui lòng chờ Brand/Admin duyệt trước khi nộp video review.");
      await load();
    } catch (e) {
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "transcript"));
      setMissionFormErrors(item.id, { form: toErrorMessage(e) });
    } finally {
      setBusyId("");
    }
  }

  async function submitVideo(item: MissionItem) {
    const videoUrl = videoUrlMap[item.id]?.trim();
    if (!videoUrl) {
      setMissionFormErrors(item.id, { videoUrl: "Bạn chưa nhập URL video review." });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "video"));
      return;
    }
    clearMissionFormErrors(item.id);
    setBusyId(item.id);
    setNotice("");
    trackEvent(AnalyticsEvents.MISSION_SUBMIT, missionAnalyticsParams(item, "video"));
    try {
      await fetchJson(`/api/creator/missions/${item.id}/video-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, note: videoNoteMap[item.id]?.trim() || undefined })
      });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_SUCCESS, missionAnalyticsParams(item, "video"));
      pushSuccess("Đã gửi video review. Video đang chờ Brand/Admin duyệt.");
      await load();
    } catch (e) {
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "video"));
      setMissionFormErrors(item.id, { form: toErrorMessage(e) });
    } finally {
      setBusyId("");
    }
  }

  async function submitPublish(item: MissionItem) {
    const requestedFields = getRequestedPublishResubmitFields(item);
    const isBrandShip = campaignFulfillmentMode(item) === "BRAND_SHIP";
    const shouldResubmit = (field: string) => isBrandShip || !requestedFields || requestedFields.has(field);
    const isCreatorOrder = campaignFulfillmentMode(item) === "CREATOR_ORDER";
    const publicUrl = publicUrlMap[item.id]?.trim() || item.submission?.publicVideoUrl || item.submission?.socialPostUrl || "";
    if (shouldResubmit("PUBLIC_URL") && !publicUrl.trim()) {
      setMissionFormErrors(item.id, { publicUrl: "Bạn chưa nhập link video social public." });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "publish"));
      return;
    }
    const adCode = adCodeMap[item.id]?.trim() || item.submission?.adCode || "";
    if (shouldResubmit("AD_CODE") && !adCode.trim()) {
      setMissionFormErrors(item.id, { adCode: "Bạn chưa nhập mã quảng cáo." });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "publish"));
      return;
    }
    const normalizedPublicUrl = normalizeHttpUrl(publicUrl);
    const screenshotUrl = screenshotMap[item.id]?.trim() || item.submission?.screenshotUrl || "";
    const bill = billUrlMap[item.id]?.trim() || item.submission?.purchaseBillImageUrl || "";
    const rating = ratingUrlMap[item.id]?.trim() || item.submission?.productReviewScreenshotUrl || "";
    const errors: MissionFormErrors = {};
    if (isCreatorOrder && item.productReceiveOption === "PRODUCT_REQUIRED" && shouldResubmit("PURCHASE_BILL") && !bill) errors.bill = "Bạn chưa tải ảnh bill mua hàng.";
    if (isCreatorOrder && item.productReceiveOption === "PRODUCT_REQUIRED" && shouldResubmit("PRODUCT_REVIEW_SCREENSHOT") && !rating) errors.rating = "Bạn chưa tải ảnh đánh giá 5 sao.";
    if (errors.bill || errors.rating || errors.publicUrl) {
      setMissionFormErrors(item.id, errors);
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "publish"));
      return;
    }
    clearMissionFormErrors(item.id);
    setBusyId(item.id);
    setNotice("");
    trackEvent(AnalyticsEvents.MISSION_SUBMIT, missionAnalyticsParams(item, "publish"));
    try {
      await fetchJson(`/api/creator/missions/${item.id}/publish-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicVideoUrl: normalizedPublicUrl,
          adCode: adCode || undefined,
          screenshotUrl: isCreatorOrder ? screenshotUrl || undefined : undefined,
          purchaseBillImageUrl: isCreatorOrder ? bill || undefined : undefined,
          productReviewScreenshotUrl: isCreatorOrder ? rating || undefined : undefined,
          finalProofNote: isCreatorOrder ? finalNoteMap[item.id]?.trim() || item.submission?.finalProofNote || undefined : undefined
        })
      });
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_SUCCESS, missionAnalyticsParams(item, "publish"));
      pushSuccess("Đã gửi link social public. Bước này đang chờ Brand/Admin duyệt.");
      await load();
    } catch (e) {
      trackEvent(AnalyticsEvents.MISSION_SUBMIT_FAILED, missionAnalyticsParams(item, "publish"));
      setMissionFormErrors(item.id, { form: toErrorMessage(e) });
    } finally {
      setBusyId("");
    }
  }

  async function uploadMissionImage(missionId: string, field: "bill" | "rating" | "screenshot", file: File) {
    const formData = new FormData();
    formData.append("screenshot", file);
    const key = `${missionId}:${field}`;
    setUploadingKey(key);
    clearMissionErrorField(missionId, field);
    try {
      const response = await fetch("/api/uploads/creator-mission-proof", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResult<{ screenshotUrl: string }>;
      const uploadedScreenshotUrl = payload.data?.screenshotUrl;
      if (!response.ok || !payload.success || !uploadedScreenshotUrl) {
        throw new Error(payload.error ?? "Không thể tải ảnh screenshot.");
      }
      if (field === "bill") setBillUrlMap((prev) => ({ ...prev, [missionId]: uploadedScreenshotUrl }));
      if (field === "rating") setRatingUrlMap((prev) => ({ ...prev, [missionId]: uploadedScreenshotUrl }));
      if (field === "screenshot") setScreenshotMap((prev) => ({ ...prev, [missionId]: uploadedScreenshotUrl }));
    } catch (e) {
      setMissionErrors((prev) => ({
        ...prev,
        [missionId]: { ...prev[missionId], [field]: toErrorMessage(e) }
      }));
    } finally {
      setUploadingKey("");
    }
  }

  async function uploadTranscriptFile(missionId: string, file: File) {
    const formData = new FormData();
    formData.append("transcript", file);
    const key = `${missionId}:transcript-file`;
    setUploadingKey(key);
    clearMissionErrorField(missionId, "transcriptFile");
    try {
      const response = await fetch("/api/uploads/creator-transcript", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResult<{ transcriptFileUrl: string }>;
      const uploadedTranscriptUrl = payload.data?.transcriptFileUrl;
      if (!response.ok || !payload.success || !uploadedTranscriptUrl) {
        throw new Error(payload.error ?? "Không thể tải file kịch bản.");
      }
      setTranscriptUrlMap((prev) => ({ ...prev, [missionId]: uploadedTranscriptUrl }));
    } catch (e) {
      setMissionErrors((prev) => ({
        ...prev,
        [missionId]: { ...prev[missionId], transcriptFile: toErrorMessage(e) }
      }));
    } finally {
      setUploadingKey("");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!initialDetailMissionId || items.length === 0) return;
    if (items.some((item) => item.id === initialDetailMissionId)) {
      setActiveFilter("ALL");
      setDetailMissionId(initialDetailMissionId);
      setDetailTab("ACTIONS");
    }
  }, [initialDetailMissionId, items]);

  const counters = useMemo(() => {
    const result = { doing: 0, pending: 0, revision: 0, completed: 0, overdue: 0 };
    for (const item of items) {
      if (isApprovedAndUncompleted(item)) result.doing += 1;
      const group = missionGroup(item);
      if (group === "PENDING") result.pending += 1;
      if (group === "REVISION") result.revision += 1;
      if (group === "COMPLETED") result.completed += 1;
      if (group === "OVERDUE") result.overdue += 1;
    }
    return result;
  }, [items]);

  const filteredItems = useMemo(() => {
    const base =
      activeFilter === "ALL"
        ? items
        : activeFilter === "DOING"
          ? items.filter((item) => isApprovedAndUncompleted(item))
          : items.filter((item) => missionGroup(item) === activeFilter);

    const sorted = [...base];
    sorted.sort((a, b) => {
      if (missionSort === "APPROVED_NEWEST") return missionApprovedTime(b) - missionApprovedTime(a);
      if (missionSort === "APPROVED_OLDEST") return missionApprovedTime(a) - missionApprovedTime(b);
      return missionDeadlineTime(a) - missionDeadlineTime(b);
    });
    return sorted;
  }, [activeFilter, items, missionSort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  function openMissionDetail(missionId: string) {
    setActiveFilter("ALL");
    setDetailMissionId(missionId);
    setDetailTab("ACTIONS");
  }

  function closeMissionDetail() {
    setDetailMissionId("");
    onDetailClose?.();
    if (!onDetailClose && initialDetailMissionId) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("missionId");
      router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, { scroll: false });
    }
  }

  async function reapplyMission(item: MissionItem) {
    setBusyId(item.id);
    setNotice("");
    clearMissionFormErrors(item.id);
    try {
      await fetchJson(`/api/campaigns/${item.campaign.slug}/creator-application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setRejectedMissionId("");
      pushSuccess("Đã gửi lại đăng ký campaign. Vui lòng chờ Brand/Admin duyệt.");
      await load();
    } catch (e) {
      setMissionFormErrors(item.id, { form: toErrorMessage(e) });
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    if (detailMissionId && !items.some((item) => item.id === detailMissionId)) {
      setDetailMissionId("");
    }
  }, [detailMissionId, items]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, missionSort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeMission = useMemo(
    () => (detailMissionId ? items.find((item) => item.id === detailMissionId) ?? null : null),
    [detailMissionId, items]
  );
  const rejectedMission = useMemo(
    () => (rejectedMissionId ? items.find((item) => item.id === rejectedMissionId) ?? null : null),
    [items, rejectedMissionId]
  );

  function buildMissionTimeline(item: MissionItem): TimelineStep[] {
    const purchaseDone = item.productReceiveOption === "NO_PRODUCT_REQUIRED" || item.productStatus === "RECEIVED";
    const transcriptText = Boolean(toPlainTranscript(item.submission?.transcriptTextNote));
    const transcriptFile = Boolean(item.submission?.transcriptResourceUrl?.trim());
    const hasTranscriptSubmitted =
      item.status === "DRAFT_PENDING" ||
      item.submission?.status === "SUBMITTED" ||
      item.submission?.status === "APPROVED" ||
      transcriptText ||
      transcriptFile;
    const hasVideoSubmitted = item.videoReviewStatus !== "NOT_SUBMITTED" || Boolean(item.submission?.videoUrl?.trim());
    const videoApproved = item.videoReviewStatus === "APPROVED";
    const hasPublishSubmitted = item.publishStatus !== "NOT_SUBMITTED";
    const publishDone = item.publishStatus === "APPROVED";
    const completed = item.status === "COMPLETED";
    const refundPending = item.productReceiveOption === "PRODUCT_REQUIRED" && item.reimbursementStatus === "PAYOUT_PENDING";
    const depositReady = hasHeldCreatorDeposit(item);
    const selectedFlow = preVideoChoiceMap[item.id];
    const hasChosenPreStep = Boolean(selectedFlow) || hasTranscriptSubmitted || hasVideoSubmitted;

    const transcriptPending = item.status === "DRAFT_PENDING" && item.submission?.status === "SUBMITTED";
    const transcriptRejected = item.status === "DRAFT_PENDING" && item.submission?.status === "REJECTED";
    const transcriptApproved = hasTranscriptSubmitted && !transcriptPending && !transcriptRejected;
    const transcriptStepPassed = hasTranscriptSubmitted || hasVideoSubmitted;
    const transcriptReviewPassed = transcriptApproved || hasVideoSubmitted;
    const chooseCurrent = !hasChosenPreStep && item.missionApplication?.status === "APPROVED" && purchaseDone && depositReady && !completed;
    const transcriptSubmitCurrent = hasChosenPreStep && !transcriptStepPassed && item.missionApplication?.status === "APPROVED" && purchaseDone && depositReady && !completed;
    const transcriptReviewCurrent = transcriptPending;
    const videoSubmitCurrent = !hasVideoSubmitted && transcriptReviewPassed && item.missionApplication?.status === "APPROVED" && purchaseDone && depositReady && !completed;

    const steps: TimelineStep[] = [
      {
        key: "application",
        label: "Duyệt tham gia",
        icon: "application",
        done: item.missionApplication?.status === "APPROVED" || completed,
        current: item.missionApplication?.status === "PENDING_REVIEW",
        failed: item.missionApplication?.status === "REJECTED"
      }
    ];

    if (item.productReceiveOption === "PRODUCT_REQUIRED") {
      steps.push({
        key: "purchase",
        label: campaignFulfillmentMode(item) === "BRAND_SHIP" ? "Đặt cọc / nhận hàng" : "Mua sản phẩm",
        icon: "purchase",
        done: purchaseDone || completed,
        current: !purchaseDone && item.missionApplication?.status === "APPROVED",
        failed: false
      });
    }

    steps.push({
      key: "draft-choice",
      label: "Nộp kịch bản hoặc video",
      icon: "draftChoice",
      done: hasChosenPreStep || completed,
      current: chooseCurrent,
      failed: false
    });
    steps.push({
      key: "draft-submit",
      label: "Nộp kịch bản",
      icon: "draftSubmit",
      done: transcriptStepPassed || completed,
      current: transcriptSubmitCurrent,
      failed: false
    });
    steps.push({
      key: "draft-review",
      label: "Duyệt kịch bản",
      icon: "draftReview",
      done: transcriptReviewPassed || completed,
      current: transcriptReviewCurrent,
      failed: transcriptRejected
    });
    steps.push({
      key: "video-submit",
      label: "Nộp video",
      icon: "videoSubmit",
      done: hasVideoSubmitted || completed,
      current: videoSubmitCurrent,
      failed: false
    });

    steps.push({
      key: "video-review",
      label: "Duyệt video",
      icon: "videoReview",
      done: videoApproved || completed,
      current: item.videoReviewStatus === "PENDING",
      failed: item.videoReviewStatus === "REJECTED"
    });
    steps.push({
      key: "publish",
      label: "Nộp link public",
      icon: "publish",
      done: hasPublishSubmitted || completed,
      current: !hasPublishSubmitted && videoApproved,
      failed: false
    });
    steps.push({
      key: "publish-review",
      label: "Duyệt link public",
      icon: "publishReview",
      done: publishDone || completed,
      current: item.publishStatus === "PENDING",
      failed: item.publishStatus === "REJECTED"
    });
    if (item.productReceiveOption === "PRODUCT_REQUIRED") {
      steps.push({
        key: "refund",
        label: "Chờ hoàn tiền",
        icon: "refund",
        done: completed,
        current: refundPending,
        failed: false
      });
    }
    steps.push({
      key: "completed",
      label: "Hoàn thành",
      icon: "completed",
      done: completed,
      current: !completed && publishDone && !refundPending,
      failed: false
    });

    return steps;
  }

  function renderMissionDetail(item: MissionItem) {
    const isApplicationPending = item.missionApplication?.status === "PENDING_REVIEW";
    const isOverdue = isMissionOverdue(item);
    const isCreatorOrder = campaignFulfillmentMode(item) === "CREATOR_ORDER";
    const needsCreatorDeposit = requiresCreatorDeposit(item);
    const depositHeld = hasHeldCreatorDeposit(item);
    const depositAmount = item.campaign.creatorDepositAmountVnd ?? 0;
    const depositConfigMissing = needsCreatorDeposit && depositAmount <= 0;
    const depositPending = needsCreatorDeposit && item.depositStatus === "PENDING";
    const depositBlocked = needsCreatorDeposit && !depositHeld;
    const canSubmitPurchase = !isApplicationPending && isCreatorOrder && item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED";
    const canSubmitVideoCandidate =
      !isApplicationPending &&
      item.status !== "COMPLETED" &&
      item.videoReviewStatus !== "PENDING" &&
      item.videoReviewStatus !== "APPROVED" &&
      item.publishStatus !== "PENDING" &&
      !depositBlocked &&
      (item.productReceiveOption === "NO_PRODUCT_REQUIRED" || item.productStatus === "RECEIVED");
    const isTranscriptFlow = item.status === "DRAFT_PENDING";
    const hasTranscript = Boolean(item.submission?.transcriptTextNote?.trim() || item.submission?.transcriptResourceUrl?.trim());
    const hasVideoSubmission = item.videoReviewStatus !== "NOT_SUBMITTED" || Boolean(item.submission?.videoUrl?.trim());
    const selectedChoice =
      preVideoChoiceMap[item.id] ??
      (hasTranscript ? "TRANSCRIPT" : hasVideoSubmission ? "VIDEO" : undefined);
    const needsPreVideoChoice = canSubmitVideoCandidate && !isTranscriptFlow && !hasTranscript && !hasVideoSubmission;
    const showTranscriptComposer = !isOverdue && (isTranscriptFlow || (needsPreVideoChoice && selectedChoice === "TRANSCRIPT"));
    const showVideoComposer = !isOverdue && canSubmitVideoCandidate && !isTranscriptFlow && (!needsPreVideoChoice || selectedChoice === "VIDEO");
    const isRefundPending = item.productReceiveOption === "PRODUCT_REQUIRED" && item.reimbursementStatus === "PAYOUT_PENDING";
    const canSubmitPublish = !isOverdue && !isApplicationPending && item.videoReviewStatus === "APPROVED" && item.status !== "COMPLETED" && item.publishStatus !== "PENDING" && !isRefundPending && !depositBlocked;
    const isWaitingPublishReview = !isApplicationPending && item.videoReviewStatus === "APPROVED" && item.publishStatus === "PENDING" && item.status !== "COMPLETED";
    const requestedPublishFields = getRequestedPublishResubmitFields(item);
    const shouldShowPublishField = (field: string) => {
      if (!requestedPublishFields) return true;
      if (!isCreatorOrder && (field === "PUBLIC_URL" || field === "AD_CODE")) return true;
      return requestedPublishFields.has(field);
    };
    const showProductSection = item.productReceiveOption === "PRODUCT_REQUIRED";
    const timelineSteps = buildMissionTimeline(item);
    const formError = missionErrors[item.id];
    const transcriptMode = transcriptModeMap[item.id] ?? transcriptModeFromSubmission(item.submission);
    const transcriptFileUrl = transcriptUrlMap[item.id] ?? item.submission?.transcriptResourceUrl ?? "";
    const hasAnyHistory =
      Boolean(item.purchaseProofSubmittedAt || item.videoSubmittedAt || item.publishSubmittedAt) ||
      Boolean(item.submission?.purchaseBillImageUrl || item.submission?.transcriptTextNote || item.submission?.transcriptResourceUrl || item.submission?.videoUrl || item.submission?.publicVideoUrl || item.submission?.socialPostUrl);
    const rejectionNotices = (
      <>
        {item.missionApplication?.rejectReason ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Lý do từ chối đăng ký: {item.missionApplication.rejectReason}</p>
        ) : null}
        {item.status === "DRAFT_PENDING" && item.videoReviewFeedback ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Phản hồi kịch bản: {item.videoReviewFeedback}</p>
        ) : null}
        {item.videoReviewStatus !== "NOT_SUBMITTED" && item.videoReviewFeedback ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Phản hồi video: {item.videoReviewFeedback}</p>
        ) : null}
        {item.publishFeedback ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>Phản hồi duyệt link public: {item.publishFeedback}</p>
            {item.publishResubmitFields?.length ? (
              <p className="mt-1">
                Cần gửi lại: {item.publishResubmitFields.map((field) => publishResubmitFieldLabelMap[field] ?? field).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </>
    );
    function renderProductInfoSection() {
      if (!showProductSection) return null;
      return (
        <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
          <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin sản phẩm</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              {item.mission.productImageUrl ? (
                <img src={item.mission.productImageUrl} alt={item.mission.productName ?? "Ảnh sản phẩm"} className="h-full max-h-48 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center px-3 text-sm text-zinc-500">Chưa có hình ảnh sản phẩm</div>
              )}
            </div>
            <div className="grid gap-1 text-sm text-zinc-700">
              <p>Tên sản phẩm: <strong className="text-zinc-900">{item.mission.productName || "-"}</strong></p>
              <p>Mô tả sản phẩm: <span className="whitespace-pre-line">{item.mission.productDescription || "-"}</span></p>
              <p>Link sản phẩm: <UrlValue value={item.mission.productLink} /></p>
            </div>
          </div>
        </details>
      );
    }
    const actionGuide = (
      <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
        <summary className="cursor-pointer font-semibold text-zinc-900">Cách thực hiện</summary>
        <div className="mt-3 space-y-3">
          {isRefundPending ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Link public đã được duyệt. Bạn không cần thao tác thêm, vui lòng chờ Admin kiểm tra bill mua hàng và ảnh đánh giá 5 sao để hoàn N-Points.
            </p>
          ) : null}
          {isApplicationPending && !isOverdue && !isRefundPending ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Campaign đang chờ duyệt. Bạn sẽ bắt đầu các bước thực hiện sau khi Brand/Admin duyệt đơn.
            </p>
          ) : null}
          {isWaitingPublishReview && !isOverdue && !isRefundPending ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Bạn đã nộp link public. Vui lòng chờ Admin/Brand duyệt bước này.
            </p>
          ) : null}
          {isOverdue && !isRefundPending ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Campaign đã quá hạn. Bạn chỉ có thể xem lại thông tin và lịch sử đã nộp.
            </p>
          ) : null}

          {!isRefundPending ? rejectionNotices : null}

          {depositBlocked && !isApplicationPending && !isOverdue && !isRefundPending ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Campaign này yêu cầu đặt cọc trước khi thực hiện vì Brand sẽ gửi hàng mẫu trực tiếp cho Creator.</p>
              <p className="mt-1">Số tiền cọc: <strong>{fmtVnd(depositAmount)}</strong></p>
              {depositConfigMissing ? (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  Campaign cũ hoặc cấu hình hiện thiếu tiền cọc. Vui lòng chờ Admin cập nhật trước khi thực hiện.
                </p>
              ) : depositPending ? (
                <p className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700">
                  Hệ thống đã ghi nhận yêu cầu đặt cọc. Form proof sẽ mở sau khi Admin xác nhận cọc.
                </p>
              ) : (
                <button className="dc-btn-primary mt-3 w-full sm:w-auto" disabled={busyId === item.id} onClick={() => void submitCreatorDeposit(item)}>
                  Đặt cọc ngay
                </button>
              )}
              {formError?.form ? <p className="mt-2 text-sm text-red-600">{formError.form}</p> : null}
            </div>
          ) : null}

          {canSubmitPurchase && !isOverdue && !isRefundPending ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="font-medium">Bước 1 - Mua sản phẩm</p>
              <p className="text-sm text-zinc-600">Đặt hàng đúng sản phẩm của campaign rồi bấm xác nhận đã mua để mở các bước tiếp theo. Ảnh bill và ảnh đánh giá 5 sao sẽ nộp ở bước link public.</p>
              <div className="mt-2 grid gap-2">
                {formError?.form ? <p className="text-sm text-red-600">{formError.form}</p> : null}
                <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitPurchaseProof(item)}>Xác nhận đã mua hàng</button>
              </div>
            </div>
          ) : null}

          {needsPreVideoChoice && !isOverdue && !isRefundPending ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="font-medium">Chọn quy trình trước video review</p>
              <p className="text-sm text-zinc-600">Bạn có thể nộp kịch bản trước để được duyệt, hoặc nộp video review trực tiếp.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={selectedChoice === "TRANSCRIPT" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setPreVideoChoiceMap((s) => ({ ...s, [item.id]: "TRANSCRIPT" }))}>Nộp kịch bản trước</button>
                <button className={selectedChoice === "VIDEO" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setPreVideoChoiceMap((s) => ({ ...s, [item.id]: "VIDEO" }))}>Nộp video luôn</button>
              </div>
            </div>
          ) : null}

          {showTranscriptComposer && !isRefundPending ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <p className="font-medium">Nộp kịch bản</p>
              {isTranscriptFlow && item.submission?.status === "SUBMITTED" ? <p className="mt-1 text-sm text-zinc-600">Kịch bản đã gửi, đang chờ duyệt.</p> : null}
              <div className="mt-2 grid gap-2">
                <p className="text-sm font-medium text-zinc-700">Hình thức gửi kịch bản</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "TEXT" as const, label: "Viết trực tiếp" },
                    { key: "FILE" as const, label: "Tải file lên" },
                    { key: "URL" as const, label: "Gửi link URL" }
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      disabled={isTranscriptFlow && item.submission?.status === "SUBMITTED"}
                      className={transcriptMode === option.key ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-600"}
                      onClick={() => {
                        setTranscriptModeMap((prev) => ({ ...prev, [item.id]: option.key }));
                        clearMissionFormErrors(item.id);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {transcriptMode === "TEXT" ? (
                  <>
                    <label htmlFor={`transcript-${item.id}`} className="text-sm font-medium text-zinc-700">
                      Nội dung kịch bản
                    </label>
                    <textarea
                      id={`transcript-${item.id}`}
                      className="dc-input min-h-32"
                      placeholder="Nhập nội dung kịch bản"
                      disabled={isTranscriptFlow && item.submission?.status === "SUBMITTED"}
                      value={transcriptMap[item.id] ?? toPlainTranscript(item.submission?.transcriptTextNote)}
                      onChange={(event) => {
                        setTranscriptMap((s) => ({ ...s, [item.id]: event.target.value }));
                        clearMissionErrorField(item.id, "transcript");
                      }}
                    />
                    {formError?.transcript ? <p className="text-sm text-red-600">{formError.transcript}</p> : null}
                  </>
                ) : null}

                {transcriptMode === "FILE" ? (
                  <>
                    <label htmlFor={`transcript-file-${item.id}`} className="text-sm font-medium text-zinc-700">
                      File kịch bản
                    </label>
                    <input
                      id={`transcript-file-${item.id}`}
                      type="file"
                      className="dc-input"
                      accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadTranscriptFile(item.id, file);
                      }}
                      disabled={isTranscriptFlow && item.submission?.status === "SUBMITTED" || uploadingKey === `${item.id}:transcript-file`}
                    />
                    {uploadingKey === `${item.id}:transcript-file` ? <p className="text-xs text-zinc-500">Đang tải file kịch bản...</p> : null}
                    {transcriptFileUrl ? (
                      <p className="text-sm text-zinc-700">
                        File hiện tại:{" "}
                        <a href={transcriptDownloadHref(transcriptFileUrl) ?? "#"} className="font-semibold text-zinc-900 underline break-all" target={isTranscriptUploadPath(transcriptFileUrl) ? undefined : "_blank"} rel="noreferrer">
                          {transcriptLinkLabel(transcriptFileUrl)}
                        </a>
                      </p>
                    ) : null}
                    {formError?.transcriptFile ? <p className="text-sm text-red-600">{formError.transcriptFile}</p> : null}
                  </>
                ) : null}

                {transcriptMode === "URL" ? (
                  <>
                    <label htmlFor={`transcript-url-${item.id}`} className="text-sm font-medium text-zinc-700">
                      Link kịch bản
                    </label>
                    <input
                      id={`transcript-url-${item.id}`}
                      className="dc-input"
                      placeholder="https://..."
                      disabled={isTranscriptFlow && item.submission?.status === "SUBMITTED"}
                      value={transcriptUrlMap[item.id] ?? (!isTranscriptUploadPath(item.submission?.transcriptResourceUrl) ? item.submission?.transcriptResourceUrl ?? "" : "")}
                      onChange={(event) => {
                        setTranscriptUrlMap((prev) => ({ ...prev, [item.id]: event.target.value }));
                        clearMissionErrorField(item.id, "transcriptUrl");
                      }}
                    />
                    {formError?.transcriptUrl ? <p className="text-sm text-red-600">{formError.transcriptUrl}</p> : null}
                  </>
                ) : null}

                {formError?.form ? <p className="text-sm text-red-600">{formError.form}</p> : null}
                {!(isTranscriptFlow && item.submission?.status === "SUBMITTED") ? (
                  <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitTranscript(item)}>
                    {item.submission?.status === "REJECTED" ? "Gửi lại kịch bản" : "Gửi kịch bản"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {showVideoComposer && !isRefundPending ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <p className="font-medium">Nộp video review</p>
              <div className="mt-2 grid gap-2">
                <label htmlFor={`video-url-${item.id}`} className="text-sm font-medium text-zinc-700">
                  Link video review
                </label>
                <input
                  id={`video-url-${item.id}`}
                  className="dc-input"
                  placeholder="Video URL"
                  value={videoUrlMap[item.id] ?? item.submission?.videoUrl ?? ""}
                  onChange={(e) => {
                    setVideoUrlMap((s) => ({ ...s, [item.id]: e.target.value }));
                    clearMissionErrorField(item.id, "videoUrl");
                  }}
                />
                {formError?.videoUrl ? <p className="text-sm text-red-600">{formError.videoUrl}</p> : null}
                <label htmlFor={`video-note-${item.id}`} className="text-sm font-medium text-zinc-700">
                  Ghi chú cho video review
                </label>
                <textarea
                  id={`video-note-${item.id}`}
                  className="dc-input"
                  placeholder="Ghi chú video"
                  value={videoNoteMap[item.id] ?? ""}
                  onChange={(e) => {
                    setVideoNoteMap((s) => ({ ...s, [item.id]: e.target.value }));
                    clearMissionErrorField(item.id, "videoNote");
                  }}
                />
                {formError?.videoNote ? <p className="text-sm text-red-600">{formError.videoNote}</p> : null}
                {formError?.form ? <p className="text-sm text-red-600">{formError.form}</p> : null}
                <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitVideo(item)}>
                  {item.videoReviewStatus === "REJECTED" ? "Gửi lại video review" : "Gửi video review"}
                </button>
              </div>
            </div>
          ) : null}

          {canSubmitPublish ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <p className="font-medium">Nộp link video social public</p>
              <div className="mt-2 grid gap-2">
                {shouldShowPublishField("PUBLIC_URL") ? (
                  <>
                    <label htmlFor={`public-url-${item.id}`} className="text-sm font-medium text-zinc-700">
                      Link video social public
                    </label>
                    <input
                      id={`public-url-${item.id}`}
                      className="dc-input"
                      placeholder="Link video social public"
                      value={publicUrlMap[item.id] ?? item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl ?? ""}
                      onChange={(e) => {
                        setPublicUrlMap((s) => ({ ...s, [item.id]: e.target.value }));
                        clearMissionErrorField(item.id, "publicUrl");
                      }}
                    />
                    {formError?.publicUrl ? <p className="text-sm text-red-600">{formError.publicUrl}</p> : null}
                  </>
                ) : null}
                {shouldShowPublishField("AD_CODE") ? (
                  <>
                    <label htmlFor={`ad-code-${item.id}`} className="text-sm font-medium text-zinc-700">
                      Mã quảng cáo (adCode)
                    </label>
                    <input
                      id={`ad-code-${item.id}`}
                      className="dc-input"
                      placeholder="Mã quảng cáo (adCode)"
                      value={adCodeMap[item.id] ?? item.submission?.adCode ?? ""}
                      onChange={(e) => {
                        setAdCodeMap((s) => ({ ...s, [item.id]: e.target.value }));
                        clearMissionErrorField(item.id, "adCode");
                      }}
                    />
                    {formError?.adCode ? <p className="text-sm text-red-600">{formError.adCode}</p> : null}
                  </>
                ) : null}
                {isCreatorOrder && item.productReceiveOption === "PRODUCT_REQUIRED" ? (
                  <>
                    {shouldShowPublishField("PURCHASE_BILL") ? (
                      <div className="grid gap-1.5">
                        <label htmlFor={`bill-upload-${item.id}`} className="text-sm font-medium text-zinc-700">Ảnh bill mua hàng</label>
                        <input
                          id={`bill-upload-${item.id}`}
                          className="dc-input bg-white"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadMissionImage(item.id, "bill", file);
                          }}
                          disabled={uploadingKey === `${item.id}:bill`}
                        />
                        {billUrlMap[item.id] || item.submission?.purchaseBillImageUrl ? <p className="text-xs text-emerald-700">Đã có ảnh bill mua hàng.</p> : null}
                        {uploadingKey === `${item.id}:bill` ? <p className="text-xs text-zinc-500">Đang tải ảnh bill...</p> : null}
                        {formError?.bill ? <p className="text-sm text-red-600">{formError.bill}</p> : null}
                      </div>
                    ) : null}
                    {shouldShowPublishField("PRODUCT_REVIEW_SCREENSHOT") ? (
                      <div className="grid gap-1.5">
                        <label htmlFor={`rating-upload-${item.id}`} className="text-sm font-medium text-zinc-700">Ảnh đánh giá 5 sao</label>
                        <input
                          id={`rating-upload-${item.id}`}
                          className="dc-input bg-white"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadMissionImage(item.id, "rating", file);
                          }}
                          disabled={uploadingKey === `${item.id}:rating`}
                        />
                        {ratingUrlMap[item.id] || item.submission?.productReviewScreenshotUrl ? <p className="text-xs text-emerald-700">Đã có ảnh đánh giá 5 sao.</p> : null}
                        {uploadingKey === `${item.id}:rating` ? <p className="text-xs text-zinc-500">Đang tải ảnh đánh giá...</p> : null}
                        {formError?.rating ? <p className="text-sm text-red-600">{formError.rating}</p> : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {isCreatorOrder && shouldShowPublishField("SCREENSHOT") ? (
                  <>
                    <label htmlFor={`screenshot-upload-${item.id}`} className="text-sm font-medium text-zinc-700">
                      Ảnh chụp màn hình minh chứng
                    </label>
                    <input
                      id={`screenshot-upload-${item.id}`}
                      className="dc-input bg-white"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadMissionImage(item.id, "screenshot", file);
                      }}
                      disabled={uploadingKey === `${item.id}:screenshot`}
                    />
                    {uploadingKey === `${item.id}:screenshot` ? <p className="text-xs text-zinc-500">Đang tải ảnh screenshot...</p> : null}
                    {formError?.screenshot ? <p className="text-sm text-red-600">{formError.screenshot}</p> : null}
                  </>
                ) : null}
                {isCreatorOrder && !requestedPublishFields ? (
                  <>
                    <label htmlFor={`final-note-${item.id}`} className="text-sm font-medium text-zinc-700">
                      Ghi chú bổ sung
                    </label>
                    <textarea id={`final-note-${item.id}`} className="dc-input" placeholder="Ghi chú" value={finalNoteMap[item.id] ?? item.submission?.finalProofNote ?? ""} onChange={(e) => setFinalNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  </>
                ) : null}
                {formError?.form ? <p className="text-sm text-red-600">{formError.form}</p> : null}
                <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitPublish(item)}>
                  {item.publishStatus === "REJECTED" ? "Gửi lại link social public" : "Gửi link social public"}
                </button>
              </div>
            </div>
          ) : null}

          {item.status === "COMPLETED" ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Campaign đã hoàn thành. Hệ thống đã hoàn N-Points mua sản phẩm theo kết quả duyệt.
            </p>
          ) : null}
        </div>
      </details>
    );

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={detailTab === "ACTIONS" ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-600"}
              onClick={() => setDetailTab("ACTIONS")}
            >
              Thực hiện campaign
            </button>
            <button
              type="button"
              className={detailTab === "HISTORY" ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-600"}
              onClick={() => setDetailTab("HISTORY")}
            >
              Lịch sử đã nộp
            </button>
          </div>
        </div>

        {detailTab === "HISTORY" ? (
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-sm font-semibold text-zinc-900">Lịch sử các lần đã nộp</p>
            {!hasAnyHistory ? <p className="text-sm text-zinc-500">Chưa có dữ liệu đã nộp ở các bước.</p> : null}

            {item.submission?.purchaseBillImageUrl || item.submission?.productReviewScreenshotUrl ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước mua sản phẩm</summary>
                <div className="mt-2 space-y-1">
                  <p>Thời gian nộp: {fmtDate(item.purchaseProofSubmittedAt ?? null)}</p>
                  <p>Ảnh bill: <UrlValue value={item.submission?.purchaseBillImageUrl} label="Tải file ảnh" /></p>
                  <p>Ảnh đánh giá: <UrlValue value={item.submission?.productReviewScreenshotUrl} label="Tải file ảnh" /></p>
                </div>
              </details>
            ) : null}

            {item.submission?.transcriptTextNote || item.submission?.transcriptResourceUrl ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước kịch bản</summary>
                <div className="mt-2 space-y-1">
                  <p>Hình thức gửi: {transcriptModeLabel(item.submission?.transcriptType, item.submission?.transcriptResourceUrl)}</p>
                  {toPlainTranscript(item.submission?.transcriptTextNote) ? (
                    <>
                      <p>Nội dung kịch bản:</p>
                      <p className="whitespace-pre-line">{toPlainTranscript(item.submission?.transcriptTextNote)}</p>
                    </>
                  ) : null}
                  {item.submission?.transcriptResourceUrl ? (
                    <p>
                      {isTranscriptUploadPath(item.submission.transcriptResourceUrl) ? "File kịch bản: " : "Link kịch bản: "}
                      {transcriptDownloadHref(item.submission.transcriptResourceUrl) ? (
                        <a
                          href={transcriptDownloadHref(item.submission.transcriptResourceUrl) ?? "#"}
                          download={isTranscriptUploadPath(item.submission.transcriptResourceUrl)}
                          className="font-semibold text-zinc-900 underline break-all"
                          target={isTranscriptUploadPath(item.submission.transcriptResourceUrl) ? undefined : "_blank"}
                          rel="noreferrer"
                        >
                          {transcriptLinkLabel(item.submission.transcriptResourceUrl)}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}

            {item.submission?.videoUrl ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp video</summary>
                <div className="mt-2 space-y-1">
                  <p>Thời gian nộp: {fmtDate(item.videoSubmittedAt ?? null)}</p>
                  <p>Video URL: <UrlValue value={item.submission.videoUrl} label="Mở liên kết video" /></p>
                </div>
              </details>
            ) : null}

            {item.submission?.publicVideoUrl || item.submission?.socialPostUrl || item.submission?.screenshotUrl || item.submission?.adCode || item.submission?.finalProofNote ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp link social</summary>
                <div className="mt-2 space-y-1">
                  <p>Thời gian nộp: {fmtDate(item.publishSubmittedAt)}</p>
                  <p>Link public: <UrlValue value={item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl} label="Mở liên kết public" /></p>
                  <p>Ảnh chụp màn hình minh chứng: <UrlValue value={item.submission?.screenshotUrl} label="Tải file ảnh" /></p>
                  <p>Mã quảng cáo: {item.submission?.adCode || "-"}</p>
                  {hasText(item.submission?.finalProofNote) ? <p>Ghi chú: {item.submission?.finalProofNote}</p> : null}
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-900">Tiến độ campaign</p>
          <div className="mt-3 overflow-x-auto pb-2">
            <div className="flex min-w-max items-start">
              {timelineSteps.map((step, index) => {
                const isCurrent = step.current;
                const isDone = step.done;
                const isFailed = step.failed;
                const prevStep = index > 0 ? timelineSteps[index - 1] : null;
                const circleTone = isFailed
                  ? "border-red-300 bg-red-50 text-red-700"
                  : isCurrent
                    ? "border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100"
                    : isDone
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-zinc-300 bg-white text-zinc-500";
                const labelTone = isFailed ? "text-red-700" : isCurrent || isDone ? "text-zinc-900" : "text-zinc-500";
                const leftLineTone = prevStep?.done ? "bg-emerald-300" : "bg-zinc-200";
                const rightLineTone = isDone && timelineSteps[index + 1] ? "bg-emerald-300" : "bg-zinc-200";

                return (
                  <div key={step.key} className="flex w-24 flex-col items-center text-center">
                    <div className="flex w-full items-center">
                      {index > 0 ? <span className={`h-[2px] flex-1 ${leftLineTone}`} /> : <span className="flex-1" />}
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-semibold transition-all ${circleTone}`}>
                        <TimelineStepIcon step={step.icon} />
                      </div>
                      {index < timelineSteps.length - 1 ? <span className={`h-[2px] flex-1 ${rightLineTone}`} /> : <span className="flex-1" />}
                    </div>
                    <p className={`mt-2 px-1 text-xs font-medium leading-4 ${labelTone}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {actionGuide}

        {canSubmitPurchase ? renderProductInfoSection() : null}

        <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
          <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
            <p>Tên campaign: <strong className="text-zinc-900">{item.campaign.title}</strong></p>
            <p>Đường dẫn campaign: <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${item.campaign.slug}`}>/campaigns/{item.campaign.slug}</Link></p>
            <p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(item.mission.deadlineAt)}</strong></p>
          </div>
          {item.mission.description?.trim() ? <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{item.mission.description}</p> : null}
        </details>

        {!canSubmitPurchase ? renderProductInfoSection() : null}

          </>
        )}
      </div>
    );
  }

  return (
    <>
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {toast ? <ActionToast message={toast} /> : null}
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading ? (
        <>
          {!detailOnly ? (
            <section className="dc-grid-dashboard">
              <article className="dc-card p-4"><p className="text-sm text-zinc-600">Yêu cầu đang chờ duyệt</p><p className="text-2xl font-bold">{counters.pending}</p></article>
              <article className="dc-card p-4"><p className="text-sm text-zinc-600">Campaign đang thực hiện</p><p className="text-2xl font-bold">{counters.doing}</p></article>
              <article className="dc-card p-4"><p className="text-sm text-zinc-600">Campaign bị từ chối</p><p className="text-2xl font-bold">{counters.revision}</p></article>
              <article className="dc-card p-4"><p className="text-sm text-zinc-600">Campaign đã hoàn thành</p><p className="text-2xl font-bold">{counters.completed}</p></article>
              <article className="dc-card p-4"><p className="text-sm text-zinc-600">Số N-Points</p><p className="text-2xl font-bold">{(overview?.nPointsBalance ?? 0).toLocaleString("vi-VN")} N-Points</p></article>
            </section>
          ) : null}

          {!detailOnly ? (
            <section id="nhiem-vu-cua-toi" className="space-y-3">
              <SectionHeader title="Campaign của tôi" subtitle={`${items.length} campaign`} />

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "ALL" as const, label: "Tất cả" },
                  { key: "PENDING" as const, label: "Chờ duyệt" },
                  { key: "DOING" as const, label: "Đang làm" },
                  { key: "REVISION" as const, label: "Bị từ chối" },
                  { key: "COMPLETED" as const, label: "Hoàn thành" },
                  { key: "OVERDUE" as const, label: "Quá hạn" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveFilter(item.key)}
                    className={activeFilter === item.key ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-600"}
                  >
                    {item.label}
                  </button>
                ))}
                <select
                  id="creator-mission-sort"
                  className="ml-auto h-8 w-28 shrink-0 rounded-full border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700"
                  value={missionSort}
                  onChange={(event) => setMissionSort(event.target.value as MissionSort)}
                  aria-label="Sắp xếp nhiệm vụ"
                >
                  <option value="APPROVED_NEWEST">Mới nhất</option>
                  <option value="APPROVED_OLDEST">Cũ nhất</option>
                  <option value="EXPIRING_SOON">Sắp hết hạn</option>
                </select>
              </div>

              {filteredItems.length === 0 ? (
                <EmptyState title="Không có campaign phù hợp bộ lọc" description="Thử chuyển sang trạng thái khác hoặc tham gia campaign mới." />
              ) : (
                <div className="space-y-2">
                  {pagedItems.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="grid gap-3 xl:grid-cols-[2.4fr_1fr_1fr_1.2fr_1.4fr] xl:items-start">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900">{item.mission.title}</p>
                          <p className="line-clamp-2 text-sm text-zinc-500">{item.campaign.title}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900">Hoàn theo bill</p>
                          <p className="text-xs text-zinc-500">N-Points</p>
                        </div>
                        <div>
                          <p className={`font-semibold ${daysLeft(item.mission.deadlineAt) !== null && (daysLeft(item.mission.deadlineAt) ?? 0) <= 3 ? "text-red-600" : "text-zinc-900"}`}>{deadlineLabel(item.mission.deadlineAt)}</p>
                          <p className="text-xs text-zinc-500">Deadline</p>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item)}`}>{workflowStatus(item)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          {missionGroup(item) === "OVERDUE" ? (
                            <button className="dc-btn-secondary" onClick={() => openMissionDetail(item.id)}>Xem chi tiết</button>
                          ) : item.missionApplication?.status === "REJECTED" ? (
                            <button className="dc-btn-secondary" onClick={() => setRejectedMissionId(item.id)}>Thao tác</button>
                          ) : item.status === "COMPLETED" ? (
                            <button className="dc-btn-secondary" onClick={() => openMissionDetail(item.id)}>Xem chi tiết</button>
                          ) : (
                            <button className="dc-btn-primary" onClick={() => openMissionDetail(item.id)}>Tiếp tục</button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {filteredItems.length > PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-sm text-zinc-600">Trang {currentPage}/{totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" className="dc-btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                      Trang trước
                    </button>
                    <button type="button" className="dc-btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                      Trang sau
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {activeMission ? (
            <div className="fixed inset-0 z-50 bg-zinc-900/50 p-3 md:p-6" onClick={closeMissionDetail}>
              <div
                className="mx-auto max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900">{activeMission.mission.title}</h3>
                    <p className="text-sm text-zinc-600">Chiến dịch: {activeMission.campaign.title}</p>
                  </div>
                  <button type="button" className="dc-btn-secondary" onClick={closeMissionDetail}>Đóng</button>
                </div>
                {renderMissionDetail(activeMission)}
              </div>
            </div>
          ) : null}

          {rejectedMission ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={() => setRejectedMissionId("")}>
              <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-zinc-900">Campaign bị từ chối</p>
                    <p className="mt-1 text-sm text-zinc-600">{rejectedMission.campaign.title}</p>
                  </div>
                  <button type="button" className="dc-btn-secondary" onClick={() => setRejectedMissionId("")}>Đóng</button>
                </div>
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">Lý do bị từ chối</p>
                  <p className="mt-1 whitespace-pre-line">{rejectedMission.missionApplication?.rejectReason || "Brand/Admin chưa nhập lý do cụ thể."}</p>
                </div>
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Hãy thực hiện đầy đủ các yêu cầu để apply lại campaign. Sau khi gửi lại, đơn sẽ quay về trạng thái chờ duyệt.
                </p>
                {missionErrors[rejectedMission.id]?.form ? <p className="mt-3 text-sm text-red-600">{missionErrors[rejectedMission.id]?.form}</p> : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" className="dc-btn-secondary" onClick={() => setRejectedMissionId("")}>Để sau</button>
                  <button type="button" className="dc-btn-primary" disabled={busyId === rejectedMission.id} onClick={() => void reapplyMission(rejectedMission)}>
                    {busyId === rejectedMission.id ? "Đang gửi lại..." : "Đăng ký campaign lại"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
