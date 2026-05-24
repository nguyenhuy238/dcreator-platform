"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type HistoryItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  reimbursementStatus: string;
  videoReviewStatus: string;
  publishStatus: string;
  videoSubmittedAt: string | null;
  publishSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  account: { displayName: string; email: string };
  campaign: { title: string };
  mission: { title: string; rewardPoints: number; deadlineAt: string | null; productLink: string | null };
  submission: {
    videoUrl: string | null;
    note: string | null;
    proofTextNote: string | null;
    publicVideoUrl: string | null;
    socialPostUrl: string | null;
    adCode: string | null;
    screenshotUrl: string | null;
    purchaseBillImageUrl: string | null;
    productReviewScreenshotUrl: string | null;
    finalProofNote: string | null;
    rejectReason: string | null;
    fileUploadUrl: string | null;
  } | null;
};

type HistoryListResponse = {
  items: HistoryItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const missionStatusOptions = [
  { value: "", label: "Trạng thái nhiệm vụ: Tất cả" },
  { value: "PRODUCT_PENDING", label: "Chờ sản phẩm" },
  { value: "DRAFT_PENDING", label: "Chờ duyệt kịch bản" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" }
];

const productReceiveOptions = [
  { value: "", label: "Hình thức sản phẩm: Tất cả" },
  { value: "NO_PRODUCT_REQUIRED", label: "Không yêu cầu sản phẩm" },
  { value: "CREATOR_BUY_FIRST", label: "Creator tự mua trước" },
  { value: "DEPOSIT_PRODUCT", label: "Đặt cọc sản phẩm" }
];

const productStatusOptions = [
  { value: "", label: "Trạng thái sản phẩm: Tất cả" },
  { value: "NOT_REQUIRED", label: "Không yêu cầu" },
  { value: "WAITING_DEPOSIT", label: "Chờ đặt cọc" },
  { value: "WAITING_PURCHASE", label: "Chờ mua hàng" },
  { value: "RECEIVED", label: "Đã nhận sản phẩm" }
];

const statusViMap: Record<string, string> = {
  PRODUCT_PENDING: "Chờ sản phẩm",
  DRAFT_PENDING: "Chờ duyệt kịch bản",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  NOT_SUBMITTED: "Chưa nộp",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  NOT_REQUIRED: "Không yêu cầu",
  WAITING_DEPOSIT: "Chờ đặt cọc",
  WAITING_PURCHASE: "Chờ mua hàng",
  RECEIVED: "Đã nhận",
  NO_PRODUCT_REQUIRED: "Không yêu cầu sản phẩm",
  CREATOR_BUY_FIRST: "Creator tự mua trước",
  DEPOSIT_PRODUCT: "Đặt cọc sản phẩm",
  PURCHASE_SUBMITTED: "Đã nộp chứng từ mua",
  PAYOUT_PENDING: "Chờ chi trả",
  PAID: "Đã chi trả"
};

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function statusLabel(value: string | null | undefined) {
  if (!value) return "-";
  return statusViMap[value] ?? value;
}

function toLink(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function LinkValue({ value }: { value: string | null | undefined }) {
  const href = toLink(value);
  if (!href) return <span>-</span>;
  return <a href={href} className="font-semibold text-zinc-900 underline break-all">{value}</a>;
}

export default function BrandMissionHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<HistoryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [status, setStatus] = useState("");
  const [productReceiveOption, setProductReceiveOption] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [page, setPage] = useState(1);

  async function load(pageOverride?: number) {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (campaign.trim()) params.set("campaign", campaign.trim());
      if (status) params.set("status", status);
      if (productReceiveOption) params.set("productReceiveOption", productReceiveOption);
      if (productStatus) params.set("productStatus", productStatus);
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`/api/brand/dashboard/mission-history?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<HistoryListResponse>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải lịch sử nhiệm vụ");
      setItems(body.data.items);
      setPagination(body.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải lịch sử nhiệm vụ");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/brand/dashboard/mission-history/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<HistoryItem>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải chi tiết");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  const summary = useMemo(() => `Tổng ${pagination.total} nhiệm vụ`, [pagination.total]);

  return (
    <>
      <PageHeader title="Lịch sử nhiệm vụ Creator" subtitle="Xem lại toàn bộ Creator Mission đã và đang chạy trong các campaign của Brand." />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input" placeholder="Tìm creator theo tên/email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Tên campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>{missionStatusOptions.map((s) => <option key={s.value || "all-ms"} value={s.value}>{s.label}</option>)}</select>
          <select className="dc-input" value={productReceiveOption} onChange={(e) => setProductReceiveOption(e.target.value)}>{productReceiveOptions.map((s) => <option key={s.value || "all-pro"} value={s.value}>{s.label}</option>)}</select>
          <select className="dc-input" value={productStatus} onChange={(e) => setProductStatus(e.target.value)}>{productStatusOptions.map((s) => <option key={s.value || "all-pst"} value={s.value}>{s.label}</option>)}</select>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="dc-btn-primary" onClick={() => { setPage(1); void load(1); }}>Lọc</button>
          <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          <p className="text-sm text-zinc-500">{summary}</p>
        </div>
      </section>

      {error ? <div className="mt-4"><ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <EmptyState title="Không có dữ liệu" description="Không có nhiệm vụ nào phù hợp bộ lọc hiện tại." />
          ) : (
            items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName}</p>
                <p className="text-xs text-zinc-500">{item.account.email}</p>
                <p className="mt-1 text-sm">Campaign: {item.campaign.title}</p>
                <p className="text-sm">Nhiệm vụ: {item.mission.title}</p>
                <p className="text-sm">Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Nhiệm vụ: {statusLabel(item.status)} · Video: {statusLabel(item.videoReviewStatus)} · Bước cuối: {statusLabel(item.publishStatus)}
                </p>
                <p className="text-xs text-zinc-500">Cập nhật: {fmtDate(item.updatedAt)}</p>
                <div className="mt-3">
                  <button className="dc-btn-secondary" onClick={() => void loadDetail(item.id)}>Xem chi tiết</button>
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

      {selectedId ? (
        <div className="fixed inset-0 z-50 bg-zinc-900/50 p-3 md:p-6" onClick={() => { setSelectedId(""); setDetail(null); }}>
          <div className="mx-auto max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-zinc-900">Chi tiết lịch sử nhiệm vụ</h3>
              <button type="button" className="dc-btn-secondary" onClick={() => { setSelectedId(""); setDetail(null); }}>Đóng</button>
            </div>
            {detailLoading ? <div className="mt-4"><LoadingSkeleton rows={6} /></div> : null}
            {detail && !detailLoading ? (
              <div className="mt-4 grid gap-2 text-sm">
                <p><strong>Creator:</strong> {detail.account.displayName}</p>
                <p><strong>Email:</strong> {detail.account.email}</p>
                <p><strong>Campaign:</strong> {detail.campaign.title}</p>
                <p><strong>Nhiệm vụ:</strong> {detail.mission.title}</p>
                <p><strong>Trạng thái nhiệm vụ:</strong> {statusLabel(detail.status)}</p>
                <p><strong>Hình thức nhận sản phẩm:</strong> {statusLabel(detail.productReceiveOption)}</p>
                <p><strong>Trạng thái sản phẩm:</strong> {statusLabel(detail.productStatus)}</p>
                <p><strong>Trạng thái hoàn tiền:</strong> {statusLabel(detail.reimbursementStatus)}</p>
                <p><strong>Duyệt video:</strong> {statusLabel(detail.videoReviewStatus)}</p>
                <p><strong>Duyệt bước cuối:</strong> {statusLabel(detail.publishStatus)}</p>
                <p><strong>Deadline:</strong> {fmtDate(detail.mission.deadlineAt)}</p>
                <p><strong>Link sản phẩm:</strong> <LinkValue value={detail.mission.productLink} /></p>
                <p><strong>Video review:</strong> <LinkValue value={detail.submission?.videoUrl} /></p>
                <p><strong>Link social public:</strong> <LinkValue value={detail.submission?.publicVideoUrl ?? detail.submission?.socialPostUrl} /></p>
                <p><strong>Screenshot bài đăng:</strong> <LinkValue value={detail.submission?.screenshotUrl} /></p>
                <p><strong>Ảnh bill mua hàng:</strong> <LinkValue value={detail.submission?.purchaseBillImageUrl} /></p>
                <p><strong>Ảnh đánh giá 5 sao:</strong> <LinkValue value={detail.submission?.productReviewScreenshotUrl} /></p>
                <p><strong>File kịch bản:</strong> <LinkValue value={detail.submission?.fileUploadUrl} /></p>
                <p><strong>Mã quảng cáo:</strong> {detail.submission?.adCode ?? "-"}</p>
                <p><strong>Ghi chú video:</strong> {detail.submission?.note ?? "-"}</p>
                <p><strong>Ghi chú bước cuối:</strong> {detail.submission?.finalProofNote ?? "-"}</p>
                <p><strong>Nội dung kịch bản:</strong> {detail.submission?.proofTextNote ?? "-"}</p>
                <p><strong>Lý do từ chối gần nhất:</strong> {detail.submission?.rejectReason ?? "-"}</p>
                <p><strong>Tạo lúc:</strong> {fmtDate(detail.createdAt)}</p>
                <p><strong>Cập nhật lúc:</strong> {fmtDate(detail.updatedAt)}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
