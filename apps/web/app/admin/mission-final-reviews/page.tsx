"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type Item = {
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

type ListResponse = { items: Item[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminMissionFinalReviewsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [publishStatus, setPublishStatus] = useState("PENDING");
  const [productReceiveOption, setProductReceiveOption] = useState("");
  const [sort, setSort] = useState("newest");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaignId.trim()) params.set("campaignId", campaignId.trim());
      if (publishStatus) params.set("publishStatus", publishStatus);
      if (productReceiveOption) params.set("productReceiveOption", productReceiveOption);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await fetch(`/api/admin/mission-final-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function approve(item: Item) {
    setNotice("");
    setError("");
    let reimbursementAmountVnd: number | undefined;
    if (item.productReceiveOption === "CREATOR_BUY_FIRST") {
      const raw = window.prompt("Nhap so tien hoan lai san pham (VND):", "0")?.trim();
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("So tien hoan lai khong hop le");
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
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyet that bai");
      setNotice("Da duyet hoan thanh nhiem vu va cong diem.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyet that bai");
    }
  }

  async function reject(id: string) {
    setNotice("");
    setError("");
    const feedback = window.prompt("Nhap feedback tu choi:", "Noi dung buoc cuoi chua dat")?.trim();
    if (!feedback) return;
    try {
      const res = await fetch(`/api/admin/mission-final-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tu choi that bai");
      setNotice("Da tu choi buoc hoan thanh.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tu choi that bai");
    }
  }

  useEffect(() => {
    void load();
  }, [page, sort]);

  return (
    <>
      <PageHeader
        title="Kiem duyet hoan thanh"
        subtitle="Duyet buoc cuoi sau khi creator nop link social public, ma quang cao va bang chung lien quan."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Lam moi</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <input className="dc-input md:col-span-2" placeholder="Tim creator theo ten/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <select className="dc-input" value={publishStatus} onChange={(e) => setPublishStatus(e.target.value)}>
            <option value="">Tat ca publish status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select className="dc-input" value={productReceiveOption} onChange={(e) => setProductReceiveOption(e.target.value)}>
            <option value="">Tat ca product option</option>
            <option value="NO_PRODUCT_REQUIRED">NO_PRODUCT_REQUIRED</option>
            <option value="CREATOR_BUY_FIRST">CREATOR_BUY_FIRST</option>
            <option value="DEPOSIT_PRODUCT">DEPOSIT_PRODUCT</option>
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
            <EmptyState title="Khong co item can duyet" description="Khong co mission nao cho trang thai loc hien tai." />
          ) : (
            items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName}</p>
                <p className="text-xs text-zinc-500">{item.account.email}</p>
                <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                <p className="text-sm">Mission: {item.mission.title}</p>
                <p className="text-sm">Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                <p className="text-sm">Option: {item.productReceiveOption}</p>
                <p className="text-sm">Video review URL: {item.submission?.videoUrl ?? "-"}</p>
                <p className="text-sm">Public video/social URL: {item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl ?? "-"}</p>
                <p className="text-sm">Ad code: {item.submission?.adCode ?? "-"}</p>
                <p className="text-sm">Screenshot: {item.submission?.screenshotUrl ?? "-"}</p>
                <p className="text-sm">Bill mua hang: {item.submission?.purchaseBillImageUrl ?? "-"}</p>
                <p className="text-sm">Anh danh gia 5 sao: {item.submission?.productReviewScreenshotUrl ?? "-"}</p>
                <p className="text-sm">Ghi chu: {item.submission?.finalProofNote ?? "-"}</p>
                <p className="text-sm">Trang thai hoan tien: {item.reimbursementStatus}</p>
                <p className="text-xs text-zinc-500 mt-1">Submitted: {fmtDate(item.publishSubmittedAt)} · Publish status: {item.publishStatus}</p>
                {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700">Reject gan nhat: {item.submission.rejectReason}</p> : null}
                <div className="mt-3 flex gap-2">
                  {item.publishStatus === "PENDING" ? <button className="dc-btn-primary" onClick={() => void approve(item)}>Dong y hoan thanh</button> : null}
                  {item.publishStatus === "PENDING" ? <button className="dc-btn-secondary" onClick={() => void reject(item.id)}>Tu choi buoc cuoi</button> : null}
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
