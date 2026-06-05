"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle, IdentificationCard, Megaphone, Package, Scroll, VideoCamera } from "@phosphor-icons/react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type HistoryItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  reimbursementStatus: string;
  videoReviewStatus: string;
  videoReviewFeedback: string | null;
  publishStatus: string;
  publishFeedback: string | null;
  publishSubmittedAt: string | null;
  videoSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  account: {
    id: string;
    displayName: string;
    email: string;
    creatorProfile?: { socialLinks?: Array<{ id: string; platform: string; socialUrl: string; followers: number | null }> } | null;
  };
  campaign: { id?: string; title: string; slug?: string };
  mission: {
    title: string;
    rewardPoints: number;
    deadlineAt: string | null;
    productLink: string | null;
    description?: string | null;
    productName?: string | null;
    productDescription?: string | null;
    productImageUrl?: string | null;
  };
  submission: {
    transcriptType?: "TEXT" | "FILE" | "URL" | null;
    transcriptTextNote?: string | null;
    transcriptResourceUrl?: string | null;
    videoUrl: string | null;
    note: string | null;
    publicVideoUrl: string | null;
    socialPostUrl: string | null;
    adCode: string | null;
    screenshotUrl: string | null;
    purchaseBillImageUrl: string | null;
    productReviewScreenshotUrl: string | null;
    finalProofNote: string | null;
    rejectReason: string | null;
    status?: string | null;
  } | null;
  missionApplication?: {
    status: string;
    rejectReason: string | null;
  } | null;
};

type HistoryListResponse = {
  items: HistoryItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type BrandMissionHistoryPanelProps = {
  embedded?: boolean;
  fixedCampaignId?: string;
};

type TimelineStep = {
  key: string;
  label: string;
  icon: "application" | "purchase" | "draftSubmit" | "videoSubmit" | "videoReview" | "publish" | "publishReview" | "completed";
  done: boolean;
  current: boolean;
  failed: boolean;
};

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function fmtDateOnly(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
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

function UrlValue({ value, label }: { value: string | null | undefined; label?: string }) {
  const href = asLink(value);
  if (!href) return <span>-</span>;
  const isDownload = href.startsWith("/api/uploads/");
  return (
    <a href={href} download={isDownload} target={isDownload ? undefined : "_blank"} rel="noreferrer" className="font-semibold text-zinc-900 underline break-all">
      {label ?? value}
    </a>
  );
}

function isTranscriptUploadPath(value: string | null | undefined) {
  return Boolean(value?.trim().startsWith("/uploads/creator-transcript/"));
}

function transcriptLinkLabel(value: string | null | undefined) {
  return isTranscriptUploadPath(value) ? "Tải file kịch bản" : "Mở link kịch bản";
}

function transcriptModeLabel(mode: "TEXT" | "FILE" | "URL" | null | undefined, resourceUrl?: string | null) {
  if (mode === "TEXT") return "Viết trực tiếp";
  if (mode === "FILE") return "Tải file lên";
  if (mode === "URL") return "Gửi link URL";
  return resourceUrl ? (isTranscriptUploadPath(resourceUrl) ? "Tải file lên" : "Gửi link URL") : "Viết trực tiếp";
}

function mapStatusVi(value: string | null | undefined) {
  if (!value) return "-";
  const map: Record<string, string> = {
    PENDING_REVIEW: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    PENDING: "Chờ duyệt",
    SUBMITTED: "Đã nộp",
    OPEN: "Đang mở",
    COMPLETED: "Hoàn thành",
    IN_PROGRESS: "Đang thực hiện",
    PRODUCT_PENDING: "Chờ mua sản phẩm",
    DRAFT_PENDING: "Chờ duyệt kịch bản",
    NOT_SUBMITTED: "Chưa nộp",
    NOT_REQUIRED: "Không yêu cầu",
    WAITING_PURCHASE: "Chờ mua hàng",
    WAITING_DEPOSIT: "Chờ đặt cọc",
    RECEIVED: "Đã nhận",
    CANCELLED: "Đã hủy"
  };
  return map[value] ?? value;
}

function historyStatusTone(item: HistoryItem) {
  return item.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";
}

function historyStatusLabel(item: HistoryItem) {
  return item.status === "COMPLETED" ? "Đã hoàn thành" : "Bị từ chối";
}

function TimelineStepIcon({ step }: { step: TimelineStep["icon"] }) {
  if (step === "application") return <IdentificationCard size={18} weight="duotone" />;
  if (step === "purchase") return <Package size={18} weight="duotone" />;
  if (step === "draftSubmit") return <Scroll size={18} weight="duotone" />;
  if (step === "videoSubmit") return <VideoCamera size={18} weight="duotone" />;
  if (step === "videoReview") return <CheckCircle size={18} weight="duotone" />;
  if (step === "publish") return <Megaphone size={18} weight="duotone" />;
  if (step === "publishReview") return <CheckCircle size={18} weight="duotone" />;
  return <CheckCircle size={18} weight="fill" />;
}

function buildTimeline(item: HistoryItem): TimelineStep[] {
  const includePurchase = item.productReceiveOption === "PRODUCT_REQUIRED";
  const rejected = item.status !== "COMPLETED";
  const steps: TimelineStep[] = [
    { key: "application", label: "Duyệt tham gia", icon: "application", done: true, current: false, failed: false },
    ...(includePurchase ? [{ key: "purchase", label: "Mua sản phẩm", icon: "purchase" as const, done: item.productStatus === "RECEIVED" || item.status === "COMPLETED", current: false, failed: false }] : []),
    { key: "draftSubmit", label: "Nộp kịch bản", icon: "draftSubmit", done: Boolean(item.submission?.transcriptTextNote || item.submission?.transcriptResourceUrl || item.videoSubmittedAt), current: false, failed: false },
    { key: "videoSubmit", label: "Nộp video", icon: "videoSubmit", done: Boolean(item.submission?.videoUrl || item.videoSubmittedAt), current: false, failed: false },
    { key: "videoReview", label: "Duyệt video", icon: "videoReview", done: item.videoReviewStatus === "APPROVED" || item.status === "COMPLETED", current: false, failed: item.videoReviewStatus === "REJECTED" },
    { key: "publish", label: "Nộp link public", icon: "publish", done: Boolean(item.submission?.publicVideoUrl || item.submission?.socialPostUrl || item.publishSubmittedAt), current: false, failed: false },
    { key: "publishReview", label: "Duyệt link public", icon: "publishReview", done: item.publishStatus === "APPROVED" || item.status === "COMPLETED", current: false, failed: item.publishStatus === "REJECTED" || rejected },
    { key: "completed", label: "Hoàn thành", icon: "completed", done: item.status === "COMPLETED", current: item.status === "COMPLETED", failed: false }
  ];

  if (rejected) {
    const failedIndex = steps.findIndex((step) => step.failed);
    if (failedIndex >= 0) {
      return steps.map((step, index) => ({
        ...step,
        current: index === failedIndex,
        done: index < failedIndex && step.done
      }));
    }
  }

  return steps;
}

function ProductInfoCard({ item }: { item: HistoryItem }) {
  if (item.productReceiveOption !== "PRODUCT_REQUIRED") return null;
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
      <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin sản phẩm</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          {item.mission.productImageUrl ? <img src={item.mission.productImageUrl} alt={item.mission.productName ?? "Ảnh sản phẩm"} className="h-full max-h-48 w-full object-cover" /> : <div className="flex h-40 items-center justify-center px-3 text-sm text-zinc-500">Chưa có hình ảnh sản phẩm</div>}
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

function CreatorInfoCard({ item }: { item: HistoryItem }) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
      <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin Creator</summary>
      <div className="mt-2 text-sm text-zinc-700">
        <p>Tên Creator: <strong className="text-zinc-900">{item.account.displayName}</strong></p>
        <p>Email: <strong className="text-zinc-900">{item.account.email}</strong></p>
        {(item.account.creatorProfile?.socialLinks ?? []).map((link) => (
          <p key={link.id}>
            {link.platform}: <UrlValue value={link.socialUrl} /> {link.followers ? `(${link.followers.toLocaleString("vi-VN")} follower)` : ""}
          </p>
        ))}
      </div>
    </details>
  );
}

function CampaignInfoCard({ item }: { item: HistoryItem }) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
      <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary>
      <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
        <p>Tên campaign: <strong className="text-zinc-900">{item.campaign.title}</strong></p>
        <p>
          Đường dẫn campaign:{" "}
          {item.campaign.slug ? (
            <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${item.campaign.slug}`}>
              /campaigns/{item.campaign.slug}
            </Link>
          ) : (
            <strong className="text-zinc-900">-</strong>
          )}
        </p>
        <p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(item.mission.deadlineAt)}</strong></p>
      </div>
      {item.mission.description?.trim() ? <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">{item.mission.description}</p> : null}
    </details>
  );
}

function HistoryDetailModal({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  const timelineSteps = buildTimeline(item);
  return (
    <div className="fixed inset-0 z-[95] bg-zinc-900/50 p-3 md:p-6" onClick={onClose}>
      <div className="mx-auto max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">{item.mission.title}</h3>
            <p className="text-sm text-zinc-600">{item.account.displayName} • {item.campaign.title}</p>
          </div>
          <button type="button" className="dc-btn-secondary" onClick={onClose}>Đóng</button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-sm font-semibold text-zinc-900">Tiến độ campaign</p>
            <div className="mt-3 overflow-x-auto pb-2">
              <div className="flex min-w-max items-start">
                {timelineSteps.map((step, index) => {
                  const prevStep = index > 0 ? timelineSteps[index - 1] : null;
                  const circleTone = step.failed ? "border-red-300 bg-red-50 text-red-700" : step.current ? "border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100" : step.done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-white text-zinc-500";
                  const labelTone = step.failed ? "text-red-700" : step.current || step.done ? "text-zinc-900" : "text-zinc-500";
                  const leftLineTone = prevStep?.done ? "bg-emerald-300" : "bg-zinc-200";
                  const rightLineTone = step.done && timelineSteps[index + 1] ? "bg-emerald-300" : "bg-zinc-200";
                  return (
                    <div key={step.key} className="flex w-24 flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        {index > 0 ? <span className={`h-[2px] flex-1 ${leftLineTone}`} /> : <span className="flex-1" />}
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-semibold transition-all ${circleTone}`}><TimelineStepIcon step={step.icon} /></div>
                        {index < timelineSteps.length - 1 ? <span className={`h-[2px] flex-1 ${rightLineTone}`} /> : <span className="flex-1" />}
                      </div>
                      <p className={`mt-2 px-1 text-xs font-medium leading-4 ${labelTone}`}>{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-sm font-semibold text-zinc-900">Lịch sử các lần đã nộp</p>

            {(item.submission?.purchaseBillImageUrl || item.submission?.productReviewScreenshotUrl) ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước mua sản phẩm</summary>
                <div className="mt-2 space-y-1">
                  <p>Ảnh bill: <UrlValue value={item.submission?.purchaseBillImageUrl} label="Tải file ảnh" /></p>
                  <p>Ảnh đánh giá: <UrlValue value={item.submission?.productReviewScreenshotUrl} label="Tải file ảnh" /></p>
                </div>
              </details>
            ) : null}

            {(item.submission?.transcriptTextNote || item.submission?.transcriptResourceUrl) ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp kịch bản</summary>
                <div className="mt-2 space-y-1">
                  <p>Trạng thái: {mapStatusVi(item.submission?.status)}</p>
                  <p>Hình thức gửi: {transcriptModeLabel(item.submission?.transcriptType, item.submission?.transcriptResourceUrl)}</p>
                  {hasText(item.submission?.transcriptTextNote) ? <p className="whitespace-pre-line">Nội dung: {item.submission?.transcriptTextNote}</p> : null}
                  {item.submission?.transcriptResourceUrl ? <p>{isTranscriptUploadPath(item.submission.transcriptResourceUrl) ? "File kịch bản: " : "Link kịch bản: "}<UrlValue value={item.submission.transcriptResourceUrl} label={transcriptLinkLabel(item.submission.transcriptResourceUrl)} /></p> : null}
                  {hasText(item.submission?.rejectReason) ? <p>Lý do từ chối: {item.submission?.rejectReason}</p> : null}
                </div>
              </details>
            ) : null}

            {item.submission?.videoUrl ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp video</summary>
                <div className="mt-2 space-y-1">
                  <p>Thời gian nộp: {fmtDate(item.videoSubmittedAt)}</p>
                  <p>Video URL: <UrlValue value={item.submission.videoUrl} label="Mở liên kết video" /></p>
                  {hasText(item.submission?.note) ? <p>Ghi chú: {item.submission.note}</p> : null}
                  {hasText(item.videoReviewFeedback) ? <p>Lý do từ chối: {item.videoReviewFeedback}</p> : null}
                </div>
              </details>
            ) : null}

            {(item.submission?.publicVideoUrl || item.submission?.socialPostUrl || item.submission?.screenshotUrl || item.submission?.adCode || item.submission?.finalProofNote) ? (
              <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp link social</summary>
                <div className="mt-2 space-y-1">
                  <p>Thời gian nộp: {fmtDate(item.publishSubmittedAt)}</p>
                  <p>Link public: <UrlValue value={item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl} label="Mở liên kết public" /></p>
                  <p>Ảnh chụp màn hình minh chứng: <UrlValue value={item.submission?.screenshotUrl} label="Tải file ảnh" /></p>
                  <p>Mã quảng cáo: {item.submission?.adCode ?? "-"}</p>
                  {hasText(item.submission?.finalProofNote) ? <p>Ghi chú: {item.submission?.finalProofNote}</p> : null}
                  {hasText(item.publishFeedback) ? <p>Lý do từ chối: {item.publishFeedback}</p> : null}
                </div>
              </details>
            ) : null}
          </div>

          <CampaignInfoCard item={item} />
          <ProductInfoCard item={item} />
          <CreatorInfoCard item={item} />
        </div>
      </div>
    </div>
  );
}

export function BrandMissionHistoryPanel({ embedded = false, fixedCampaignId }: BrandMissionHistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<HistoryItem | null>(null);
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async (pageOverride?: number) => {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      if (fixedCampaignId) params.set("campaignId", fixedCampaignId);
      params.set("page", String(targetPage));
      params.set("limit", "50");

      const res = await fetch(`/api/brand/dashboard/mission-history?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<HistoryListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải lịch sử nhiệm vụ");
      const filteredItems = body.data.items.filter((item) => item.status === "COMPLETED" || item.missionApplication?.status === "REJECTED");
      setItems(filteredItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải lịch sử nhiệm vụ");
    } finally {
      setLoading(false);
    }
  }, [campaign, fixedCampaignId, page, query]);

  async function loadDetail(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/brand/dashboard/mission-history/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<HistoryItem>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      {!embedded ? <PageHeader title="Lịch sử nhiệm vụ Creator" subtitle="Các nhiệm vụ đã hoàn thành hoặc bị từ chối theo từng campaign của Brand." /> : null}

      {!embedded ? (
        <section className="dc-card p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <input className="dc-input" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
            <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
            <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
            <p className="text-sm text-zinc-500">Tổng {items.length} nhiệm vụ</p>
          </div>
        </section>
      ) : null}

      {error ? <div className={embedded ? "" : "mt-4"}><ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className={embedded ? "" : "mt-4"}><LoadingSkeleton rows={5} /></div> : null}

      {!loading && !error ? (
        <section className={`${embedded ? "" : "mt-4"} grid gap-3`}>
          {items.length === 0 ? (
            <EmptyState title="Không có dữ liệu" description="Không có nhiệm vụ hoàn thành hoặc bị từ chối phù hợp bộ lọc hiện tại." />
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="grid gap-3 xl:grid-cols-[2.4fr_1fr_1.2fr_1.4fr] xl:items-start">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">{item.mission.title}</p>
                    <p className="line-clamp-1 text-sm text-zinc-500">{item.campaign.title}</p>
                    <p className="line-clamp-1 text-sm text-zinc-500">{item.account.displayName}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{fmtDateOnly(item.status === "COMPLETED" ? item.completedAt : item.updatedAt)}</p>
                    <p className="text-xs text-zinc-500">{item.status === "COMPLETED" ? "Ngày hoàn thành" : "Ngày từ chối"}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${historyStatusTone(item)}`}>{historyStatusLabel(item)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>Xem chi tiết</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}

      {detail ? <HistoryDetailModal item={detail} onClose={() => setDetail(null)} /> : null}
    </>
  );
}
