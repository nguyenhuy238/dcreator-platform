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

const publishStatusOptions = [
  { value: "", label: "Tất cả trạng thái publish" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" }
];

const productOptions = [
  { value: "", label: "Tất cả hình thức nhận sản phẩm" },
  { value: "NO_PRODUCT_REQUIRED", label: "Không yêu cầu sản phẩm" },
  { value: "CREATOR_BUY_FIRST", label: "Creator tự mua trước" },
  { value: "DEPOSIT_PRODUCT", label: "Đặt cọc sản phẩm" }
];

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
      const res = await fetch(`/api/admin/mission-final-reviews?${params.toString()}`, { cache: "no-store" });
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

  async function approve(item: Item) {
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
      const res = await fetch(`/api/admin/mission-final-reviews/${item.id}/approve`, {
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
      const res = await fetch(`/api/admin/mission-final-reviews/${id}/reject`, {
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
    <>
      <PageHeader
        title="Kiểm duyệt hoàn thành"
        subtitle="Duyệt bước cuối sau khi creator nộp link video social public, mã quảng cáo và bằng chứng liên quan."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <input className="dc-input md:col-span-2" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={publishStatus} onChange={(e) => setPublishStatus(e.target.value)}>
            {publishStatusOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select className="dc-input" value={productReceiveOption} onChange={(e) => setProductReceiveOption(e.target.value)}>
            {productOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
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
    </>
  );
}
