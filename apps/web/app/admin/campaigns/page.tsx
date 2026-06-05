"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ClickableUrl, LinkifiedText } from "@/app/components/dcreator/ui/clickable-url";
import { parseCampaignRequestContent, type CampaignRequestLink } from "./_lib/parseCampaignRequestContent";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CampaignItem = { id: string; slug: string; title: string; brief: string; status: string; statusView?: string; budgetVnd: number; targetAmountVnd: number; fundedAmountVnd: number; brand: { displayName: string; email: string }; endsAt?: string | null };
type CampaignRequestItem = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  status: "PENDING_REVIEW" | "NEEDS_REVISION" | "APPROVED" | "REJECTED";
  setupSource: string;
  objective: string | null;
  priorityChannels: string | null;
  missionTypes: string | null;
  campaignType: string;
  category: string;
  startsAt: string | null;
  endsAt: string | null;
  adminNote: string | null;
  brandFeedback: string | null;
  updatedAt: string;
  brand: { id: string; name: string | null; ownerAccountId: string; contactEmail: string | null };
  createdCampaign: { id: string; slug: string; title: string; status: string } | null;
};

const tabs = [
  { key: "", label: "Tất cả" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "ACTIVE", label: "Đang chạy" },
  { key: "PAUSED", label: "Tạm dừng" },
  { key: "EXPIRING", label: "Sắp hết hạn" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "AUDIT", label: "Chờ đối soát" },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "RISK", label: "Có rủi ro" }
];

const requestStatusLabelMap: Record<string, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  pending_review: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  approved: "Đã duyệt",
  REJECTED: "Từ chối",
  rejected: "Từ chối",
  NEEDS_REVISION: "Cần bổ sung",
  needs_revision: "Cần bổ sung",
  need_more_info: "Cần bổ sung",
  PROCESSED: "Đã tạo campaign",
  processed: "Đã tạo campaign",
  CREATED: "Đã tạo campaign",
  created: "Đã tạo campaign",
  DRAFT: "Nháp",
  draft: "Nháp"
};

function getRequestStatusLabel(status: string) {
  return requestStatusLabelMap[status] ?? "Không xác định";
}

function getRequestStatusClass(status: string) {
  if (status === "APPROVED" || status === "PROCESSED" || status === "CREATED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "NEEDS_REVISION") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";
  return date.toLocaleString("vi-VN");
}

function FileLinkCard({ link }: { link: CampaignRequestLink }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{link.label}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{link.url}</p>
        </div>
        <ClickableUrl url={link.url} label={link.type === "file" ? "Mở file" : "Mở link"} className="dc-btn-secondary shrink-0" />
      </div>
    </div>
  );
}

export default function AdminCampaignsPage() {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [requestItems, setRequestItems] = useState<CampaignRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"REQUESTS" | "CAMPAIGNS">("REQUESTS");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState(false);
  const [requestAction, setRequestAction] = useState<{ id: string; decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" } | null>(null);
  const [action, setAction] = useState<{ type: "pause" | "resume" | "audit" | "force-close" | "mark-completed" | "delete"; id: string } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CampaignRequestItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status && !["EXPIRING", "AUDIT", "RISK"].includes(status)) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/campaigns?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignItem[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không tải được campaigns");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được campaigns");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  const loadCampaignRequests = useCallback(async () => {
    setLoadingRequests(true);
    setRequestError("");
    try {
      const res = await fetch("/api/admin/dashboard/campaign-reviews", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignRequestItem[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không tải được yêu cầu tạo campaign");
      setRequestItems(body.data);
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : "Không tải được yêu cầu tạo campaign");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadCampaignRequests(); }, [loadCampaignRequests]);

  const filtered = useMemo(() => {
    if (status === "EXPIRING") {
      const now = Date.now();
      const in3Days = now + 3 * 24 * 60 * 60 * 1000;
      return items.filter((i) => i.endsAt && new Date(i.endsAt).getTime() <= in3Days);
    }
    if (status === "RISK") return items.filter((i) => i.fundedAmountVnd > i.targetAmountVnd * 2);
    if (status === "AUDIT") return items.filter((i) => (i.statusView ?? i.status) === "COMPLETED");
    return items;
  }, [items, status]);

  const requestStats = useMemo(() => {
    const pending = requestItems.filter((item) => item.status === "PENDING_REVIEW").length;
    const revision = requestItems.filter((item) => item.status === "NEEDS_REVISION").length;
    const done = requestItems.filter((item) => item.status === "APPROVED" || item.status === "REJECTED").length;
    return { pending, revision, done };
  }, [requestItems]);

  return (
    <>
      <PageHeader
        title="Quản lý Campaign / Job"
        subtitle="Theo dõi vận hành campaign, can thiệp trạng thái và đối soát."
        action={(
          <div className="flex gap-2">
            <Link className="dc-btn-primary" href="/admin/campaigns/create">Tạo campaign</Link>
            <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          </div>
        )}
      />
      <section className="dc-card p-4 grid gap-3">
        <div className="flex flex-wrap gap-2">
          <button className={viewMode === "REQUESTS" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setViewMode("REQUESTS")}>
            Yêu cầu tạo campaign
          </button>
          <button className={viewMode === "CAMPAIGNS" ? "dc-btn-primary" : "dc-btn-secondary"} onClick={() => setViewMode("CAMPAIGNS")}>
            Quản lý campaign
          </button>
        </div>
        <div className="text-sm text-zinc-600">
          {viewMode === "REQUESTS"
            ? `Chờ duyệt: ${requestStats.pending} • Cần bổ sung: ${requestStats.revision} • Đã xử lý: ${requestStats.done}`
            : "Bộ lọc trạng thái và tìm kiếm campaign vận hành"}
        </div>
      </section>
      {viewMode === "CAMPAIGNS" ? (
        <section className="dc-card mt-4 p-4 grid gap-3">
          <AdminTabs items={tabs} value={status} onChange={setStatus} />
          <div className="flex gap-2">
            <input className="dc-input" placeholder="Tìm campaign/brand" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
          </div>
        </section>
      ) : null}
      {viewMode === "REQUESTS" ? (
        <section className="dc-card mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-zinc-900">Yêu cầu tạo campaign từ Brand</p>
              <p className="text-sm text-zinc-500">Danh sách Brand đang chờ Admin tạo campaign trên hệ thống.</p>
            </div>
            <button className="dc-btn-secondary" onClick={() => void loadCampaignRequests()}>Làm mới yêu cầu</button>
          </div>
          {loadingRequests ? <div className="mt-3"><LoadingSkeleton rows={2} /></div> : null}
          {requestError ? <div className="mt-3"><ErrorState title="Không tải được yêu cầu tạo campaign" description={requestError} onRetry={() => void loadCampaignRequests()} /></div> : null}
          {!loadingRequests && !requestError ? (
            requestItems.length === 0 ? <div className="mt-3"><EmptyState title="Không có yêu cầu chờ duyệt" description="Hiện chưa có Brand nào gửi yêu cầu tạo campaign mới." /></div> : (
              <div className="mt-3 grid gap-3">
                {requestItems.map((request) => (
                  <article key={request.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">{request.title}</p>
                        <p className="text-sm text-zinc-600">/{request.requestedSlug} • {request.brand.name ?? "Brand chưa đặt tên"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRequestStatusClass(request.status)}`}>
                        {getRequestStatusLabel(request.status)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{request.brief}</p>
                    {request.adminNote ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Admin note: {request.adminNote}</p> : null}
                    {request.brandFeedback ? <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">Phản hồi Brand: {request.brandFeedback}</p> : null}
                    {request.createdCampaign ? (
                      <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Campaign đã tạo: {request.createdCampaign.title} /{request.createdCampaign.slug}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-zinc-500">Cập nhật: {new Date(request.updatedAt).toLocaleString("vi-VN")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="dc-btn-secondary" onClick={() => setSelectedRequest(request)}>Chi tiết</button>
                      {request.status === "PENDING_REVIEW" || request.status === "NEEDS_REVISION" ? (
                        <>
                          <Link className="dc-btn-primary" href={`/admin/campaigns/create?requestId=${request.id}`}>Mở form tạo campaign</Link>
                          <button className="dc-btn-secondary" onClick={() => setRequestAction({ id: request.id, decision: "CHANGES_REQUESTED" })}>Yêu cầu bổ sung</button>
                          <button className="dc-btn-secondary" onClick={() => setRequestAction({ id: request.id, decision: "REJECTED" })}>Từ chối</button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}
        </section>
      ) : null}
      {viewMode === "CAMPAIGNS" && loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {viewMode === "CAMPAIGNS" && error ? <div className="mt-4"><ErrorState title="Không tải được campaign" description={error} onRetry={() => void load()} /></div> : null}
      {viewMode === "CAMPAIGNS" && !loading && !error ? (
        filtered.length === 0 ? <div className="mt-4"><EmptyState title="Không có dữ liệu" description="Không có campaign phù hợp bộ lọc." /></div> : (
          <div className="mt-4 grid gap-3">
            {filtered.map((campaign) => (
              <article key={campaign.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{campaign.title}</p>
                    <p className="text-sm text-zinc-600">/{campaign.slug} • {campaign.brand.displayName}</p>
                  </div>
                  <StatusBadge status={(campaign.statusView ?? campaign.status).toLowerCase()} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{campaign.brief}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="dc-btn-primary" href={`/admin/campaigns/${campaign.id}`}>Chi tiết</Link>
                  <Link className="dc-btn-secondary" href={`/admin/campaigns/${campaign.id}`}>Chỉnh sửa</Link>
                  <ManagementActionMenu
                    items={[
                      { key: "pause", label: "Tạm dừng campaign" },
                      { key: "resume", label: "Tiếp tục campaign" },
                      { key: "mark-completed", label: "Mark completed" },
                      { key: "audit", label: "Chuyển đối soát" },
                      { key: "force-close", label: "Force close", danger: true },
                      { key: "delete", label: "Xóa campaign", danger: true }
                    ]}
                    onSelect={(key) => {
                      if (key === "pause") setAction({ type: "pause", id: campaign.id });
                      if (key === "resume") setAction({ type: "resume", id: campaign.id });
                      if (key === "audit") setAction({ type: "audit", id: campaign.id });
                      if (key === "force-close") setAction({ type: "force-close", id: campaign.id });
                      if (key === "mark-completed") setAction({ type: "mark-completed", id: campaign.id });
                      if (key === "delete") setAction({ type: "delete", id: campaign.id });
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}
      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4" onClick={() => setSelectedRequest(null)}>
          {(() => {
            const parsed = parseCampaignRequestContent(selectedRequest.brief);
            const imageLinks = parsed.links.filter((link) => link.type === "image");
            const fileLinks = parsed.links.filter((link) => link.type !== "image");
            return (
              <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-zinc-900">{selectedRequest.title}</p>
                    <p className="mt-1 break-all text-sm text-zinc-600">/{selectedRequest.requestedSlug}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {selectedRequest.brand.name ?? "Brand chưa đặt tên"} • {selectedRequest.brand.contactEmail ?? "Chưa có email"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getRequestStatusClass(selectedRequest.status)}`}>
                    {getRequestStatusLabel(selectedRequest.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4">
                  <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="font-semibold text-zinc-900">Thông tin cơ bản</p>
                    <div className="mt-3 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
                      <p><span className="font-semibold">Tên campaign:</span> {selectedRequest.title}</p>
                      <p><span className="font-semibold">Brand:</span> {selectedRequest.brand.name ?? "Chưa có"}</p>
                      <p><span className="font-semibold">Email Brand:</span> {selectedRequest.brand.contactEmail ?? "Chưa có"}</p>
                      <p className="break-all"><span className="font-semibold">Slug:</span> /{selectedRequest.requestedSlug}</p>
                      <p><span className="font-semibold">Loại campaign:</span> {selectedRequest.campaignType}</p>
                      <p><span className="font-semibold">Nguồn tạo:</span> {selectedRequest.setupSource}</p>
                      <p><span className="font-semibold">Ngành hàng:</span> {selectedRequest.category}</p>
                      <p><span className="font-semibold">Cập nhật:</span> {formatDateTime(selectedRequest.updatedAt)}</p>
                      <p><span className="font-semibold">Bắt đầu:</span> {formatDateTime(selectedRequest.startsAt)}</p>
                      <p><span className="font-semibold">Kết thúc:</span> {formatDateTime(selectedRequest.endsAt)}</p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-zinc-100 bg-white p-4">
                    <p className="font-semibold text-zinc-900">Nội dung yêu cầu</p>
                    {parsed.cleanContent ? (
                      <div className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-700">
                        <LinkifiedText text={parsed.cleanContent} />
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-500">Không có mô tả bổ sung.</p>
                    )}
                    {selectedRequest.objective ? <p className="mt-3 text-sm text-zinc-700"><span className="font-semibold">Mục tiêu/quyền lợi:</span> {selectedRequest.objective}</p> : null}
                    {selectedRequest.priorityChannels ? <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700"><span className="font-semibold">Lộ trình/kênh ưu tiên:</span> {selectedRequest.priorityChannels}</p> : null}
                    {selectedRequest.missionTypes ? <p className="mt-2 text-sm text-zinc-700"><span className="font-semibold">Mission:</span> {selectedRequest.missionTypes}</p> : null}
                  </section>

                  <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="font-semibold text-zinc-900">File / Link đính kèm</p>
                    {parsed.links.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-500">Không có file hoặc link đính kèm.</p>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {imageLinks.map((link) => (
                          <div key={link.url} className="rounded-xl border border-zinc-200 bg-white p-3">
                            <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={link.url} alt={link.label} className="max-h-64 w-full object-contain" />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-zinc-900">{link.label}</p>
                              <ClickableUrl url={link.url} label="Mở ảnh gốc" className="dc-btn-secondary" />
                            </div>
                          </div>
                        ))}
                        {fileLinks.map((link) => <FileLinkCard key={link.url} link={link} />)}
                      </div>
                    )}
                  </section>

                  {selectedRequest.adminNote ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"><span className="font-semibold">Admin note:</span> {selectedRequest.adminNote}</p> : null}
                  {selectedRequest.brandFeedback ? <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700"><span className="font-semibold">Phản hồi Brand:</span> {selectedRequest.brandFeedback}</p> : null}
                  {selectedRequest.createdCampaign ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <span className="font-semibold">Campaign đã tạo:</span> {selectedRequest.createdCampaign.title} /{selectedRequest.createdCampaign.slug}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
                  {selectedRequest.createdCampaign ? (
                    <Link className="dc-btn-primary" href={`/admin/campaigns/${selectedRequest.createdCampaign.id}`}>Mở campaign đã tạo</Link>
                  ) : null}
                  {selectedRequest.status === "PENDING_REVIEW" || selectedRequest.status === "NEEDS_REVISION" ? (
                    <>
                      <Link className="dc-btn-primary" href={`/admin/campaigns/create?requestId=${selectedRequest.id}`}>Mở form tạo campaign</Link>
                      <button className="dc-btn-secondary" onClick={() => setRequestAction({ id: selectedRequest.id, decision: "CHANGES_REQUESTED" })}>Cần bổ sung</button>
                      <button className="dc-btn-secondary" onClick={() => setRequestAction({ id: selectedRequest.id, decision: "REJECTED" })}>Từ chối</button>
                    </>
                  ) : null}
                  <button className="dc-btn-secondary" onClick={() => setSelectedRequest(null)}>Đóng</button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
      <ReviewActionDialog
        open={Boolean(requestAction)}
        title={
          requestAction?.decision === "APPROVED"
            ? "Xác nhận duyệt yêu cầu tạo campaign"
            : requestAction?.decision === "CHANGES_REQUESTED"
              ? "Xác nhận yêu cầu bổ sung"
              : "Xác nhận từ chối yêu cầu"
        }
        description={
          requestAction?.decision === "APPROVED"
            ? "Có thể nhập ghi chú nội bộ (không bắt buộc)."
            : "Vui lòng nhập lý do để Brand cập nhật lại thông tin."
        }
        requireReason={requestAction?.decision !== "APPROVED"}
        submitting={acting}
        onCancel={() => !acting && setRequestAction(null)}
        onConfirm={async (reason) => {
          if (!requestAction) return;
          setActing(true);
          try {
            const res = await fetch(`/api/admin/dashboard/campaign-reviews/${requestAction.id}/decision`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ decision: requestAction.decision, reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast("Đã xử lý yêu cầu tạo campaign");
            setTimeout(() => setToast(""), 2000);
            setRequestAction(null);
            await loadCampaignRequests();
            await load();
          } catch (e) {
            setRequestError(e instanceof Error ? e.message : "Thao tác thất bại");
          } finally {
            setActing(false);
          }
        }}
      />
      <ReviewActionDialog
        open={Boolean(action)}
        title={action?.type === "delete" ? "Xác nhận xóa campaign" : "Xác nhận action campaign"}
        description={action?.type === "delete" ? "Campaign sẽ bị chuyển sang trạng thái archived." : "Bắt buộc nhập lý do để ghi audit log."}
        requireReason
        submitting={acting}
        onCancel={() => !acting && setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          setActing(true);
          try {
            let endpoint = "";
            if (action.type === "pause") endpoint = "pause";
            if (action.type === "resume") endpoint = "resume";
            if (action.type === "audit") endpoint = "move-to-audit";
            if (action.type === "force-close") endpoint = "force-close";
            if (action.type === "mark-completed") endpoint = "mark-completed";
            const res = await fetch(action.type === "delete" ? `/api/admin/campaigns/${action.id}` : `/api/admin/campaigns/${action.id}/${endpoint}`, {
              method: action.type === "delete" ? "DELETE" : "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast("Đã cập nhật campaign");
            setTimeout(() => setToast(""), 2000);
            setAction(null);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Thao tác thất bại");
          } finally {
            setActing(false);
          }
        }}
      />
    </>
  );
}
