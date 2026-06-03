"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle, IdentificationCard, Megaphone, Package, Scroll, VideoCamera } from "@phosphor-icons/react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };
type DetailTab = "ACTIONS" | "HISTORY";

export type MissionReviewsTabKey = "transcript-reviews" | "applications" | "video-reviews" | "final-reviews";

type MissionReviewsPageProps = {
  pageTitle: string;
  subtitle: string;
  apiBasePath: string;
  initialTab?: MissionReviewsTabKey;
};

const tabs: Array<{ key: MissionReviewsTabKey; label: string }> = [
  { key: "applications", label: "Nhận nhiệm vụ" },
  { key: "transcript-reviews", label: "Duyệt kịch bản" },
  { key: "video-reviews", label: "Duyệt video" },
  { key: "final-reviews", label: "Duyệt hoàn thành" }
];

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function fmtDateOnly(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function daysLeft(value: string | null) {
  if (!value) return null;
  const now = Date.now();
  const end = new Date(value).getTime();
  return Math.ceil((end - now) / 86400000);
}

function deadlineLabel(value: string | null) {
  const days = daysLeft(value);
  if (days === null) return "Không giới hạn";
  if (days < 0) return "Đã quá hạn";
  if (days === 0) return "Hôm nay";
  if (days <= 7) return `${days} ngày nữa`;
  return fmtDateOnly(value);
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
    <a href={href} download={isDownload} className="font-semibold text-zinc-900 underline break-all">
      {label ?? value}
    </a>
  );
}

function productReceiveOptionLabel(value: string | null | undefined) {
  if (value === "PRODUCT_REQUIRED") return "Có yêu cầu sản phẩm";
  if (value === "NO_PRODUCT_REQUIRED") return "Không yêu cầu sản phẩm";
  return "Không xác định";
}

function missionAudienceLabel() {
  return "Người dùng";
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
    WAITING_DEPOSIT: "Chờ đặt cọc"
  };
  return map[value] ?? value;
}

function CreatorSocialLinks({ name, profile }: { name?: string | null; profile: { socialLinks?: Array<{ id: string; platform: string; socialUrl: string; followers: number | null; handle: string | null }> } | null | undefined }) {
  const links = profile?.socialLinks ?? [];
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
      <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin Creator</summary>
      <div className="mt-2 text-sm text-zinc-700">
        <p>Tên Creator: <strong className="text-zinc-900">{name ?? "-"}</strong></p>
        {links.length === 0 ? <p>Chưa có mạng xã hội</p> : links.map((link) => (
          <p key={link.id}>
            {link.platform}: <UrlValue value={link.socialUrl} /> {link.followers ? `(${link.followers.toLocaleString("vi-VN")} follower)` : ""}
          </p>
        ))}
      </div>
    </details>
  );
}

function buildStaticReviewTimeline(activeKey: "application" | "draftReview" | "videoReview" | "publishReview", includePurchase: boolean) {
  const steps: Array<{ key: TimelineStep["key"]; label: string; icon: TimelineStep["icon"] }> = [
    { key: "application", label: "Duyệt tham gia", icon: "application" },
    ...(includePurchase ? [{ key: "purchase" as const, label: "Mua sản phẩm", icon: "purchase" as const }] : []),
    { key: "draftChoice", label: "Nộp kịch bản hoặc video", icon: "draftSubmit" },
    { key: "draftSubmit", label: "Nộp kịch bản", icon: "draftSubmit" },
    { key: "draftReview", label: "Duyệt kịch bản", icon: "videoReview" },
    { key: "videoSubmit", label: "Nộp video", icon: "videoSubmit" },
    { key: "videoReview", label: "Duyệt video", icon: "videoReview" },
    { key: "publish", label: "Nộp link public", icon: "publish" },
    { key: "publishReview", label: "Duyệt link public", icon: "publishReview" },
    { key: "completed", label: "Hoàn thành", icon: "completed" }
  ];
  const activeIndex = steps.findIndex((step) => step.key === activeKey);
  return steps.map((step, index) => ({
    key: step.key,
    label: step.label,
    icon: step.icon,
    done: index < activeIndex,
    current: index === activeIndex,
    failed: false
  }));
}

function ProductInfoCard({
  title,
  description,
  imageUrl,
  link
}: {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  link?: string | null;
}) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
      <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin sản phẩm</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          {imageUrl ? <img src={imageUrl} alt={title ?? "Ảnh sản phẩm"} className="h-full max-h-48 w-full object-cover" /> : <div className="flex h-40 items-center justify-center px-3 text-sm text-zinc-500">Chưa có hình ảnh sản phẩm</div>}
        </div>
        <div className="grid gap-1 text-sm text-zinc-700">
          <p>Tên sản phẩm: <strong className="text-zinc-900">{title || "-"}</strong></p>
          <p>Mô tả sản phẩm: <span className="whitespace-pre-line">{description || "-"}</span></p>
          <p>Link sản phẩm: <UrlValue value={link} /></p>
        </div>
      </div>
    </details>
  );
}

type TimelineStep = {
  key: string;
  label: string;
  icon: "application" | "purchase" | "draftSubmit" | "videoSubmit" | "videoReview" | "publish" | "publishReview" | "completed";
  done: boolean;
  current: boolean;
  failed: boolean;
};

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

function MissionDetailModal({
  open,
  title,
  subtitle,
  onClose,
  detailTab,
  setDetailTab,
  timelineSteps,
  campaignNode,
  missionNode,
  historyNode,
  actionNode,
  feedbackNode
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  timelineSteps: TimelineStep[];
  campaignNode: ReactNode;
  missionNode: ReactNode;
  historyNode: ReactNode;
  actionNode: ReactNode;
  feedbackNode?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/50 p-3 md:p-6" onClick={onClose}>
      <div className="mx-auto max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">{title}</h3>
            {subtitle ? <p className="text-sm text-zinc-600">{subtitle}</p> : null}
          </div>
          <button type="button" className="dc-btn-secondary" onClick={onClose}>Đóng</button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={detailTab === "ACTIONS" ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-600"} onClick={() => setDetailTab("ACTIONS")}>Thực hiện nhiệm vụ</button>
              <button type="button" className={detailTab === "HISTORY" ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-600"} onClick={() => setDetailTab("HISTORY")}>Lịch sử đã nộp</button>
            </div>
          </div>

          {detailTab === "HISTORY" ? historyNode : (
            <>
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-sm font-semibold text-zinc-900">Tiến độ nhiệm vụ</p>
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
              <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Cách thực hiện</summary>
                <div className="mt-3 space-y-3">{actionNode}</div>
              </details>
              {campaignNode}
              {missionNode}
              {feedbackNode}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MissionReviewsPage({
  pageTitle,
  subtitle,
  apiBasePath,
  initialTab = "applications"
}: MissionReviewsPageProps) {
  const [activeTab, setActiveTab] = useState<MissionReviewsTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <>
      <PageHeader title={pageTitle} subtitle={subtitle} />

      <section className="dc-card p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "rounded-full border border-zinc-900 bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "transcript-reviews" ? <BrandMissionTranscriptReviewsTab apiBasePath={apiBasePath} /> : null}
      {activeTab === "applications" ? <BrandMissionApplicationsTab apiBasePath={apiBasePath} /> : null}
      {activeTab === "video-reviews" ? <BrandMissionVideoReviewsTab apiBasePath={apiBasePath} /> : null}
      {activeTab === "final-reviews" ? <BrandMissionFinalReviewsTab apiBasePath={apiBasePath} /> : null}
    </>
  );
}

type TranscriptItem = {
  id: string;
  status: string;
  videoReviewFeedback: string | null;
  account: {
    id: string;
    displayName: string;
    email: string;
    creatorProfile: { mainPlatform: string | null; socialUrl: string | null; followerCount: number | null; bio?: string | null; socialLinks?: Array<{ id: string; platform: string; socialUrl: string; followers: number | null; handle: string | null }> } | null;
  };
  campaign: { id: string; title: string; slug: string; brandId: string };
  mission: { id: string; title: string; description: string; rewardPoints: number; productReceiveOption: string; productLink: string | null; deadlineAt: string | null; productName?: string | null; productDescription?: string | null; productImageUrl?: string | null };
  submission: {
    proofTextNote: string | null;
    fileUploadUrl: string | null;
    status: string;
    rejectReason: string | null;
    updatedAt: string;
    reviewedAt: string | null;
  } | null;
};

type TranscriptListResponse = {
  items: TranscriptItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const transcriptStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
  { value: "APPROVED", label: "Đã duyệt" }
];

function transcriptStatusLabel(item: TranscriptItem) {
  if (item.status === "DRAFT_PENDING" && item.submission?.status === "SUBMITTED") return "PENDING";
  if (item.status === "DRAFT_PENDING" && item.submission?.status === "REJECTED") return "REJECTED";
  if (item.submission?.status === "APPROVED") return "APPROVED";
  return item.submission?.status ?? "UNKNOWN";
}

function transcriptStatusText(value: string) {
  if (value === "PENDING") return "Chờ duyệt";
  if (value === "APPROVED") return "Đã duyệt";
  if (value === "REJECTED") return "Cần chỉnh sửa";
  return "Chưa rõ";
}

function transcriptStatusTone(value: string) {
  if (value === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (value === "REJECTED") return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-700";
}

function BrandMissionTranscriptReviewsTab({ apiBasePath }: { apiBasePath: string }) {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<TranscriptItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("ACTIONS");

  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [page, setPage] = useState(1);

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`${apiBasePath}/mission-transcript-reviews?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<TranscriptListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải danh sách");
      setItems(body.data.items);
      setPagination(body.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/mission-transcript-reviews/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<TranscriptItem>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    } finally {
      setDetailLoading(false);
    }
  }

  async function approve(id: string) {
    setNotice("");
    setError("");
    if (!window.confirm("Xác nhận duyệt kịch bản này?")) return;
    try {
      const res = await fetch(`${apiBasePath}/mission-transcript-reviews/${id}/approve`, { method: "POST" });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt kịch bản. Creator có thể nộp video review.");
      await load();
      if (selectedId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại");
    }
  }

  async function reject(id: string) {
    setNotice("");
    setError("");
    const feedback = window.prompt("Nhập lý do từ chối kịch bản:", "Kịch bản chưa đạt yêu cầu brief")?.trim();
    if (!feedback) return;
    try {
      const res = await fetch(`${apiBasePath}/mission-transcript-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối kịch bản. Creator có thể nộp lại.");
      await load();
      if (selectedId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Từ chối thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="dc-input" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          <p className="text-sm text-zinc-500">Tổng {pagination.total} bản ghi</p>
        </div>
      </section>

      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && !error ? (
        <section className="grid gap-4">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có kịch bản" description="Không có kịch bản nào phù hợp bộ lọc hiện tại." />
            ) : (
              items.map((item) => {
                const statusLabel = transcriptStatusLabel(item);
                return (
                  <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 xl:grid-cols-[2.4fr_1fr_1.2fr_1.6fr] xl:items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900">{item.mission.title}</p>
                        <p className="line-clamp-1 text-sm text-zinc-500">Chiến dịch: {item.campaign.title}</p>
                        <p className="line-clamp-1 text-sm text-zinc-500">Nhà sáng tạo: {item.account.displayName}</p>
                      </div>
                      <div>
                        <p className={`font-semibold ${daysLeft(item.mission.deadlineAt) !== null && (daysLeft(item.mission.deadlineAt) ?? 0) <= 3 ? "text-red-600" : "text-zinc-900"}`}>{deadlineLabel(item.mission.deadlineAt)}</p>
                        <p className="text-xs text-zinc-500">Deadline</p>
                      </div>
                      <div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${transcriptStatusTone(statusLabel)}`}>{transcriptStatusText(statusLabel)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {statusLabel === "PENDING" ? (
                          <button className="dc-btn-primary" onClick={() => void approve(item.id)}>
                            Duyệt
                          </button>
                        ) : null}
                        <button className="dc-btn-secondary" onClick={() => { setDetailTab("ACTIONS"); void loadDetail(item.id); }}>
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                    {item.submission?.fileUploadUrl ? (
                      <a
                        href={`/api/uploads/transcript-download?url=${encodeURIComponent(item.submission.fileUploadUrl)}`}
                        className="mt-2 inline-flex text-sm font-semibold text-zinc-900 underline"
                      >
                        Tải file kịch bản
                      </a>
                    ) : null}
                  </article>
                );
              })
            )}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
              <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang trước</button>
              <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
              <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
            </div>
          </div>

          <MissionDetailModal
            open={Boolean(detail) || detailLoading}
            title={detail?.mission.title ?? "Chi tiết nhiệm vụ"}
            subtitle={detail ? `${detail.account.displayName} • ${detail.campaign.title}` : undefined}
            onClose={() => { setSelectedId(""); setDetail(null); setDetailLoading(false); }}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            timelineSteps={buildStaticReviewTimeline("draftReview", detail?.mission.productReceiveOption === "PRODUCT_REQUIRED")}
            campaignNode={
              <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
                <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary>
                <div className="mt-3 grid gap-1 text-sm text-zinc-600">
                  <p>Tên campaign: <strong className="text-zinc-900">{detail?.campaign.title ?? "-"}</strong></p>
                  <p>Đường dẫn campaign: {detail?.campaign.slug ? <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${detail.campaign.slug}`}>/campaigns/{detail.campaign.slug}</Link> : <strong className="text-zinc-900">-</strong>}</p>
                </div>
              </details>
            }
            missionNode={
              <>
                <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
                  <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin nhiệm vụ</summary>
                  {detailLoading ? <LoadingSkeleton rows={3} /> : (
                    <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                      <p>Trạng thái luồng: <strong className="text-zinc-900">{detail ? transcriptStatusText(transcriptStatusLabel(detail)) : "-"}</strong></p>
                      <p>Trạng thái nhiệm vụ: <strong className="text-zinc-900">{mapStatusVi(detail?.status)}</strong></p>
                      <p>Đối tượng: <strong className="text-zinc-900">{missionAudienceLabel()}</strong></p>
                      <p>Cho phép làm lại: <strong className="text-zinc-900">Không</strong></p>
                      <p>Điểm thưởng: <strong className="text-zinc-900">{detail?.mission.rewardPoints.toLocaleString("vi-VN") ?? "-"} N-Points</strong></p>
                      <p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(detail?.mission.deadlineAt ?? null)}</strong></p>
                      <p>Yêu cầu sản phẩm: <strong className="text-zinc-900">{productReceiveOptionLabel(detail?.mission.productReceiveOption)}</strong></p>
                      <p>Trạng thái sản phẩm: <strong className="text-zinc-900">Không xác định</strong></p>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{detail?.mission.description ?? "-"}</p>
                </details>
                {detail?.mission.productReceiveOption === "PRODUCT_REQUIRED" ? <ProductInfoCard title={detail?.mission.productName} description={detail?.mission.productDescription} imageUrl={detail?.mission.productImageUrl} link={detail?.mission.productLink} /> : null}
                <CreatorSocialLinks name={detail?.account.displayName} profile={detail?.account.creatorProfile} />
              </>
            }
            historyNode={
              <div className="space-y-3">
                <p className="text-sm font-semibold text-zinc-900">Lịch sử các lần đã nộp</p>
                {(detail?.submission?.proofTextNote || detail?.submission?.fileUploadUrl) ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open>
                  <summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp kịch bản</summary>
                  <div className="mt-2 space-y-1">
                    <p>Thời gian duyệt: {fmtDate(detail?.submission?.reviewedAt ?? null)}</p>
                    <p>Trạng thái: {mapStatusVi(detail?.submission?.status)}</p>
                    <p>File kịch bản: <UrlValue value={detail?.submission?.fileUploadUrl} label="Tải file kịch bản (.txt)" /></p>
                  </div>
                </details> : null}
              </div>
            }
            actionNode={
              <div className="grid gap-2 text-sm">
                <p><strong>Trạng thái:</strong> {detail ? transcriptStatusText(transcriptStatusLabel(detail)) : "-"}</p>
                {detail?.submission?.proofTextNote ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="font-semibold text-zinc-900">Nội dung kịch bản:</p>
                    <div
                      className="mt-2 prose prose-zinc max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: detail.submission.proofTextNote }}
                    />
                    <p className="mt-2">File đính kèm: <UrlValue value={detail.submission.fileUploadUrl} label="Tải file kịch bản" /></p>
                  </div>
                ) : null}
                {(detail?.submission?.rejectReason ?? detail?.videoReviewFeedback) ? <p><strong>Lý do từ chối:</strong> {detail?.submission?.rejectReason ?? detail?.videoReviewFeedback}</p> : null}
                {detail && transcriptStatusLabel(detail) === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void approve(detail.id)}>Duyệt</button>
                    <button className="dc-btn-secondary" onClick={() => void reject(detail.id)}>Từ chối</button>
                  </div>
                ) : null}
              </div>
            }
          />
        </section>
      ) : null}
    </section>
  );
}

type ApplicationListItem = {
  id: string;
  status: string;
  note: string | null;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  account: {
    id: string;
    displayName: string;
    email: string;
    creatorProfile: { mainPlatform: string | null; socialUrl: string | null; followerCount: number | null; socialLinks?: Array<{ id: string; platform: string; socialUrl: string; followers: number | null; handle: string | null }> } | null;
  };
  campaign: { id: string; title: string; slug: string };
  mission: { id: string; title: string; rewardPoints: number; productReceiveOption: string; productLink: string | null; productName?: string | null; productDescription?: string | null; productImageUrl?: string | null };
};

type ApplicationDetail = ApplicationListItem & {
  mission: ApplicationListItem["mission"] & { description: string; deadlineAt: string | null };
};

type ApplicationListResponse = {
  items: ApplicationListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type CompletedMissionHistoryItem = {
  id: string;
  status: string;
  videoReviewStatus: string;
  publishStatus: string;
  completedAt: string | null;
  updatedAt: string;
  campaign: { title: string };
  mission: { title: string; rewardPoints: number };
};

type CompletedMissionHistoryResponse = {
  items: CompletedMissionHistoryItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const applicationStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

function missionStatusLabel(status: string) {
  return mapStatusVi(status);
}

function missionStatusTone(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-700";
}

function BrandMissionApplicationsTab({ apiBasePath }: { apiBasePath: string }) {
  const [items, setItems] = useState<ApplicationListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("ACTIONS");
  const [historyCreator, setHistoryCreator] = useState<{ id: string; displayName: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<CompletedMissionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [page, setPage] = useState(1);

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      params.set("status", "PENDING_REVIEW");
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`${apiBasePath}/mission-applications?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ApplicationListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải danh sách");
      setItems(body.data.items);
      setPagination(body.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/mission-applications/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ApplicationDetail>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    } finally {
      setDetailLoading(false);
    }
  }

  async function approve(id: string) {
    setNotice("");
    setError("");
    if (!window.confirm("Xác nhận duyệt đơn này?")) return;
    try {
      const res = await fetch(`${apiBasePath}/mission-applications/${id}/approve`, { method: "POST" });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt đơn xin nhiệm vụ.");
      await load();
      if (selectedId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại");
    }
  }

  async function reject(id: string) {
    setNotice("");
    setError("");
    const rejectReason = window.prompt("Nhập lý do từ chối:", "Chưa phù hợp yêu cầu mission")?.trim();
    if (!rejectReason) return;
    try {
      const res = await fetch(`${apiBasePath}/mission-applications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectReason })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối đơn xin nhiệm vụ.");
      await load();
      if (selectedId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Từ chối thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  async function loadCompletedHistory(accountId: string, displayName: string) {
    setHistoryCreator({ id: accountId, displayName });
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryItems([]);
    try {
      const params = new URLSearchParams();
      params.set("accountId", accountId);
      params.set("status", "COMPLETED");
      params.set("limit", "10");
      params.set("page", "1");
      const res = await fetch(`${apiBasePath}/mission-history?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CompletedMissionHistoryResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải lịch sử hoàn thành");
      setHistoryItems(body.data.items);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Không thể tải lịch sử hoàn thành");
    } finally {
      setHistoryLoading(false);
    }
  }

  const title = useMemo(() => `Tổng ${pagination.total} đơn`, [pagination.total]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="dc-input" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          <p className="text-sm text-zinc-500">{title}</p>
        </div>
      </section>

      {historyCreator ? (
        <div className="fixed inset-0 z-[70] bg-zinc-900/50 p-3 md:p-6" onClick={() => { setHistoryCreator(null); setHistoryItems([]); setHistoryError(""); }}>
          <div className="mx-auto max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-zinc-900">Lịch sử nhiệm vụ đã hoàn thành - {historyCreator.displayName}</h3>
              <button type="button" className="dc-btn-secondary" onClick={() => { setHistoryCreator(null); setHistoryItems([]); setHistoryError(""); }}>Đóng</button>
            </div>
            {historyLoading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
            {!historyLoading && historyError ? (
              <div className="mt-4">
                <ErrorState
                  title="Không tải được lịch sử"
                  description={historyError}
                  onRetry={() => void loadCompletedHistory(historyCreator.id, historyCreator.displayName)}
                />
              </div>
            ) : null}
            {!historyLoading && !historyError ? (
              <div className="mt-4 grid gap-3">
                {historyItems.length === 0 ? (
                  <EmptyState title="Chưa có nhiệm vụ hoàn thành" description="Creator này chưa có lịch sử hoàn thành mission." />
                ) : (
                  historyItems.map((history) => (
                    <article key={history.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                      <p><strong>Chiến dịch:</strong> {history.campaign.title}</p>
                      <p><strong>Nhiệm vụ:</strong> {history.mission.title}</p>
                      <p><strong>Thưởng:</strong> {history.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                      <p><strong>Trạng thái:</strong> {missionStatusLabel(history.status)} · Video: {missionStatusLabel(history.videoReviewStatus)} · Bước cuối: {missionStatusLabel(history.publishStatus)}</p>
                      <p><strong>Hoàn thành lúc:</strong> {fmtDate(history.completedAt)} · <strong>Cập nhật:</strong> {fmtDate(history.updatedAt)}</p>
                    </article>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && !error ? (
        <section className="grid gap-4">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có đơn" description="Không có đơn nào phù hợp bộ lọc hiện tại." />
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 xl:grid-cols-[2.4fr_1fr_1.2fr_1.7fr] xl:items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{item.mission.title}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">Chiến dịch: {item.campaign.title}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">Nhà sáng tạo: {item.account.displayName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{fmtDateOnly(item.createdAt)}</p>
                      <p className="text-xs text-zinc-500">Ngày gửi</p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${missionStatusTone(item.status)}`}>{missionStatusLabel(item.status)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {item.status === "PENDING_REVIEW" ? (
                        <button className="dc-btn-primary" onClick={() => void approve(item.id)}>
                          Duyệt
                        </button>
                      ) : null}
                      <button className="dc-btn-secondary" onClick={() => { setDetailTab("ACTIONS"); void loadDetail(item.id); }}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
              <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang trước</button>
              <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
              <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
            </div>
          </div>

          <MissionDetailModal
            open={Boolean(detail) || detailLoading}
            title={detail?.mission.title ?? "Chi tiết nhiệm vụ"}
            subtitle={detail ? `${detail.account.displayName} • ${detail.campaign.title}` : undefined}
            onClose={() => { setSelectedId(""); setDetail(null); setDetailLoading(false); }}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            timelineSteps={buildStaticReviewTimeline("application", detail?.mission.productReceiveOption === "PRODUCT_REQUIRED")}
            campaignNode={<details className="rounded-xl border border-zinc-200 bg-white p-3" open><summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary><div className="mt-3 grid gap-1 text-sm text-zinc-600"><p>Tên campaign: <strong className="text-zinc-900">{detail?.campaign.title ?? "-"}</strong></p><p>Đường dẫn campaign: {detail?.campaign.slug ? <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${detail.campaign.slug}`}>/campaigns/{detail.campaign.slug}</Link> : <strong className="text-zinc-900">-</strong>}</p></div></details>}
            missionNode={
              <>
                <details className="rounded-xl border border-zinc-200 bg-white p-3" open>
                  <summary className="cursor-pointer font-semibold text-zinc-900">Thông tin nhiệm vụ</summary>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                    <p>Trạng thái luồng: <strong className="text-zinc-900">{detail ? missionStatusLabel(detail.status) : "-"}</strong></p>
                    <p>Trạng thái nhiệm vụ: <strong className="text-zinc-900">{detail ? missionStatusLabel(detail.status) : "-"}</strong></p>
                    <p>Đối tượng: <strong className="text-zinc-900">{missionAudienceLabel()}</strong></p>
                    <p>Cho phép làm lại: <strong className="text-zinc-900">Không</strong></p>
                    <p>Điểm thưởng: <strong className="text-zinc-900">{detail?.mission.rewardPoints.toLocaleString("vi-VN") ?? "-"} N-Points</strong></p>
                    <p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(detail?.mission.deadlineAt ?? null)}</strong></p>
                    <p>Yêu cầu sản phẩm: <strong className="text-zinc-900">{productReceiveOptionLabel(detail?.mission.productReceiveOption)}</strong></p>
                    <p>Trạng thái sản phẩm: <strong className="text-zinc-900">Không xác định</strong></p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{detail?.mission.description ?? "-"}</p>
                </details>
                {detail?.mission.productReceiveOption === "PRODUCT_REQUIRED" ? <ProductInfoCard title={detail?.mission.productName} description={detail?.mission.productDescription} imageUrl={detail?.mission.productImageUrl} link={detail?.mission.productLink} /> : null}
                <CreatorSocialLinks name={detail?.account.displayName} profile={detail?.account.creatorProfile} />
              </>
            }
            historyNode={
              <div className="space-y-3">
                <p className="text-sm font-semibold text-zinc-900">Lịch sử các lần đã nộp</p>
                {(detail?.createdAt || detail?.reviewedAt) ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open><summary className="cursor-pointer font-semibold text-zinc-900">Bước nhận nhiệm vụ</summary><div className="mt-2 space-y-1"><p>Thời gian: {fmtDate(detail?.createdAt ?? null)}</p><p>Trạng thái: {mapStatusVi(detail?.status)}</p></div></details> : null}
              </div>
            }
            actionNode={
              <div className="grid gap-2 text-sm">
                <p><strong>Trạng thái:</strong> {detail ? missionStatusLabel(detail.status) : "-"}</p>
                {detail?.note && !detail.note.includes("[CREATOR_CAMPAIGN_APPLICATION]") ? <p><strong>Ghi chú Creator:</strong> {detail.note}</p> : null}
                {detail?.rejectReason ? <p><strong>Lý do từ chối:</strong> {detail.rejectReason}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {detail ? <button className="dc-btn-secondary" onClick={() => void loadCompletedHistory(detail.account.id, detail.account.displayName)}>Lịch sử</button> : null}
                  {detail?.status === "PENDING_REVIEW" ? <button className="dc-btn-primary" onClick={() => void approve(detail.id)}>Duyệt</button> : null}
                  {detail?.status === "PENDING_REVIEW" ? <button className="dc-btn-secondary" onClick={() => void reject(detail.id)}>Từ chối</button> : null}
                </div>
              </div>
            }
          />
        </section>
      ) : null}
    </section>
  );
}

type VideoItem = {
  id: string;
  videoReviewStatus: string;
  videoSubmittedAt: string | null;
  account: { displayName: string; email: string; creatorProfile?: { socialLinks?: Array<{ id: string; platform: string; socialUrl: string; followers: number | null; handle: string | null }> } | null };
  campaign: { id: string; title: string; slug?: string };
  mission: { title: string; rewardPoints?: number | null; description?: string | null; deadlineAt?: string | null; productReceiveOption?: string | null; productName?: string | null; productDescription?: string | null; productImageUrl?: string | null; productLink?: string | null };
  submission: { videoUrl: string | null; note: string | null; rejectReason: string | null; publicVideoUrl?: string | null; socialPostUrl?: string | null } | null;
};

type VideoListResponse = { items: VideoItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

const videoStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

function BrandMissionVideoReviewsTab({ apiBasePath }: { apiBasePath: string }) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<VideoItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("ACTIONS");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`${apiBasePath}/mission-video-reviews?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<VideoListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải danh sách");
      setItems(body.data.items);
      setPagination(body.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/mission-video-reviews/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<VideoItem>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    } finally {
      setDetailLoading(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    setNotice("");
    setError("");
    try {
      if (action === "approve") {
        const res = await fetch(`${apiBasePath}/mission-video-reviews/${id}/approve`, { method: "POST" });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      } else {
        const feedback = window.prompt("Nhập feedback từ chối:", "Video chưa đạt guideline")?.trim();
        if (!feedback) return;
        const res = await fetch(`${apiBasePath}/mission-video-reviews/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback })
        });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      }
      setNotice(action === "approve" ? "Đã duyệt video." : "Đã từ chối video.");
      await load();
      if (selectedId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="dc-input" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          <p className="text-sm text-zinc-500">Tổng {pagination.total} bản ghi</p>
        </div>
      </section>

      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && !error ? (
        <section className="grid gap-4">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có video chờ duyệt" description="Không có item nào phù hợp bộ lọc hiện tại." />
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="grid gap-3 xl:grid-cols-[2.4fr_1fr_1fr_1.2fr_1.6fr] xl:items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{item.mission.title}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">Chiến dịch: {item.campaign.title}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">Nhà sáng tạo: {item.account.displayName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{fmtDateOnly(item.videoSubmittedAt)}</p>
                      <p className="text-xs text-zinc-500">Ngày nộp</p>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{item.submission?.videoUrl ? "Đã có video" : "Chưa có video"}</p>
                      <p className="text-xs text-zinc-500">Bằng chứng</p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${missionStatusTone(item.videoReviewStatus)}`}>{missionStatusLabel(item.videoReviewStatus)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {item.videoReviewStatus === "PENDING" ? (
                        <button className="dc-btn-primary" onClick={() => void decide(item.id, "approve")}>
                          Duyệt
                        </button>
                      ) : null}
                      <button className="dc-btn-secondary" onClick={() => { setDetailTab("ACTIONS"); void loadDetail(item.id); }}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                  {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700 line-clamp-2">Lý do từ chối gần nhất: {item.submission.rejectReason}</p> : null}
                </article>
              ))
            )}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
              <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang trước</button>
              <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
              <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
            </div>
          </div>

          <MissionDetailModal
            open={Boolean(detail) || detailLoading}
            title={detail?.mission.title ?? "Chi tiết nhiệm vụ"}
            subtitle={detail ? `${detail.account.displayName} • ${detail.campaign.title}` : undefined}
            onClose={() => { setSelectedId(""); setDetail(null); setDetailLoading(false); }}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            timelineSteps={buildStaticReviewTimeline("videoReview", detail?.mission.productReceiveOption === "PRODUCT_REQUIRED")}
            campaignNode={<details className="rounded-xl border border-zinc-200 bg-white p-3" open><summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary><div className="mt-3 grid gap-1 text-sm text-zinc-600"><p>Tên campaign: <strong className="text-zinc-900">{detail?.campaign.title ?? "-"}</strong></p><p>Đường dẫn campaign: {detail?.campaign.slug ? <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${detail.campaign.slug}`}>/campaigns/{detail.campaign.slug}</Link> : <strong className="text-zinc-900">-</strong>}</p></div></details>}
            missionNode={<><details className="rounded-xl border border-zinc-200 bg-white p-3" open><summary className="cursor-pointer font-semibold text-zinc-900">Thông tin nhiệm vụ</summary><div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2"><p>Trạng thái luồng: <strong className="text-zinc-900">{detail ? missionStatusLabel(detail.videoReviewStatus) : "-"}</strong></p><p>Trạng thái nhiệm vụ: <strong className="text-zinc-900">{detail ? missionStatusLabel(detail.videoReviewStatus) : "-"}</strong></p><p>Đối tượng: <strong className="text-zinc-900">{missionAudienceLabel()}</strong></p><p>Cho phép làm lại: <strong className="text-zinc-900">Không</strong></p><p>Điểm thưởng: <strong className="text-zinc-900">{detail?.mission.rewardPoints?.toLocaleString("vi-VN") ?? "-"} N-Points</strong></p><p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(detail?.mission.deadlineAt ?? null)}</strong></p><p>Yêu cầu sản phẩm: <strong className="text-zinc-900">{productReceiveOptionLabel(detail?.mission.productReceiveOption)}</strong></p><p>Trạng thái sản phẩm: <strong className="text-zinc-900">Không xác định</strong></p></div><p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{detail?.mission.description ?? "-"}</p></details>{detail?.mission.productReceiveOption === "PRODUCT_REQUIRED" ? <ProductInfoCard title={detail?.mission.productName} description={detail?.mission.productDescription} imageUrl={detail?.mission.productImageUrl} link={detail?.mission.productLink} /> : null}<CreatorSocialLinks name={detail?.account.displayName} profile={detail?.account.creatorProfile} /></>}
            historyNode={<div className="space-y-3"><p className="text-sm font-semibold text-zinc-900">Lịch sử các lần đã nộp</p>{(detail?.videoSubmittedAt || detail?.submission?.videoUrl) ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open><summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp video</summary><div className="mt-2 space-y-1"><p>Thời gian nộp: {fmtDate(detail?.videoSubmittedAt ?? null)}</p><p>Video URL: <UrlValue value={detail?.submission?.videoUrl} /></p><p>Ghi chú: {detail?.submission?.note ?? "-"}</p></div></details> : null}{(detail?.submission?.publicVideoUrl || detail?.submission?.socialPostUrl) ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open><summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp link social</summary><div className="mt-2 space-y-1"><p>Link public: <UrlValue value={detail?.submission?.publicVideoUrl ?? detail?.submission?.socialPostUrl} label="Mở liên kết public" /></p></div></details> : null}</div>}
            actionNode={
              <div className="grid gap-2 text-sm">
                {detail?.submission?.videoUrl ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="font-semibold text-zinc-900">Bước nộp video:</p>
                    <p className="mt-2">Video URL: <UrlValue value={detail.submission.videoUrl} /></p>
                    <p>Ghi chú: {detail.submission.note ?? "-"}</p>
                  </div>
                ) : null}
                {detail?.submission?.rejectReason ? <p><strong>Lý do từ chối:</strong> {detail.submission.rejectReason}</p> : null}
                {detail?.videoReviewStatus === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void decide(detail.id, "approve")}>Duyệt</button>
                    <button className="dc-btn-secondary" onClick={() => void decide(detail.id, "reject")}>Từ chối</button>
                  </div>
                ) : null}
              </div>
            }
          />
        </section>
      ) : null}
    </section>
  );
}

type FinalItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  publishStatus: string;
  publishSubmittedAt: string | null;
  reimbursementStatus: string;
  account: { displayName: string; email: string; creatorProfile?: { socialLinks?: Array<{ id: string; platform: string; socialUrl: string; followers: number | null; handle: string | null }> } | null };
  campaign: { id: string; title: string; slug?: string };
  mission: { title: string; rewardPoints: number; productLink: string | null; description?: string | null; deadlineAt?: string | null; productName?: string | null; productDescription?: string | null; productImageUrl?: string | null };
  submission: {
    videoUrl: string | null;
    publicVideoUrl: string | null;
    socialPostUrl: string | null;
    adCode: string | null;
    screenshotUrl: string | null;
    purchaseBillImageUrl: string | null;
    productReviewScreenshotUrl: string | null;
    finalProofNote: string | null;
    rejectReason: string | null;
  } | null;
};

type FinalListResponse = { items: FinalItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

const finalPublishStatusOptions = [
  { value: "", label: "Tất cả trạng thái publish" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

const finalProductOptions = [
  { value: "", label: "Tất cả hình thức nhận sản phẩm" },
  { value: "NO_PRODUCT_REQUIRED", label: "Không yêu cầu sản phẩm" },
  { value: "PRODUCT_REQUIRED", label: "Yêu cầu sản phẩm" }
];

function BrandMissionFinalReviewsTab({ apiBasePath }: { apiBasePath: string }) {
  const [items, setItems] = useState<FinalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<FinalItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("ACTIONS");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      params.set("publishStatus", "PENDING");
      params.set("page", String(targetPage));
      params.set("limit", "20");
      const res = await fetch(`${apiBasePath}/mission-final-reviews?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<FinalListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải danh sách");
      setItems(body.data.items);
      setPagination(body.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/mission-final-reviews/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<FinalItem>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    } finally {
      setDetailLoading(false);
    }
  }

  async function approve(item: FinalItem) {
    setNotice("");
    setError("");
    let reimbursementAmountVnd: number | undefined;
    if (item.productReceiveOption === "PRODUCT_REQUIRED") {
      const raw = window.prompt("Nhập số tiền hoàn lại sản phẩm (VND):", "0")?.trim();
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Số tiền hoàn lại không hợp lệ");
        return;
      }
      reimbursementAmountVnd = Math.floor(parsed);
    }
    try {
      const res = await fetch(`${apiBasePath}/mission-final-reviews/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursementAmountVnd })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt hoàn thành nhiệm vụ và cộng điểm.");
      await load();
      if (selectedId === item.id) await loadDetail(item.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại");
    }
  }

  async function reject(id: string) {
    setNotice("");
    setError("");
    const feedback = window.prompt("Nhập feedback từ chối:", "Nội dung bước cuối chưa đạt")?.trim();
    if (!feedback) return;
    try {
      const res = await fetch(`${apiBasePath}/mission-final-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối bước hoàn thành.");
      await load();
      if (selectedId === id) await loadDetail(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Từ chối thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="dc-input" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          <p className="text-sm text-zinc-500">Tổng {pagination.total} bản ghi</p>
        </div>
      </section>

      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && !error ? (
        <section className="grid gap-4">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có item cần duyệt" description="Không có mission nào cho trạng thái lọc hiện tại." />
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="grid gap-3 xl:grid-cols-[2.4fr_1fr_1.2fr_1.6fr] xl:items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{item.mission.title}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">Chiến dịch: {item.campaign.title}</p>
                      <p className="line-clamp-1 text-sm text-zinc-500">Nhà sáng tạo: {item.account.displayName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{fmtDateOnly(item.publishSubmittedAt)}</p>
                      <p className="text-xs text-zinc-500">Ngày nộp</p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${missionStatusTone(item.publishStatus)}`}>{missionStatusLabel(item.publishStatus)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {item.publishStatus === "PENDING" ? (
                        <button className="dc-btn-primary" onClick={() => void approve(item)}>
                          Duyệt
                        </button>
                      ) : null}
                      <button className="dc-btn-secondary" onClick={() => { setDetailTab("ACTIONS"); void loadDetail(item.id); }}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                  {item.submission?.rejectReason ? <p className="mt-2 text-sm text-red-700 line-clamp-2">Lý do từ chối gần nhất: {item.submission.rejectReason}</p> : null}
                </article>
              ))
            )}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
              <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang trước</button>
              <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
              <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
            </div>
          </div>

          <MissionDetailModal
            open={Boolean(detail) || detailLoading}
            title={detail?.mission.title ?? "Chi tiết nhiệm vụ"}
            subtitle={detail ? `${detail.account.displayName} • ${detail.campaign.title}` : undefined}
            onClose={() => { setSelectedId(""); setDetail(null); setDetailLoading(false); }}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            timelineSteps={buildStaticReviewTimeline("publishReview", detail?.productReceiveOption === "PRODUCT_REQUIRED")}
            campaignNode={<details className="rounded-xl border border-zinc-200 bg-white p-3" open><summary className="cursor-pointer font-semibold text-zinc-900">Thông tin campaign</summary><div className="mt-3 grid gap-1 text-sm text-zinc-600"><p>Tên campaign: <strong className="text-zinc-900">{detail?.campaign.title ?? "-"}</strong></p><p>Đường dẫn campaign: {detail?.campaign.slug ? <Link className="font-semibold text-zinc-900 underline" href={`/campaigns/${detail.campaign.slug}`}>/campaigns/{detail.campaign.slug}</Link> : <strong className="text-zinc-900">-</strong>}</p></div></details>}
            missionNode={<><details className="rounded-xl border border-zinc-200 bg-white p-3" open><summary className="cursor-pointer font-semibold text-zinc-900">Thông tin nhiệm vụ</summary><div className="mt-3 grid gap-2 text-sm text-zinc-700 md:grid-cols-2"><p>Trạng thái luồng: <strong className="text-zinc-900">{detail ? missionStatusLabel(detail.publishStatus) : "-"}</strong></p><p>Trạng thái nhiệm vụ: <strong className="text-zinc-900">{detail ? missionStatusLabel(detail.status) : "-"}</strong></p><p>Đối tượng: <strong className="text-zinc-900">{missionAudienceLabel()}</strong></p><p>Cho phép làm lại: <strong className="text-zinc-900">Không</strong></p><p>Điểm thưởng: <strong className="text-zinc-900">{detail?.mission.rewardPoints?.toLocaleString("vi-VN") ?? "-"} N-Points</strong></p><p>Hạn hoàn thành: <strong className="text-zinc-900">{fmtDate(detail?.mission.deadlineAt ?? null)}</strong></p><p>Yêu cầu sản phẩm: <strong className="text-zinc-900">{productReceiveOptionLabel(detail?.productReceiveOption)}</strong></p><p>Trạng thái sản phẩm: <strong className="text-zinc-900">{mapStatusVi(detail?.reimbursementStatus)}</strong></p></div><p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{detail?.mission.description ?? "-"}</p></details>{detail?.productReceiveOption === "PRODUCT_REQUIRED" ? <ProductInfoCard title={detail?.mission.productName} description={detail?.mission.productDescription} imageUrl={detail?.mission.productImageUrl} link={detail?.mission.productLink} /> : null}<CreatorSocialLinks name={detail?.account.displayName} profile={detail?.account.creatorProfile} /></>}
            historyNode={<div className="space-y-3"><p className="text-sm font-semibold text-zinc-900">Lịch sử các lần đã nộp</p>{(detail?.submission?.purchaseBillImageUrl || detail?.submission?.productReviewScreenshotUrl) ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open><summary className="cursor-pointer font-semibold text-zinc-900">Bước mua sản phẩm</summary><div className="mt-2 space-y-1"><p>Ảnh bill: <UrlValue value={detail?.submission?.purchaseBillImageUrl} label="Tải file ảnh" /></p><p>Ảnh đánh giá: <UrlValue value={detail?.submission?.productReviewScreenshotUrl} label="Tải file ảnh" /></p></div></details> : null}{detail?.submission?.videoUrl ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open><summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp video</summary><div className="mt-2 space-y-1"><p>Video review: <UrlValue value={detail?.submission?.videoUrl} /></p></div></details> : null}{(detail?.publishSubmittedAt || detail?.submission?.publicVideoUrl || detail?.submission?.socialPostUrl) ? <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" open><summary className="cursor-pointer font-semibold text-zinc-900">Bước nộp link social</summary><div className="mt-2 space-y-1"><p>Thời gian nộp: {fmtDate(detail?.publishSubmittedAt ?? null)}</p><p>Link public: <UrlValue value={detail?.submission?.publicVideoUrl ?? detail?.submission?.socialPostUrl} label="Mở liên kết public" /></p><p>Screenshot: <UrlValue value={detail?.submission?.screenshotUrl} label="Tải file ảnh" /></p><p>Mã quảng cáo: {detail?.submission?.adCode ?? "-"}</p><p>Ghi chú: {detail?.submission?.finalProofNote ?? "-"}</p></div></details> : null}</div>}
            actionNode={
              <div className="grid gap-2 text-sm">
                {(detail?.submission?.publicVideoUrl || detail?.submission?.socialPostUrl) ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="font-semibold text-zinc-900">Bước duyệt social public:</p>
                    <p className="mt-2">Link public: <UrlValue value={detail?.submission?.publicVideoUrl ?? detail?.submission?.socialPostUrl} label="Mở liên kết public" /></p>
                    <p>Mã quảng cáo: {detail?.submission?.adCode ?? "-"}</p>
                    <p>Screenshot: <UrlValue value={detail?.submission?.screenshotUrl} label="Tải file ảnh" /></p>
                    <p>Ảnh bill mua hàng: <UrlValue value={detail?.submission?.purchaseBillImageUrl} label="Tải file ảnh" /></p>
                    <p>Ảnh vote 5 sao: <UrlValue value={detail?.submission?.productReviewScreenshotUrl} label="Tải file ảnh" /></p>
                    <p>Ghi chú: {detail?.submission?.finalProofNote ?? "-"}</p>
                  </div>
                ) : null}
                {detail?.submission?.rejectReason ? <p><strong>Lý do từ chối:</strong> {detail.submission.rejectReason}</p> : null}
                {detail?.publishStatus === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void approve(detail)}>Duyệt</button>
                    <button className="dc-btn-secondary" onClick={() => void reject(detail.id)}>Từ chối</button>
                  </div>
                ) : null}
              </div>
            }
          />
        </section>
      ) : null}
    </section>
  );
}

export default function BrandMissionReviewsPage() {
  return (
    <MissionReviewsPage
      pageTitle="Duyệt nhiệm vụ Creator"
      subtitle="Quản lý 4 bước duyệt nhiệm vụ cho các campaign thuộc Brand của bạn."
      apiBasePath="/api/brand/dashboard"
    />
  );
}
