"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type ListItem = {
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

type Detail = ListItem & {
  mission: ListItem["mission"] & { description: string; deadlineAt: string | null };
};

type ListResponse = {
  items: ListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminMissionApplicationsPage() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<Detail | null>(null);
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

      const res = await fetch(`/api/admin/mission-applications?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ListResponse>;
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
      const res = await fetch(`/api/admin/mission-applications/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
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
      const res = await fetch(`/api/admin/mission-applications/${id}/approve`, { method: "POST" });
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
      const res = await fetch(`/api/admin/mission-applications/${id}/reject`, {
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
    <>
      <PageHeader
        title="Duyệt nhận nhiệm vụ"
        subtitle="Duyệt đơn creator xin làm nhiệm vụ trước khi tạo Creator Mission."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <p className="text-sm text-zinc-500">{title}</p>
        </div>
      </section>

      {notice ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <div className="mt-4"><ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
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
    </>
  );
}
