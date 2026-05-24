"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type Item = {
  id: string;
  videoReviewStatus: string;
  videoSubmittedAt: string | null;
  account: { displayName: string; email: string };
  campaign: { id: string; title: string };
  mission: { title: string };
  submission: { videoUrl: string | null; note: string | null; rejectReason: string | null } | null;
};

type ListResponse = { items: Item[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminMissionVideoReviewsPage() {
  const [items, setItems] = useState<Item[]>([]);
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

      const res = await fetch(`/api/admin/mission-video-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function decide(id: string, action: "approve" | "reject") {
    setNotice("");
    setError("");
    try {
      if (action === "approve") {
        const res = await fetch(`/api/admin/mission-video-reviews/${id}/approve`, { method: "POST" });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt thất bại");
      } else {
        const feedback = window.prompt("Nhập feedback từ chối:", "Video chưa đạt guideline")?.trim();
        if (!feedback) return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, [page, sort]);

  return (
    <>
      <PageHeader
        title="Kiểm duyệt video"
        subtitle="Duyệt video review của creator trước khi cho phép nộp bước social public."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <p className="text-sm text-zinc-500">Tổng {pagination.total} bản ghi</p>
        </div>
      </section>

      {notice ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <div className="mt-4"><ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4 grid gap-3">
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
    </>
  );
}
