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
  const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [sort, setSort] = useState("newest");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaignId.trim()) params.set("campaignId", campaignId.trim());
      if (status) params.set("videoReviewStatus", status);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/mission-video-reviews?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<ListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Khong the tai danh sach");
      setItems(body.data.items);
      setPagination(body.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the tai danh sach");
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
        if (!res.ok || !body.success) throw new Error(body.error ?? "Duyet that bai");
      } else {
        const feedback = window.prompt("Nhap feedback tu choi:", "Video chua dat guideline")?.trim();
        if (!feedback) return;
        const res = await fetch(`/api/admin/mission-video-reviews/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback })
        });
        const body = (await res.json()) as ApiResult<unknown>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Tu choi that bai");
      }
      setNotice(action === "approve" ? "Da duyet video." : "Da tu choi video.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tac that bai");
    }
  }

  useEffect(() => {
    void load();
  }, [page, sort]);

  return (
    <>
      <PageHeader
        title="Kiem duyet video"
        subtitle="Duyet video review cua creator truoc khi cho phep nop buoc social public."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Lam moi</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input md:col-span-2" placeholder="Tim creator theo ten/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tat ca</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Moi nhat</option>
            <option value="oldest">Cu nhat</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(); }}>Loc</button>
          <p className="text-sm text-zinc-500">Tong {pagination.total} ban ghi</p>
        </div>
      </section>

      {notice ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <div className="mt-4"><ErrorState title="Co loi" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <EmptyState title="Khong co video cho duyet" description="Khong co item nao phu hop bo loc hien tai." />
          ) : (
            items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName}</p>
                <p className="text-xs text-zinc-500">{item.account.email}</p>
                <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                <p className="text-sm">Mission: {item.mission.title}</p>
                <p className="text-sm">Video URL: {item.submission?.videoUrl ?? "-"}</p>
                <p className="text-sm">Note: {item.submission?.note ?? "-"}</p>
                <p className="text-xs text-zinc-500 mt-1">Submitted: {fmtDate(item.videoSubmittedAt)} · Status: {item.videoReviewStatus}</p>
                {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700">Reject: {item.submission.rejectReason}</p> : null}
                <div className="mt-3 flex gap-2">
                  {item.videoReviewStatus === "PENDING" ? <button className="dc-btn-primary" onClick={() => void decide(item.id, "approve")}>Dong y video</button> : null}
                  {item.videoReviewStatus === "PENDING" ? <button className="dc-btn-secondary" onClick={() => void decide(item.id, "reject")}>Tu choi video</button> : null}
                </div>
              </article>
            ))
          )}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
            <button className="dc-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Trang truoc</button>
            <p className="text-sm text-zinc-500">Trang {pagination.page}/{pagination.totalPages}</p>
            <button className="dc-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((x) => Math.min(pagination.totalPages, x + 1))}>Trang sau</button>
          </div>
        </section>
      ) : null}
    </>
  );
}
