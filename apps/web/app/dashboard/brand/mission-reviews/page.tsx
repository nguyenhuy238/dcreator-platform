"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type TabKey = "transcript-reviews" | "applications" | "video-reviews" | "final-reviews";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "applications", label: "Nhận nhiệm vụ" },
  { key: "transcript-reviews", label: "Duyệt kịch bản" },
  { key: "video-reviews", label: "Duyệt video" },
  { key: "final-reviews", label: "Duyệt hoàn thành" }
];

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export default function BrandMissionReviewsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("applications");

  return (
    <>
      <PageHeader title="Duyệt nhiệm vụ Creator" subtitle="Quản lý 4 bước duyệt nhiệm vụ cho các campaign thuộc Brand của bạn." />

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

      {activeTab === "transcript-reviews" ? <BrandMissionTranscriptReviewsTab /> : null}
      {activeTab === "applications" ? <BrandMissionApplicationsTab /> : null}
      {activeTab === "video-reviews" ? <BrandMissionVideoReviewsTab /> : null}
      {activeTab === "final-reviews" ? <BrandMissionFinalReviewsTab /> : null}
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

function BrandMissionTranscriptReviewsTab() {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<TranscriptItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [campaign, setCampaign] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (status) params.set("status", status);
      if (campaign.trim()) params.set("campaign", campaign.trim());
      params.set("sort", sort);
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`/api/brand/dashboard/mission-transcript-reviews?${params.toString()}`, { cache: "no-store" });
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
      const res = await fetch(`/api/brand/dashboard/mission-transcript-reviews/${id}`, { cache: "no-store" });
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
      const res = await fetch(`/api/brand/dashboard/mission-transcript-reviews/${id}/approve`, { method: "POST" });
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
      const res = await fetch(`/api/brand/dashboard/mission-transcript-reviews/${id}/reject`, {
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
  }, [page, sort]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {transcriptStatusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
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
                const transcript = item.submission?.proofTextNote ?? "";
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
                      <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>Xem chi tiết</button>
                      {statusLabel === "PENDING" ? <button className="dc-btn-primary" onClick={() => void approve(item.id)}>Duyệt</button> : null}
                      {statusLabel === "PENDING" ? <button className="dc-btn-secondary" onClick={() => void reject(item.id)}>Từ chối</button> : null}
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
                <p><strong>Social URL:</strong> {detail.account.creatorProfile?.socialUrl ?? "-"}</p>
                <p><strong>Follower:</strong> {(detail.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Nhiệm vụ:</strong> {detail.mission.title}</p>
                <p><strong>Mô tả nhiệm vụ:</strong> {detail.mission.description}</p>
                <p><strong>Hình thức nhận sản phẩm:</strong> {detail.mission.productReceiveOption}</p>
                <p><strong>Link sản phẩm:</strong> {detail.mission.productLink ?? "-"}</p>
                <p><strong>Deadline:</strong> {fmtDate(detail.mission.deadlineAt)}</p>
                <p><strong>Kịch bản:</strong></p>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 whitespace-pre-wrap">{detail.submission?.proofTextNote ?? "-"}</div>
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

const applicationStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

function BrandMissionApplicationsTab() {
  const [items, setItems] = useState<ApplicationListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [campaign, setCampaign] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (status) params.set("status", status);
      if (campaign.trim()) params.set("campaign", campaign.trim());
      params.set("sort", sort);
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`/api/brand/dashboard/mission-applications?${params.toString()}`, { cache: "no-store" });
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
      const res = await fetch(`/api/brand/dashboard/mission-applications/${id}`, { cache: "no-store" });
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
      const res = await fetch(`/api/brand/dashboard/mission-applications/${id}/approve`, { method: "POST" });
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
      const res = await fetch(`/api/brand/dashboard/mission-applications/${id}/reject`, {
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
  }, [page, sort]);

  const title = useMemo(() => `Tổng ${pagination.total} đơn`, [pagination.total]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {applicationStatusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          <p className="text-sm text-zinc-500">{title}</p>
        </div>
      </section>

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
                  <p className="text-sm">Hình thức nhận sản phẩm: {item.mission.productReceiveOption}</p>
                  <p className="text-xs text-zinc-500 mt-1">Trạng thái: {item.status} · Tạo lúc: {fmtDate(item.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>Chi tiết</button>
                    {item.status === "PENDING_REVIEW" ? <button className="dc-btn-primary" onClick={() => void approve(item.id)}>Đồng ý</button> : null}
                    {item.status === "PENDING_REVIEW" ? <button className="dc-btn-secondary" onClick={() => void reject(item.id)}>Từ chối</button> : null}
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
                <p><strong>Social URL:</strong> {detail.account.creatorProfile?.socialUrl ?? "-"}</p>
                <p><strong>Follower:</strong> {(detail.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Mission:</strong> {detail.mission.title}</p>
                <p><strong>Mô tả:</strong> {detail.mission.description}</p>
                <p><strong>Hình thức nhận sản phẩm:</strong> {detail.mission.productReceiveOption}</p>
                <p><strong>Link sản phẩm:</strong> {detail.mission.productLink ?? "-"}</p>
                <p><strong>Ghi chú creator:</strong> {detail.note ?? "-"}</p>
                <p><strong>Trạng thái:</strong> {detail.status}</p>
                <p><strong>Lý do từ chối:</strong> {detail.rejectReason ?? "-"}</p>
                <p><strong>Duyệt lúc:</strong> {fmtDate(detail.reviewedAt)}</p>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
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

function BrandMissionVideoReviewsTab() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [sort, setSort] = useState("newest");

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      if (status) params.set("videoReviewStatus", status);
      params.set("sort", sort);
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`/api/brand/dashboard/mission-video-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function decide(id: string, action: "approve" | "reject") {
    setNotice("");
    setError("");
    try {
      if (action === "approve") {
        const res = await fetch(`/api/brand/dashboard/mission-video-reviews/${id}/approve`, { method: "POST" });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      } else {
        const feedback = window.prompt("Nhập feedback từ chối:", "Video chưa đạt guideline")?.trim();
        if (!feedback) return;
        const res = await fetch(`/api/brand/dashboard/mission-video-reviews/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback })
        });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      }
      setNotice(action === "approve" ? "Đã duyệt video." : "Đã từ chối video.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page, sort]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {videoStatusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
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
        <section className="grid gap-3">
          {items.length === 0 ? (
            <EmptyState title="Không có video chờ duyệt" description="Không có item nào phù hợp bộ lọc hiện tại." />
          ) : (
            items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName}</p>
                <p className="text-xs text-zinc-500">{item.account.email}</p>
                <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                <p className="text-sm">Mission: {item.mission.title}</p>
                <p className="text-sm">Video URL: {item.submission?.videoUrl ?? "-"}</p>
                <p className="text-sm">Ghi chú creator: {item.submission?.note ?? "-"}</p>
                <p className="text-xs text-zinc-500 mt-1">Nộp lúc: {fmtDate(item.videoSubmittedAt)} · Trạng thái: {item.videoReviewStatus}</p>
                {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700">Lý do từ chối gần nhất: {item.submission.rejectReason}</p> : null}
                <div className="mt-3 flex gap-2">
                  {item.videoReviewStatus === "PENDING" ? <button className="dc-btn-primary" onClick={() => void decide(item.id, "approve")}>Đồng ý video</button> : null}
                  {item.videoReviewStatus === "PENDING" ? <button className="dc-btn-secondary" onClick={() => void decide(item.id, "reject")}>Từ chối video</button> : null}
                </div>
              </article>
            ))
          )}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
            <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang trước</button>
            <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
            <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
          </div>
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
  { value: "CREATOR_BUY_FIRST", label: "Creator tự mua trước" },
  { value: "DEPOSIT_PRODUCT", label: "Đặt cọc sản phẩm" }
];

function BrandMissionFinalReviewsTab() {
  const [items, setItems] = useState<FinalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [publishStatus, setPublishStatus] = useState("PENDING");
  const [productReceiveOption, setProductReceiveOption] = useState("");
  const [sort, setSort] = useState("newest");

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      if (publishStatus) params.set("publishStatus", publishStatus);
      if (productReceiveOption) params.set("productReceiveOption", productReceiveOption);
      params.set("sort", sort);
      params.set("page", String(targetPage));
      params.set("limit", "20");
      const res = await fetch(`/api/brand/dashboard/mission-final-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function approve(item: FinalItem) {
    setNotice("");
    setError("");
    let reimbursementAmountVnd: number | undefined;
    if (item.productReceiveOption === "CREATOR_BUY_FIRST") {
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
      const res = await fetch(`/api/brand/dashboard/mission-final-reviews/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursementAmountVnd })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      setNotice("Đã duyệt hoàn thành nhiệm vụ và cộng điểm.");
      await load();
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
      const res = await fetch(`/api/brand/dashboard/mission-final-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối thất bại");
      setNotice("Đã từ chối bước hoàn thành.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Từ chối thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page, sort]);

  return (
    <section className="mt-4 grid gap-4">
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={publishStatus} onChange={(e) => setPublishStatus(e.target.value)}>
            {finalPublishStatusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select className="dc-input" value={productReceiveOption} onChange={(e) => setProductReceiveOption(e.target.value)}>
            {finalProductOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
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
        <section className="grid gap-3">
          {items.length === 0 ? (
            <EmptyState title="Không có item cần duyệt" description="Không có mission nào cho trạng thái lọc hiện tại." />
          ) : (
            items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName}</p>
                <p className="text-xs text-zinc-500">{item.account.email}</p>
                <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                <p className="text-sm">Mission: {item.mission.title}</p>
                <p className="text-sm">Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                <p className="text-sm">Hình thức nhận sản phẩm: {item.productReceiveOption}</p>
                <p className="text-sm">Link video review đã duyệt: {item.submission?.videoUrl ?? "-"}</p>
                <p className="text-sm">Link video social public: {item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl ?? "-"}</p>
                <p className="text-sm">Mã quảng cáo: {item.submission?.adCode ?? "-"}</p>
                <p className="text-sm">Screenshot bài đăng: {item.submission?.screenshotUrl ?? "-"}</p>
                <p className="text-sm">Ảnh bill mua hàng: {item.submission?.purchaseBillImageUrl ?? "-"}</p>
                <p className="text-sm">Ảnh đánh giá 5 sao: {item.submission?.productReviewScreenshotUrl ?? "-"}</p>
                <p className="text-sm">Ghi chú creator: {item.submission?.finalProofNote ?? "-"}</p>
                <p className="text-sm">Trạng thái hoàn tiền: {item.reimbursementStatus}</p>
                <p className="text-xs text-zinc-500 mt-1">Nộp lúc: {fmtDate(item.publishSubmittedAt)} · Trạng thái publish: {item.publishStatus}</p>
                {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700">Lý do từ chối gần nhất: {item.submission.rejectReason}</p> : null}
                <div className="mt-3 flex gap-2">
                  {item.publishStatus === "PENDING" ? <button className="dc-btn-primary" onClick={() => void approve(item)}>Đồng ý hoàn thành</button> : null}
                  {item.publishStatus === "PENDING" ? <button className="dc-btn-secondary" onClick={() => void reject(item.id)}>Từ chối bước cuối</button> : null}
                </div>
              </article>
            ))
          )}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
            <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang trước</button>
            <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
            <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
