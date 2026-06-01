"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, IdentificationCard, Megaphone, Package, Scroll, VideoCamera } from "@phosphor-icons/react";
import { EmptyState, ErrorState, LoadingSkeleton, SectionHeader } from "@/app/components/dcreator/ui/base";
import type { CreatorOverview } from "@/app/dashboard/creator/_components/CreatorDashboardClient";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type MissionItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  videoReviewStatus: string;
  videoReviewFeedback: string | null;
  publishStatus: string;
  publishFeedback: string | null;
  publishSubmittedAt: string | null;
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
  campaign: { title: string; slug: string };
  submission: {
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
  } | null;
};

type FormMap = Record<string, string>;
type PreVideoChoice = "VIDEO" | "TRANSCRIPT";
type PreVideoChoiceMap = Record<string, PreVideoChoice>;
type MissionFilter = "ALL" | "DOING" | "PENDING" | "REVISION" | "COMPLETED";

type CreatorMissionsPanelProps = {
  overview: CreatorOverview | null;
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

function asLink(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function UrlValue({ value, label }: { value: string | null | undefined; label?: string }) {
  const href = asLink(value);
  if (!href) return <span>-</span>;
  return (
    <a href={href} className="font-semibold text-zinc-900 underline break-all">
      {label ?? value}
    </a>
  );
}

function workflowStatus(item: MissionItem) {
  if (item.missionApplication?.status === "PENDING_REVIEW") return "Chờ duyệt nhiệm vụ";
  if (item.status === "COMPLETED") return "Hoàn thành";
  if (item.publishStatus === "PENDING") return "Bài đăng đang chờ duyệt cuối";
  if (item.publishStatus === "REJECTED") return "Bị từ chối bước cuối";
  if (item.videoReviewStatus === "PENDING") return "Video đang chờ duyệt";
  if (item.videoReviewStatus === "REJECTED") return "Video bị từ chối";
  if (item.videoReviewStatus === "APPROVED") return "Chờ nộp link social public";
  if (item.status === "DRAFT_PENDING") {
    if (item.submission?.status === "SUBMITTED") return "Kịch bản đang chờ duyệt";
    if (item.submission?.status === "REJECTED") return "Kịch bản bị từ chối";
    return "Chờ nộp kịch bản";
  }
  if (item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED") return "Chờ mua sản phẩm";
  return "Chờ chọn kịch bản hoặc nộp video";
}

function missionGroup(item: MissionItem): Exclude<MissionFilter, "ALL"> {
  if (item.status === "COMPLETED") return "COMPLETED";
  if (item.missionApplication?.status === "REJECTED") return "REVISION";
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
  return item.missionApplication?.status === "APPROVED" && item.status !== "COMPLETED";
}

function statusTone(item: MissionItem) {
  const group = missionGroup(item);
  if (group === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (group === "REVISION") return "bg-red-50 text-red-700";
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

function missionPriority(item: MissionItem) {
  const group = missionGroup(item);
  const due = daysLeft(item.mission.deadlineAt);
  const urgency = due === null ? 0 : due < 0 ? 6 : due <= 1 ? 5 : due <= 3 ? 4 : due <= 7 ? 3 : 1;
  if (group === "REVISION") return 40 + urgency;
  if (group === "PENDING") return 20 + urgency;
  if (group === "DOING") return 10 + urgency;
  return 0;
}

function nextActionLabel(item: MissionItem) {
  const group = missionGroup(item);
  if (group === "REVISION") return "Cần chỉnh sửa";
  if (group === "PENDING") return "Đang chờ duyệt";
  if (item.videoReviewStatus === "APPROVED") return "Nộp link social public";
  if (item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED") return "Xác nhận mua hàng";
  if (item.status === "DRAFT_PENDING") return "Nộp kịch bản";
  return "Nộp video review";
}

function missionStatusLabel(status: string) {
  if (status === "PRODUCT_PENDING") return "Đang chờ mua sản phẩm";
  if (status === "DRAFT_PENDING") return "Đang chờ duyệt kịch bản";
  if (status === "IN_PROGRESS") return "Đang thực hiện";
  if (status === "COMPLETED") return "Đã hoàn thành";
  if (status === "CANCELLED") return "Đã hủy";
  return "Không xác định";
}

function productReceiveOptionLabel(value: string) {
  if (value === "PRODUCT_REQUIRED") return "Có yêu cầu sản phẩm";
  if (value === "NO_PRODUCT_REQUIRED") return "Không yêu cầu sản phẩm";
  return "Không xác định";
}

function productStatusLabel(value: string) {
  if (value === "NOT_REQUIRED") return "Không yêu cầu";
  if (value === "WAITING_DEPOSIT") return "Đang chờ đặt cọc";
  if (value === "WAITING_PURCHASE") return "Đang chờ mua hàng";
  if (value === "RECEIVED") return "Đã nhận sản phẩm";
  return "Không xác định";
}

function missionAudienceLabel(value: string) {
  if (value === "CREATOR") return "Creator";
  if (value === "USER") return "Người dùng";
  return "Không xác định";
}

type TimelineStep = {
  key: string;
  label: string;
  icon: "application" | "purchase" | "draftChoice" | "draftSubmit" | "draftReview" | "videoSubmit" | "videoReview" | "publish" | "completed";
  done: boolean;
  current: boolean;
  failed: boolean;
};

function TimelineStepIcon({ step }: { step: TimelineStep["icon"] }) {
  if (step === "application") return <IdentificationCard size={22} weight="duotone" />;
  if (step === "purchase") return <Package size={22} weight="duotone" />;
  if (step === "draftChoice") return <Scroll size={22} weight="duotone" />;
  if (step === "draftSubmit") return <Scroll size={22} weight="duotone" />;
  if (step === "draftReview") return <CheckCircle size={22} weight="duotone" />;
  if (step === "videoSubmit") return <VideoCamera size={22} weight="duotone" />;
  if (step === "videoReview") return <CheckCircle size={22} weight="duotone" />;
  if (step === "publish") return <Megaphone size={22} weight="duotone" />;
  return <CheckCircle size={22} weight="fill" />;
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = (await res.json()) as ApiResult<T>;
  if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể thực hiện thao tác");
  return body.data;
}

export function CreatorMissionsPanel({ overview }: CreatorMissionsPanelProps) {
  const PAGE_SIZE = 8;
  const [items, setItems] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [detailMissionId, setDetailMissionId] = useState("");
  const [activeFilter, setActiveFilter] = useState<MissionFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [billUrlMap, setBillUrlMap] = useState<FormMap>({});
  const [ratingUrlMap, setRatingUrlMap] = useState<FormMap>({});
  const [purchaseNoteMap, setPurchaseNoteMap] = useState<FormMap>({});
  const [videoUrlMap, setVideoUrlMap] = useState<FormMap>({});
  const [videoNoteMap, setVideoNoteMap] = useState<FormMap>({});
  const [transcriptMap, setTranscriptMap] = useState<FormMap>({});
  const [preVideoChoiceMap, setPreVideoChoiceMap] = useState<PreVideoChoiceMap>({});
  const [publicUrlMap, setPublicUrlMap] = useState<FormMap>({});
  const [adCodeMap, setAdCodeMap] = useState<FormMap>({});
  const [screenshotMap, setScreenshotMap] = useState<FormMap>({});
  const [finalNoteMap, setFinalNoteMap] = useState<FormMap>({});

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
    const bill = billUrlMap[item.id]?.trim();
    const rating = ratingUrlMap[item.id]?.trim();
    if (!bill || !rating) {
      setError("Cần nhập đầy đủ ảnh bill và ảnh đánh giá 5 sao.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/purchase-proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseBillImageUrl: bill,
          productReviewScreenshotUrl: rating,
          purchaseProofNote: purchaseNoteMap[item.id]?.trim() || undefined
        })
      });
      setNotice("Đã xác nhận mua hàng. Bạn có thể chọn nộp kịch bản trước hoặc nộp video trực tiếp.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi bằng chứng mua hàng");
    } finally {
      setBusyId("");
    }
  }

  async function submitTranscript(item: MissionItem) {
    const transcript = transcriptMap[item.id]?.trim() ?? item.submission?.proofTextNote?.trim() ?? "";
    if (!transcript) {
      setError("Cần nhập nội dung kịch bản.");
      return;
    }

    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/transcript-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      setNotice("Đã gửi kịch bản. Vui lòng chờ Brand/Admin duyệt trước khi nộp video review.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi kịch bản");
    } finally {
      setBusyId("");
    }
  }

  async function submitVideo(item: MissionItem) {
    const videoUrl = videoUrlMap[item.id]?.trim();
    if (!videoUrl) {
      setError("Cần nhập video URL.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/video-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, note: videoNoteMap[item.id]?.trim() || undefined })
      });
      setNotice("Đã gửi video review.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi video");
    } finally {
      setBusyId("");
    }
  }

  async function submitPublish(item: MissionItem) {
    const publicUrl = publicUrlMap[item.id]?.trim();
    if (!publicUrl) {
      setError("Cần nhập link video social public.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/publish-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicVideoUrl: publicUrl,
          adCode: adCodeMap[item.id]?.trim() || undefined,
          screenshotUrl: screenshotMap[item.id]?.trim() || undefined,
          finalProofNote: finalNoteMap[item.id]?.trim() || undefined
        })
      });
      setNotice("Đã gửi bước link social public.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi bước link social public");
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counters = useMemo(() => {
    const result = { doing: 0, pending: 0, revision: 0, completed: 0 };
    for (const item of items) {
      if (isApprovedAndUncompleted(item)) result.doing += 1;
      const group = missionGroup(item);
      if (group === "PENDING") result.pending += 1;
      if (group === "REVISION") result.revision += 1;
      if (group === "COMPLETED") result.completed += 1;
    }
    return result;
  }, [items]);

  const earnedMissionPoints = useMemo(
    () => items.filter((item) => item.status === "COMPLETED").reduce((sum, item) => sum + item.mission.rewardPoints, 0),
    [items]
  );

  const prioritizedMissions = useMemo(() => {
    const actionable = items.filter((item) => {
      const group = missionGroup(item);
      if (group === "COMPLETED" || group === "PENDING") return false;
      if (item.status === "COMPLETED") return false;
      return true;
    });
    return actionable.sort((a, b) => missionPriority(b) - missionPriority(a)).slice(0, 2);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "ALL") return items;
    if (activeFilter === "DOING") return items.filter((item) => isApprovedAndUncompleted(item));
    return items.filter((item) => missionGroup(item) === activeFilter);
  }, [activeFilter, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  function openMissionDetail(missionId: string) {
    setActiveFilter("ALL");
    setDetailMissionId(missionId);
  }

  function closeMissionDetail() {
    setDetailMissionId("");
  }

  useEffect(() => {
    if (detailMissionId && !items.some((item) => item.id === detailMissionId)) {
      setDetailMissionId("");
    }
  }, [detailMissionId, items]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeMission = useMemo(
    () => (detailMissionId ? items.find((item) => item.id === detailMissionId) ?? null : null),
    [detailMissionId, items]
  );

  function buildMissionTimeline(item: MissionItem): TimelineStep[] {
    const purchaseDone = item.productReceiveOption === "NO_PRODUCT_REQUIRED" || item.productStatus === "RECEIVED";
    const transcriptText = Boolean(toPlainTranscript(item.submission?.proofTextNote));
    const hasTranscriptSubmitted =
      item.status === "DRAFT_PENDING" ||
      item.submission?.status === "SUBMITTED" ||
      item.submission?.status === "APPROVED" ||
      transcriptText;
    const hasVideoSubmitted = item.videoReviewStatus !== "NOT_SUBMITTED" || Boolean(item.submission?.videoUrl?.trim());
    const videoApproved = item.videoReviewStatus === "APPROVED";
    const publishDone = item.publishStatus === "APPROVED";
    const completed = item.status === "COMPLETED";
    const selectedFlow = preVideoChoiceMap[item.id];
    const hasChosenPreStep = Boolean(selectedFlow) || hasTranscriptSubmitted || hasVideoSubmitted;

    const transcriptPending = item.status === "DRAFT_PENDING" && item.submission?.status === "SUBMITTED";
    const transcriptRejected = item.status === "DRAFT_PENDING" && item.submission?.status === "REJECTED";
    const transcriptApproved = hasTranscriptSubmitted && !transcriptPending && !transcriptRejected;
    const skipTranscriptFlow = !hasTranscriptSubmitted && hasVideoSubmitted;

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
        label: "Mua sản phẩm",
        icon: "purchase",
        done: purchaseDone || completed,
        current: !purchaseDone && item.missionApplication?.status === "APPROVED",
        failed: false
      });
    }

    if (!hasChosenPreStep) {
      steps.push({
        key: "draft-choice",
        label: "Nộp kịch bản hoặc video",
        icon: "draftChoice",
        done: false,
        current: item.missionApplication?.status === "APPROVED" && purchaseDone && !completed,
        failed: false
      });
    } else {
      steps.push({
        key: "draft-submit",
        label: skipTranscriptFlow ? "Nộp kịch bản (bỏ qua)" : "Nộp kịch bản",
        icon: "draftSubmit",
        done: hasTranscriptSubmitted || skipTranscriptFlow || completed,
        current: !hasTranscriptSubmitted && !hasVideoSubmitted && item.missionApplication?.status === "APPROVED" && purchaseDone && !completed,
        failed: false
      });
      steps.push({
        key: "draft-review",
        label: skipTranscriptFlow ? "Duyệt kịch bản (bỏ qua)" : "Duyệt kịch bản",
        icon: "draftReview",
        done: transcriptApproved || skipTranscriptFlow || completed,
        current: transcriptPending,
        failed: transcriptRejected
      });
      steps.push({
        key: "video-submit",
        label: "Nộp video",
        icon: "videoSubmit",
        done: hasVideoSubmitted || completed,
        current: !hasVideoSubmitted && (skipTranscriptFlow || transcriptApproved) && item.missionApplication?.status === "APPROVED" && purchaseDone && !completed,
        failed: false
      });
    }

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
      done: publishDone || completed,
      current: item.publishStatus === "PENDING" || (videoApproved && item.publishStatus === "NOT_SUBMITTED"),
      failed: item.publishStatus === "REJECTED"
    });
    steps.push({
      key: "completed",
      label: "Hoàn thành",
      icon: "completed",
      done: completed,
      current: !completed && publishDone,
      failed: false
    });

    return steps;
  }

  function renderMissionDetail(item: MissionItem) {
    const isApplicationPending = item.missionApplication?.status === "PENDING_REVIEW";
    const canSubmitPurchase = !isApplicationPending && item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED";
    const canSubmitVideoCandidate =
      !isApplicationPending &&
      item.status !== "COMPLETED" &&
      item.videoReviewStatus !== "PENDING" &&
      item.videoReviewStatus !== "APPROVED" &&
      item.publishStatus !== "PENDING" &&
      (item.productReceiveOption === "NO_PRODUCT_REQUIRED" || item.productStatus === "RECEIVED");
    const isTranscriptFlow = item.status === "DRAFT_PENDING";
    const hasTranscript = Boolean(item.submission?.proofTextNote?.trim());
    const needsPreVideoChoice = canSubmitVideoCandidate && !isTranscriptFlow && !hasTranscript;
    const selectedChoice = preVideoChoiceMap[item.id];
    const showTranscriptComposer = isTranscriptFlow || (needsPreVideoChoice && selectedChoice === "TRANSCRIPT");
    const showVideoComposer = canSubmitVideoCandidate && !isTranscriptFlow && (!needsPreVideoChoice || selectedChoice === "VIDEO");
    const canSubmitPublish = !isApplicationPending && item.videoReviewStatus === "APPROVED" && item.status !== "COMPLETED" && item.publishStatus !== "PENDING";
    const showProductSection = item.productReceiveOption === "PRODUCT_REQUIRED";
    const timelineSteps = buildMissionTimeline(item);

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-900">Tiến độ nhiệm vụ</p>
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
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100"
                    : isDone
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-zinc-300 bg-white text-zinc-500";
                const labelTone = isFailed ? "text-red-700" : isCurrent || isDone ? "text-zinc-900" : "text-zinc-500";
                const leftLineTone = prevStep?.done || isCurrent || isDone ? "bg-emerald-300" : "bg-zinc-200";
                const rightLineTone = isDone || isCurrent ? "bg-emerald-300" : "bg-zinc-200";

                return (
                  <div key={step.key} className="flex w-32 flex-col items-center text-center">
                    <div className="flex w-full items-center">
                      {index > 0 ? <span className={`h-[2px] flex-1 ${leftLineTone}`} /> : <span className="flex-1" />}
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-semibold transition-all ${circleTone}`}>
                        <TimelineStepIcon step={step.icon} />
                      </div>
                      {index < timelineSteps.length - 1 ? <span className={`h-[2px] flex-1 ${rightLineTone}`} /> : <span className="flex-1" />}
                    </div>
                    <p className={`mt-3 px-2 text-sm font-medium leading-5 ${labelTone}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
          <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary>
          <div className="mt-3 grid gap-1 text-sm text-zinc-600">
            <p>Tên campaign: <strong className="text-zinc-900">{item.campaign.title}</strong></p>
            <p>Đường dẫn campaign: <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${item.campaign.slug}`}>/campaigns/{item.campaign.slug}</Link></p>
          </div>
        </details>

        <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
          <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin nhiệm vụ</summary>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
            <p>Trạng thái luồng: <strong className="text-zinc-900">{workflowStatus(item)}</strong></p>
            <p>Trạng thái nhiệm vụ: <strong className="text-zinc-900">{missionStatusLabel(item.status)}</strong></p>
            <p>Đối tượng: <strong className="text-zinc-900">{missionAudienceLabel(item.mission.audience)}</strong></p>
            <p>Cho phép làm lại: <strong className="text-zinc-900">{item.mission.allowRepeat ? "Có" : "Không"}</strong></p>
            <p>Điểm thưởng: <strong className="text-zinc-900">{item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</strong></p>
            <p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(item.mission.deadlineAt)}</strong></p>
            <p>Yêu cầu sản phẩm: <strong className="text-zinc-900">{productReceiveOptionLabel(item.productReceiveOption)}</strong></p>
            <p>Trạng thái sản phẩm: <strong className="text-zinc-900">{productStatusLabel(item.productStatus)}</strong></p>
          </div>
          <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{item.mission.description}</p>
        </details>

        {showProductSection ? (
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
        ) : null}

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
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Phản hồi bước cuối: {item.publishFeedback}</p>
        ) : null}

        <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
          <summary className="cursor-pointer font-semibold text-zinc-900">Thực hiện nhiệm vụ</summary>
          <div className="mt-3 space-y-3">
            {isApplicationPending ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Nhiệm vụ đang chờ duyệt. Bạn sẽ bắt đầu các bước thực hiện sau khi Brand/Admin duyệt đơn.
              </p>
            ) : null}

            {canSubmitPurchase ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="font-medium">Bước 1 - Mua sản phẩm</p>
                <p className="text-sm text-zinc-600">Link sản phẩm: <UrlValue value={item.mission.productLink} /></p>
                <p className="text-sm text-zinc-600">Hướng dẫn: Đặt hàng đúng link, đánh giá 5 sao, upload ảnh bill và ảnh đánh giá.</p>
                <div className="mt-2 grid gap-2">
                  <input className="dc-input" placeholder="URL ảnh bill mua hàng" value={billUrlMap[item.id] ?? ""} onChange={(e) => setBillUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <input className="dc-input" placeholder="URL ảnh đã đánh giá 5 sao" value={ratingUrlMap[item.id] ?? ""} onChange={(e) => setRatingUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <textarea className="dc-input" placeholder="Ghi chú (nếu có)" value={purchaseNoteMap[item.id] ?? ""} onChange={(e) => setPurchaseNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitPurchaseProof(item)}>Xác nhận đã mua hàng</button>
                </div>
              </div>
            ) : null}

            {needsPreVideoChoice ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="font-medium">Chọn quy trình trước video review</p>
                <p className="text-sm text-zinc-600">Bạn có thể nộp kịch bản trước để được duyệt, hoặc nộp video review trực tiếp.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={selectedChoice === "TRANSCRIPT" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setPreVideoChoiceMap((s) => ({ ...s, [item.id]: "TRANSCRIPT" }))}>Nộp kịch bản trước</button>
                  <button className={selectedChoice === "VIDEO" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setPreVideoChoiceMap((s) => ({ ...s, [item.id]: "VIDEO" }))}>Nộp video luôn</button>
                </div>
              </div>
            ) : null}

            {showTranscriptComposer ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="font-medium">Nộp kịch bản</p>
                {isTranscriptFlow && item.submission?.status === "SUBMITTED" ? <p className="mt-1 text-sm text-zinc-600">Kịch bản đã gửi, đang chờ duyệt.</p> : null}
                {item.submission?.fileUploadUrl ? (
                  <a
                    href={`/api/uploads/transcript-download?url=${encodeURIComponent(item.submission.fileUploadUrl)}`}
                    className="mt-2 inline-flex text-sm font-semibold text-zinc-900 underline"
                  >
                    Tải file kịch bản (.txt)
                  </a>
                ) : null}
                <div className="mt-2 grid gap-2">
                  <textarea
                    className="dc-input min-h-32"
                    placeholder="Nhập nội dung kịch bản"
                    disabled={isTranscriptFlow && item.submission?.status === "SUBMITTED"}
                    value={transcriptMap[item.id] ?? toPlainTranscript(item.submission?.proofTextNote)}
                    onChange={(event) => setTranscriptMap((s) => ({ ...s, [item.id]: event.target.value }))}
                  />
                  {!(isTranscriptFlow && item.submission?.status === "SUBMITTED") ? (
                    <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitTranscript(item)}>
                      {item.submission?.status === "REJECTED" ? "Gửi lại kịch bản" : "Gửi kịch bản"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showVideoComposer ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="font-medium">Nộp video review</p>
                <div className="mt-2 grid gap-2">
                  <input className="dc-input" placeholder="Video URL" value={videoUrlMap[item.id] ?? item.submission?.videoUrl ?? ""} onChange={(e) => setVideoUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <textarea className="dc-input" placeholder="Ghi chú video" value={videoNoteMap[item.id] ?? item.submission?.note ?? ""} onChange={(e) => setVideoNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitVideo(item)}>
                    {item.videoReviewStatus === "REJECTED" ? "Gửi lại video review" : "Gửi video review"}
                  </button>
                </div>
              </div>
            ) : null}

            {canSubmitPublish ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="font-medium">Bước 3 - Nộp link video social public</p>
                <div className="mt-2 grid gap-2">
                  <input className="dc-input" placeholder="Link video social public" value={publicUrlMap[item.id] ?? item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl ?? ""} onChange={(e) => setPublicUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <input className="dc-input" placeholder="Mã quảng cáo (adCode)" value={adCodeMap[item.id] ?? item.submission?.adCode ?? ""} onChange={(e) => setAdCodeMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <input className="dc-input" placeholder="Screenshot URL (nếu cần)" value={screenshotMap[item.id] ?? item.submission?.screenshotUrl ?? ""} onChange={(e) => setScreenshotMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <textarea className="dc-input" placeholder="Ghi chú bước cuối" value={finalNoteMap[item.id] ?? item.submission?.finalProofNote ?? ""} onChange={(e) => setFinalNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                  <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitPublish(item)}>
                    {item.publishStatus === "REJECTED" ? "Gửi lại link social public" : "Gửi link social public"}
                  </button>
                </div>
              </div>
            ) : null}

            {item.status === "COMPLETED" ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Nhiệm vụ đã hoàn thành. N-Points đã được cộng theo kết quả duyệt.
              </p>
            ) : null}
          </div>
        </details>
      </div>
    );
  }

  return (
    <>
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading ? (
        <>
          <section className="dc-grid-dashboard">
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Đang chờ duyệt</p><p className="text-2xl font-bold">{counters.pending}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Nhiệm vụ đang làm</p><p className="text-2xl font-bold">{counters.doing}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Cần chỉnh sửa</p><p className="text-2xl font-bold">{counters.revision}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Hoàn thành</p><p className="text-2xl font-bold">{counters.completed}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Số N-Points</p><p className="text-2xl font-bold">{(overview?.nPointsBalance ?? 0).toLocaleString("vi-VN")} N-Points</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Hoa hồng</p><p className="text-2xl font-bold">{earnedMissionPoints.toLocaleString("vi-VN")} N-Points</p></article>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Việc cần làm tiếp theo" />
            {prioritizedMissions.length === 0 ? (
              <EmptyState
                title="Chưa có việc cần xử lý"
                description="Bạn có thể nhận thêm nhiệm vụ mới từ Campaign / Job."
                action={<Link href="/dashboard/creator/jobs" className="dc-btn-primary">Nhận thêm nhiệm vụ</Link>}
              />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {prioritizedMissions.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900">{item.mission.title}</h3>
                        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-zinc-500">Chiến dịch: {item.campaign.title}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item)}`}>{nextActionLabel(item)}</span>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-zinc-600">
                      <p>Trạng thái: <strong>{workflowStatus(item)}</strong></p>
                      <p>Deadline: <strong className={daysLeft(item.mission.deadlineAt) !== null && (daysLeft(item.mission.deadlineAt) ?? 0) <= 3 ? "text-red-600" : "text-zinc-900"}>{deadlineLabel(item.mission.deadlineAt)}</strong></p>
                      <p>Thưởng: <strong>{item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</strong></p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="dc-btn-primary" onClick={() => openMissionDetail(item.id)}>Tiếp tục làm</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="nhiem-vu-cua-toi" className="space-y-3">
            <SectionHeader title="Nhiệm vụ của tôi" subtitle={`${items.length} nhiệm vụ`} />

            <div className="flex flex-wrap gap-2">
              {[
                { key: "ALL" as const, label: "Tất cả" },
                { key: "PENDING" as const, label: "Chờ duyệt" },
                { key: "DOING" as const, label: "Đang làm" },
                { key: "REVISION" as const, label: "Cần sửa" },
                { key: "COMPLETED" as const, label: "Hoàn thành" }
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
            </div>

            {filteredItems.length === 0 ? (
              <EmptyState title="Không có nhiệm vụ phù hợp bộ lọc" description="Thử chuyển sang trạng thái khác hoặc nhận thêm nhiệm vụ mới." />
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
                        <p className="font-semibold text-zinc-900">{item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                        <p className="text-xs text-zinc-500">Thưởng</p>
                      </div>
                      <div>
                        <p className={`font-semibold ${daysLeft(item.mission.deadlineAt) !== null && (daysLeft(item.mission.deadlineAt) ?? 0) <= 3 ? "text-red-600" : "text-zinc-900"}`}>{deadlineLabel(item.mission.deadlineAt)}</p>
                        <p className="text-xs text-zinc-500">Deadline</p>
                      </div>
                      <div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item)}`}>{workflowStatus(item)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {item.status === "COMPLETED" ? (
                          <button className="dc-btn-secondary" onClick={() => openMissionDetail(item.id)}>Xem chi tiết</button>
                        ) : (
                          <button className="dc-btn-primary" onClick={() => openMissionDetail(item.id)}>Tiếp tục làm</button>
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
        </>
      ) : null}
    </>
  );
}

