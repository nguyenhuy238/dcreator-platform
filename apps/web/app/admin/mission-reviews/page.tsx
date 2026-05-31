"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };
type TabKey = "transcript-reviews" | "applications" | "video-reviews" | "final-reviews";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "applications", label: "Quản lý nhận nhiệm vụ" },
  { key: "transcript-reviews", label: "Quản lý kịch bản" },
  { key: "video-reviews", label: "Quản lý video" },
  { key: "final-reviews", label: "Quản lý hoàn thành" }
];

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
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

function transcriptPlainText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h3|h4|blockquote)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function AdminMissionReviewsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = tabParam === "transcript-reviews" || tabParam === "video-reviews" || tabParam === "final-reviews" || tabParam === "applications" ? tabParam : "applications";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const nextTab: TabKey = tabParam === "transcript-reviews" || tabParam === "video-reviews" || tabParam === "final-reviews" || tabParam === "applications" ? tabParam : "applications";
    setActiveTab(nextTab);
  }, [tabParam]);

  return (
    <>
      <PageHeader title="Quản lý nhiệm vụ Creator" subtitle="Gộp 4 luồng xử lý: kịch bản, nhận nhiệm vụ, duyệt video và duyệt hoàn thành." />

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

      {activeTab === "transcript-reviews" ? <AdminMissionTranscriptReviewsTab /> : null}
      {activeTab === "applications" ? <AdminMissionApplicationsTab /> : null}
      {activeTab === "video-reviews" ? <AdminMissionVideoReviewsTab /> : null}
      {activeTab === "final-reviews" ? <AdminMissionFinalReviewsTab /> : null}
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
    creatorProfile: { mainPlatform: string | null; socialUrl: string | null; followerCount: number | null; bio?: string | null } | null;
  };
  campaign: { id: string; title: string; slug: string; brandId: string };
  mission: { id: string; title: string; description: string; rewardPoints: number; productReceiveOption: string; productLink: string | null; deadlineAt: string | null };
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

function AdminMissionTranscriptReviewsTab() {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<TranscriptItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogAction, setDialogAction] = useState<null | "approve" | "reject">(null);
  const [dialogTargetId, setDialogTargetId] = useState<string>("");

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

      const res = await fetch(`/api/admin/mission-transcript-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function loadDetail(id: string, options?: { force?: boolean }) {
    if (!options?.force && selectedId === id) {
      setSelectedId("");
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/mission-transcript-reviews/${id}`, { cache: "no-store" });
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
    try {
      const res = await fetch(`/api/admin/mission-transcript-reviews/${id}/approve`, { method: "POST" });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt kịch bản. Creator có thể nộp video review.");
      await load();
      if (selectedId === id) await loadDetail(id, { force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại");
    }
  }

  async function reject(id: string, feedback: string) {
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/admin/mission-transcript-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối kịch bản. Creator có thể nộp lại.");
      await load();
      if (selectedId === id) await loadDetail(id, { force: true });
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
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có kịch bản" description="Không có kịch bản nào phù hợp bộ lọc hiện tại." />
            ) : (
              items.map((item) => {
                const statusLabel = transcriptStatusLabel(item);
                const transcript = transcriptPlainText(item.submission?.proofTextNote ?? "");
                return (
                  <article key={item.id} className={`dc-card p-4 ${selectedId === item.id ? "border-zinc-900" : ""}`}>
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.account.email} · {item.account.creatorProfile?.mainPlatform ?? "-"}</p>
                    <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                    <p className="text-sm">Nhiệm vụ: {item.mission.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">Trạng thái kịch bản: {statusLabel}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-700">{transcript || "Chưa có nội dung kịch bản"}</p>
                    {item.submission?.fileUploadUrl ? (
                      <a
                        href={`/api/uploads/transcript-download?url=${encodeURIComponent(item.submission.fileUploadUrl)}`}
                        className="mt-2 inline-flex text-sm font-semibold text-zinc-900 underline"
                      >
                        Tải file kịch bản
                      </a>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>
                        {selectedId === item.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                      </button>
                      {statusLabel === "PENDING" ? <button className="dc-btn-primary" onClick={() => { setDialogTargetId(item.id); setDialogAction("approve"); }}>Duyệt</button> : null}
                      {statusLabel === "PENDING" ? <button className="dc-btn-secondary" onClick={() => { setDialogTargetId(item.id); setDialogAction("reject"); }}>Từ chối</button> : null}
                    </div>
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

          <aside className="dc-card p-4">
            <h2 className="font-semibold">Chi tiết kịch bản</h2>
            {!selectedId ? <p className="text-sm text-zinc-500 mt-2">Chọn một item để xem chi tiết.</p> : null}
            {detailLoading ? <div className="mt-3"><LoadingSkeleton rows={4} /></div> : null}
            {detail && !detailLoading ? (
              <div className="mt-3 grid gap-2 text-sm">
                <p><strong>Creator:</strong> {detail.account.displayName}</p>
                <p><strong>Email:</strong> {detail.account.email}</p>
                <p><strong>Nền tảng chính:</strong> {detail.account.creatorProfile?.mainPlatform ?? "-"}</p>
                <p><strong>Social URL:</strong> <UrlValue value={detail.account.creatorProfile?.socialUrl} /></p>
                <p><strong>Follower:</strong> {(detail.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Nhiệm vụ:</strong> {detail.mission.title}</p>
                <p><strong>Mô tả nhiệm vụ:</strong> {detail.mission.description}</p>
                <p><strong>Hình thức nhận sản phẩm:</strong> {missionStatusLabel(detail.mission.productReceiveOption)}</p>
                <p><strong>Link sản phẩm:</strong> <UrlValue value={detail.mission.productLink} /></p>
                <p><strong>Deadline:</strong> {fmtDate(detail.mission.deadlineAt)}</p>
                <p><strong>Kịch bản:</strong></p>
                <div
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 prose prose-zinc max-w-none"
                  dangerouslySetInnerHTML={{ __html: detail.submission?.proofTextNote ?? "-" }}
                />
                {detail.submission?.fileUploadUrl ? (
                  <a
                    href={`/api/uploads/transcript-download?url=${encodeURIComponent(detail.submission.fileUploadUrl)}`}
                    className="inline-flex text-sm font-semibold text-zinc-900 underline"
                  >
                    Tải file kịch bản (.txt)
                  </a>
                ) : null}
                <p><strong>Trạng thái:</strong> {transcriptStatusLabel(detail)}</p>
                <p><strong>Lý do từ chối:</strong> {detail.submission?.rejectReason ?? detail.videoReviewFeedback ?? "-"}</p>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
      <ReviewActionDialog
        open={dialogAction === "approve"}
        title="Duyệt kịch bản"
        description="Kịch bản sẽ chuyển sang approved."
        confirmLabel="Duyệt"
        onCancel={() => setDialogAction(null)}
        onConfirm={() => {
          setDialogAction(null);
          void approve(dialogTargetId);
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "reject"}
        title="Từ chối kịch bản"
        description="Bắt buộc nhập lý do từ chối."
        confirmLabel="Từ chối"
        requireReason
        onCancel={() => setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void reject(dialogTargetId, reason ?? "");
        }}
      />
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
    creatorProfile: { mainPlatform: string | null; socialUrl: string | null; followerCount: number | null } | null;
  };
  campaign: { id: string; title: string; slug: string };
  mission: { id: string; title: string; rewardPoints: number; productReceiveOption: string; productLink: string | null };
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
  const map: Record<string, string> = {
    COMPLETED: "Hoàn thành",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    PENDING: "Chờ duyệt",
    IN_PROGRESS: "Đang thực hiện",
    PRODUCT_REQUIRED: "Yêu cầu sản phẩm",
    NO_PRODUCT_REQUIRED: "Không yêu cầu sản phẩm"
  };
  return map[status] ?? status;
}

function AdminMissionApplicationsTab() {
  const [items, setItems] = useState<ApplicationListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyCreator, setHistoryCreator] = useState<{ id: string; displayName: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<CompletedMissionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [dialogAction, setDialogAction] = useState<null | "approve" | "reject">(null);
  const [dialogTargetId, setDialogTargetId] = useState<string>("");

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

      const res = await fetch(`/api/admin/mission-applications?${params.toString()}`, { cache: "no-store" });
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

  async function loadDetail(id: string, options?: { force?: boolean }) {
    if (!options?.force && selectedId === id) {
      setSelectedId("");
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/mission-applications/${id}`, { cache: "no-store" });
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
    try {
      const res = await fetch(`/api/admin/mission-applications/${id}/approve`, { method: "POST" });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt đơn xin nhiệm vụ.");
      await load();
      if (selectedId === id) await loadDetail(id, { force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại");
    }
  }

  async function reject(id: string, rejectReason: string) {
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/admin/mission-applications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectReason })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối đơn xin nhiệm vụ.");
      await load();
      if (selectedId === id) await loadDetail(id, { force: true });
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
      const res = await fetch(`/api/admin/mission-history?${params.toString()}`, { cache: "no-store" });
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
        <div className="fixed inset-0 z-50 bg-zinc-900/50 p-3 md:p-6" onClick={() => { setHistoryCreator(null); setHistoryItems([]); setHistoryError(""); }}>
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
                      <p><strong>Campaign:</strong> {history.campaign.title}</p>
                      <p><strong>Mission:</strong> {history.mission.title}</p>
                      <p><strong>Reward:</strong> {history.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
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
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có đơn" description="Không có đơn nào phù hợp bộ lọc hiện tại." />
            ) : (
              items.map((item) => (
                <article key={item.id} className={`dc-card p-4 ${selectedId === item.id ? "border-zinc-900" : ""}`}>
                  <p className="font-semibold">{item.account.displayName}</p>
                  <p className="text-xs text-zinc-500">{item.account.email} · {item.account.creatorProfile?.mainPlatform ?? "-"}</p>
                  <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                  <p className="text-sm">Mission: {item.mission.title}</p>
                  <p className="text-sm">Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                  <p className="text-sm">Hình thức nhận sản phẩm: {missionStatusLabel(item.mission.productReceiveOption)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Trạng thái: {item.status} · Tạo lúc: {fmtDate(item.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>
                      {selectedId === item.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                    </button>
                    <button className="dc-btn-secondary" onClick={() => void loadCompletedHistory(item.account.id, item.account.displayName)}>
                      Lịch sử Creator
                    </button>
                    {item.status === "PENDING_REVIEW" ? <button className="dc-btn-primary" onClick={() => { setDialogTargetId(item.id); setDialogAction("approve"); }}>Đồng ý</button> : null}
                    {item.status === "PENDING_REVIEW" ? <button className="dc-btn-secondary" onClick={() => { setDialogTargetId(item.id); setDialogAction("reject"); }}>Từ chối</button> : null}
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

          <aside className="dc-card p-4">
            <h2 className="font-semibold">Chi tiết đơn</h2>
            {!selectedId ? <p className="text-sm text-zinc-500 mt-2">Chọn một đơn để xem chi tiết.</p> : null}
            {detailLoading ? <div className="mt-3"><LoadingSkeleton rows={3} /></div> : null}
            {detail && !detailLoading ? (
              <div className="mt-3 grid gap-2 text-sm">
                <p><strong>Creator:</strong> {detail.account.displayName}</p>
                <p><strong>Email:</strong> {detail.account.email}</p>
                <p><strong>Nền tảng chính:</strong> {detail.account.creatorProfile?.mainPlatform ?? "-"}</p>
                <p><strong>Social URL:</strong> <UrlValue value={detail.account.creatorProfile?.socialUrl} /></p>
                <p><strong>Follower:</strong> {(detail.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Mission:</strong> {detail.mission.title}</p>
                <p><strong>Mô tả:</strong> {detail.mission.description}</p>
                <p><strong>Hình thức nhận sản phẩm:</strong> {missionStatusLabel(detail.mission.productReceiveOption)}</p>
                <p><strong>Link sản phẩm:</strong> <UrlValue value={detail.mission.productLink} /></p>
                <p><strong>Ghi chú creator:</strong> {detail.note ?? "-"}</p>
                <p><strong>Trạng thái:</strong> {detail.status}</p>
                <p><strong>Lý do từ chối:</strong> {detail.rejectReason ?? "-"}</p>
                <p><strong>Duyệt lúc:</strong> {fmtDate(detail.reviewedAt)}</p>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
      <ReviewActionDialog
        open={dialogAction === "approve"}
        title="Duyệt đơn nhận nhiệm vụ"
        description="Đơn sẽ chuyển sang trạng thái đã duyệt."
        confirmLabel="Duyệt"
        onCancel={() => setDialogAction(null)}
        onConfirm={() => {
          setDialogAction(null);
          void approve(dialogTargetId);
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "reject"}
        title="Từ chối đơn nhận nhiệm vụ"
        description="Bắt buộc nhập lý do từ chối."
        confirmLabel="Từ chối"
        requireReason
        onCancel={() => setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void reject(dialogTargetId, reason ?? "");
        }}
      />
    </section>
  );
}

type VideoItem = {
  id: string;
  videoReviewStatus: string;
  videoSubmittedAt: string | null;
  account: { displayName: string; email: string };
  campaign: { id: string; title: string };
  mission: { title: string };
  submission: { videoUrl: string | null; note: string | null; rejectReason: string | null } | null;
};

type VideoListResponse = { items: VideoItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

const videoStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

function AdminMissionVideoReviewsTab() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<VideoItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogAction, setDialogAction] = useState<null | "approve" | "reject">(null);
  const [dialogTargetId, setDialogTargetId] = useState<string>("");
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

      const res = await fetch(`/api/admin/mission-video-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function loadDetail(id: string, options?: { force?: boolean }) {
    if (!options?.force && selectedId === id) {
      setSelectedId("");
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/mission-video-reviews/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<VideoItem>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    } finally {
      setDetailLoading(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject", feedback?: string) {
    setNotice("");
    setError("");
    try {
      if (action === "approve") {
        const res = await fetch(`/api/admin/mission-video-reviews/${id}/approve`, { method: "POST" });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      } else {
        const res = await fetch(`/api/admin/mission-video-reviews/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback })
        });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      }
      setNotice(action === "approve" ? "Đã duyệt video." : "Đã từ chối video.");
      await load();
      if (selectedId === id) await loadDetail(id, { force: true });
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
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có video chờ duyệt" description="Không có item nào phù hợp bộ lọc hiện tại." />
            ) : (
              items.map((item) => (
                <article key={item.id} className={`dc-card p-4 ${selectedId === item.id ? "border-zinc-900" : ""}`}>
                  <p className="font-semibold">{item.account.displayName}</p>
                  <p className="text-xs text-zinc-500">{item.account.email}</p>
                  <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                  <p className="text-sm">Nhiệm vụ: {item.mission.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">Nộp lúc: {fmtDate(item.videoSubmittedAt)} · Trạng thái: {item.videoReviewStatus}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{item.submission?.note || "Không có ghi chú từ Creator"}</p>
                  {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700 line-clamp-2">Lý do từ chối gần nhất: {item.submission.rejectReason}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>
                      {selectedId === item.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                    </button>
                    {item.videoReviewStatus === "PENDING" ? <button className="dc-btn-primary" onClick={() => { setDialogTargetId(item.id); setDialogAction("approve"); }}>Đồng ý video</button> : null}
                    {item.videoReviewStatus === "PENDING" ? <button className="dc-btn-secondary" onClick={() => { setDialogTargetId(item.id); setDialogAction("reject"); }}>Từ chối video</button> : null}
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

          <aside className="dc-card p-4">
            <h2 className="font-semibold">Chi tiết video review</h2>
            {!selectedId ? <p className="mt-2 text-sm text-zinc-500">Chọn một item để xem chi tiết.</p> : null}
            {detailLoading ? <div className="mt-3"><LoadingSkeleton rows={4} /></div> : null}
            {detail && !detailLoading ? (
              <div className="mt-3 grid gap-2 text-sm">
                <p><strong>Creator:</strong> {detail.account.displayName}</p>
                <p><strong>Email:</strong> {detail.account.email}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Nhiệm vụ:</strong> {detail.mission.title}</p>
                <p><strong>Video URL:</strong> <UrlValue value={detail.submission?.videoUrl} /></p>
                <p><strong>Ghi chú creator:</strong> {detail.submission?.note ?? "-"}</p>
                <p><strong>Trạng thái:</strong> {detail.videoReviewStatus}</p>
                <p><strong>Nộp lúc:</strong> {fmtDate(detail.videoSubmittedAt)}</p>
                <p><strong>Lý do từ chối:</strong> {detail.submission?.rejectReason ?? "-"}</p>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
      <ReviewActionDialog
        open={dialogAction === "approve"}
        title="Duyệt video proof"
        description="Video sẽ chuyển sang trạng thái approved."
        confirmLabel="Duyệt"
        onCancel={() => setDialogAction(null)}
        onConfirm={() => {
          setDialogAction(null);
          void decide(dialogTargetId, "approve");
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "reject"}
        title="Từ chối video proof"
        description="Bắt buộc nhập feedback từ chối."
        confirmLabel="Từ chối"
        requireReason
        reasonPlaceholder="Video chưa đạt guideline..."
        onCancel={() => setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void decide(dialogTargetId, "reject", reason);
        }}
      />
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
  account: { displayName: string; email: string };
  campaign: { id: string; title: string };
  mission: { title: string; rewardPoints: number; productLink: string | null };
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

function AdminMissionFinalReviewsTab() {
  const [items, setItems] = useState<FinalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<FinalItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [dialogRejectTargetId, setDialogRejectTargetId] = useState<string>("");

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
      const res = await fetch(`/api/admin/mission-final-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function loadDetail(id: string, options?: { force?: boolean }) {
    if (!options?.force && selectedId === id) {
      setSelectedId("");
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/mission-final-reviews/${id}`, { cache: "no-store" });
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
      const res = await fetch(`/api/admin/mission-final-reviews/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursementAmountVnd })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt hoàn thành nhiệm vụ và cộng điểm.");
      await load();
      if (selectedId === item.id) await loadDetail(item.id, { force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại");
    }
  }

  async function reject(id: string, feedback: string) {
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/admin/mission-final-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối bước hoàn thành.");
      await load();
      if (selectedId === id) await loadDetail(id, { force: true });
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
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            {items.length === 0 ? (
              <EmptyState title="Không có item cần duyệt" description="Không có mission nào cho trạng thái lọc hiện tại." />
            ) : (
              items.map((item) => (
                <article key={item.id} className={`dc-card p-4 ${selectedId === item.id ? "border-zinc-900" : ""}`}>
                  <p className="font-semibold">{item.account.displayName}</p>
                  <p className="text-xs text-zinc-500">{item.account.email}</p>
                  <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                  <p className="text-sm">Nhiệm vụ: {item.mission.title}</p>
                  <p className="text-sm">Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                  <p className="text-sm">Hình thức nhận sản phẩm: {missionStatusLabel(item.productReceiveOption)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Nộp lúc: {fmtDate(item.publishSubmittedAt)} · Trạng thái publish: {item.publishStatus}</p>
                  {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700 line-clamp-2">Lý do từ chối gần nhất: {item.submission.rejectReason}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>
                      {selectedId === item.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                    </button>
                    {item.publishStatus === "PENDING" ? <button className="dc-btn-primary" onClick={() => void approve(item)}>Đồng ý hoàn thành</button> : null}
                    {item.publishStatus === "PENDING" ? <button className="dc-btn-secondary" onClick={() => setDialogRejectTargetId(item.id)}>Từ chối bước cuối</button> : null}
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

          <aside className="dc-card p-4">
            <h2 className="font-semibold">Chi tiết duyệt hoàn thành</h2>
            {!selectedId ? <p className="mt-2 text-sm text-zinc-500">Chọn một item để xem chi tiết.</p> : null}
            {detailLoading ? <div className="mt-3"><LoadingSkeleton rows={5} /></div> : null}
            {detail && !detailLoading ? (
              <div className="mt-3 grid gap-2 text-sm">
                <p><strong>Creator:</strong> {detail.account.displayName}</p>
                <p><strong>Email:</strong> {detail.account.email}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Nhiệm vụ:</strong> {detail.mission.title}</p>
                <p><strong>Reward:</strong> {detail.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                <p><strong>Hình thức nhận sản phẩm:</strong> {missionStatusLabel(detail.productReceiveOption)}</p>
                <p><strong>Trạng thái hoàn tiền:</strong> {detail.reimbursementStatus}</p>
                <p><strong>Video review đã duyệt:</strong> <UrlValue value={detail.submission?.videoUrl} /></p>
                <p><strong>Link video social public:</strong> <UrlValue value={detail.submission?.publicVideoUrl ?? detail.submission?.socialPostUrl} /></p>
                <p><strong>Mã quảng cáo:</strong> {detail.submission?.adCode ?? "-"}</p>
                <p><strong>Screenshot bài đăng:</strong> <UrlValue value={detail.submission?.screenshotUrl} /></p>
                <p><strong>Ảnh bill mua hàng:</strong> <UrlValue value={detail.submission?.purchaseBillImageUrl} /></p>
                <p><strong>Ảnh đánh giá 5 sao:</strong> <UrlValue value={detail.submission?.productReviewScreenshotUrl} /></p>
                <p><strong>Ghi chú creator:</strong> {detail.submission?.finalProofNote ?? "-"}</p>
                <p><strong>Trạng thái publish:</strong> {detail.publishStatus}</p>
                <p><strong>Nộp lúc:</strong> {fmtDate(detail.publishSubmittedAt)}</p>
                <p><strong>Lý do từ chối:</strong> {detail.submission?.rejectReason ?? "-"}</p>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
      <ReviewActionDialog
        open={Boolean(dialogRejectTargetId)}
        title="Từ chối bước hoàn thành"
        description="Bắt buộc nhập feedback từ chối."
        confirmLabel="Từ chối"
        requireReason
        reasonPlaceholder="Nội dung bước cuối chưa đạt..."
        onCancel={() => setDialogRejectTargetId("")}
        onConfirm={(reason) => {
          const targetId = dialogRejectTargetId;
          setDialogRejectTargetId("");
          void reject(targetId, reason ?? "");
        }}
      />
    </section>
  );
}
