"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionToast, ConfirmDialog, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";
import { APPLICATION_STATUS } from "@/lib/constants/enums";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type BrandRow = {
  id: string;
  status: (typeof APPLICATION_STATUS)[number];
  brandName: string;
  legalName: string | null;
  industry: string | null;
  taxCode: string | null;
  contactEmail: string;
  productCategories: string | null;
  inventoryDescription: string | null;
  website: string | null;
  fanpage: string | null;
  reviewNote: string | null;
  rejectReason: string | null;
  revenueSharePercent: number | null;
  commissionRatePercent: number | null;
  bccAgreementAccepted: boolean;
  bccAgreementVersion: string | null;
  bccAgreementTerms: string | null;
  legalResponsibilityAccepted: boolean;
  contractFileUrl: string | null;
  contractSignedAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
  account: { id: string; email: string; displayName: string; profile: { phone: string | null } | null };
  reviewedBy: { id: string; displayName: string; email: string } | null;
};

type HistoryItem = {
  id: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  createdAt: string;
  actor: { id: string; displayName: string; email: string } | null;
};

type BrandDetail = BrandRow & {
  contactName: string;
  contactPhone: string;
  description: string | null;
  businessGoal: string | null;
  businessLicenseUrl: string | null;
  statusHistory: HistoryItem[];
};

type StatusFilter = "" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";

export default function AdminBrandRequestsPage() {
  const [items, setItems] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [status, setStatus] = useState<StatusFilter>("PENDING_REVIEW");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BrandDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | "request-changes" | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (industry.trim()) params.set("industry", industry.trim());
      if (query.trim()) params.set("query", query.trim());
      params.set("sort", sort);
      const res = await fetch(`/api/admin/brand-requests?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<BrandRow[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách thất bại");
      setItems(body.data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Tải danh sách thất bại");
    } finally {
      setLoading(false);
    }
  }, [industry, query, sort, status]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setListError("");
    try {
      const res = await fetch(`/api/admin/brand-requests/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<BrandDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết thất bại");
      setDetail(body.data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Tải chi tiết thất bại");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailId) return;
    void loadDetail(detailId);
  }, [detailId, loadDetail]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((item) => item.status === "PENDING_REVIEW").length;
    const approved = items.filter((item) => item.status === "APPROVED").length;
    const attention = items.filter((item) => item.status === "REJECTED" || item.status === "NEEDS_REVISION").length;
    return { total, pending, approved, attention };
  }, [items]);

  async function submitDecision() {
    if (!detail) return;
    const action = dialogAction;
    if (!action) return;
    if (action !== "approve" && reason.trim().length < 5) {
      setActionError("Lý do tối thiểu 5 ký tự.");
      return;
    }

    setActing(true);
    setActionError("");
    try {
      const endpoint = action === "approve" ? "approve" : action === "reject" ? "reject" : "request-changes";
      const payload = action === "approve" ? undefined : { reason: reason.trim() };
      const res = await fetch(`/api/admin/brand-requests/${detail.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Cập nhật thất bại");
      setDialogAction(null);
      setReason("");
      setActionError("");
      setToast("Cập nhật trạng thái thành công");
      setTimeout(() => setToast(""), 1800);
      await Promise.all([load(), loadDetail(detail.id)]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setActing(false);
    }
  }

  return (
    <main>
      <PageHeader title="Quản lý Brand" subtitle="Quản lý hồ sơ Brand/SME và quyết định duyệt hoặc yêu cầu bổ sung." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Tổng hồ sơ" value={String(stats.total)} />
        <StatsCard title="Đang chờ duyệt" value={String(stats.pending)} />
        <StatsCard title="Đã duyệt" value={String(stats.approved)} />
        <StatsCard title="Cần xử lý" value={String(stats.attention)} hint="Rejected + Needs revision" />
      </section>

      <section className="dc-card mt-4 p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input className="dc-input" placeholder="Tìm brand, legal, email, tax code" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_REVIEW">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="NEEDS_REVISION">NEEDS_CHANGES</option>
          </select>
          <input className="dc-input" placeholder="Lọc theo ngành hàng" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest") }>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {listError ? <div className="mt-4"><ErrorState title="Không tải được Brand requests" description={listError} onRetry={() => void load()} /></div> : null}
      {!loading && !listError && items.length === 0 ? <div className="mt-4"><EmptyState title="Không có hồ sơ" description="Không có Brand phù hợp bộ lọc." /></div> : null}

      {!loading && !listError && items.length > 0 ? (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Brand</th><th className="px-4 py-3">Pháp lý</th><th className="px-4 py-3">Ngành/Category</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Ngày gửi</th><th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-3"><p className="font-semibold">{item.brandName}</p><p className="text-zinc-500">{item.account.displayName} - {item.contactEmail}</p></td>
                    <td className="px-4 py-3">{item.legalName ?? "-"}<p className="text-zinc-500">Tax: {item.taxCode ?? "-"}</p></td>
                    <td className="px-4 py-3">{item.industry ?? "-"}<p className="text-zinc-500">{item.productCategories ?? "-"}</p></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3"><button className="dc-btn-primary" onClick={() => setDetailId(item.id)}>Xem chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 lg:hidden">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.brandName}</p><p className="text-xs text-zinc-500">{item.contactEmail}</p></div><StatusBadge status={item.status} /></div>
                <p className="mt-2 text-sm">{item.industry ?? "Không có"} • {item.legalName ?? "Không có legal name"}</p>
                <p className="text-sm">Tax code: {item.taxCode ?? "-"}</p>
                <button className="dc-btn-primary mt-3" onClick={() => setDetailId(item.id)}>Xem chi tiết</button>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {detailId ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-6" onClick={() => setDetailId(null)}>
          <div className="mx-auto h-full w-full max-w-4xl overflow-auto rounded-2xl bg-white p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Chi tiết hồ sơ Brand</h2><button className="dc-btn-secondary" onClick={() => setDetailId(null)}>Đóng</button></div>
            {detailLoading || !detail ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : (
              <div className="mt-4 grid gap-4">
                <section className="dc-card p-4 text-sm">
                  <div className="flex items-center justify-between"><p className="font-semibold">{detail.brandName}</p><StatusBadge status={detail.status} /></div>
                  <p className="mt-1">Owner: {detail.account.displayName} - {detail.account.email}</p>
                  <p>Phone: {detail.account.profile?.phone ?? detail.contactPhone ?? "-"}</p>
                  <p>Legal name: {detail.legalName ?? "-"}</p>
                  <p>Tax code: {detail.taxCode ?? "-"}</p>
                  <p>Industry: {detail.industry ?? "-"}</p>
                  <p>Product categories: {detail.productCategories ?? "-"}</p>
                  <p>Inventory description: {detail.inventoryDescription ?? "-"}</p>
                  <p>Description: {detail.description ?? "-"}</p>
                  <p>Business goal: {detail.businessGoal ?? "-"}</p>
                  <p>Revenue share: {detail.revenueSharePercent ?? "-"}%</p>
                  <p>Platform commission: {detail.commissionRatePercent ?? "-"}%</p>
                  <p>BCC version: {detail.bccAgreementVersion ?? "-"}</p>
                  <p>BCC accepted: {detail.bccAgreementAccepted ? "Yes" : "No"}</p>
                  <p>Legal responsibility accepted: {detail.legalResponsibilityAccepted ? "Yes" : "No"}</p>
                  <p>Contract signed at: {detail.contractSignedAt ? new Date(detail.contractSignedAt).toLocaleString("vi-VN") : "-"}</p>
                  <p>Admin note: {detail.reviewNote ?? "-"}</p>
                  <p>Reject reason: {detail.rejectReason ?? "-"}</p>
                  <p>Reviewer: {detail.reviewedBy?.displayName ?? "-"}</p>
                  <p>Reviewed at: {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString("vi-VN") : "-"}</p>
                  {detail.website ? <a href={detail.website} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-700 underline">{detail.website}</a> : null}
                  {detail.fanpage ? <a href={detail.fanpage} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-700 underline">{detail.fanpage}</a> : null}
                  {detail.businessLicenseUrl ? <a href={detail.businessLicenseUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-700 underline">Business license</a> : null}
                  <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="font-semibold text-zinc-900">Tải lên hợp đồng / tài liệu bổ sung</p>
                    {detail.contractFileUrl ? (
                      <a href={detail.contractFileUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-700 underline">
                        {detail.contractFileUrl}
                      </a>
                    ) : (
                      <p className="mt-1 text-zinc-600">Chưa có tệp được tải lên.</p>
                    )}
                  </div>
                  {detail.bccAgreementTerms ? (
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="font-semibold text-zinc-900">BCC terms submitted</p>
                      <p className="mt-2 whitespace-pre-wrap text-zinc-700">{detail.bccAgreementTerms}</p>
                    </div>
                  ) : null}
                </section>

                <section className="dc-card p-4 text-sm">
                  <p className="font-semibold">Lịch sử trạng thái</p>
                  <div className="mt-2 grid gap-2">
                    {detail.statusHistory.length === 0 ? <p className="text-zinc-500">Chưa có lịch sử.</p> : detail.statusHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                        <p className="font-medium">{item.action}</p>
                        <p className="text-zinc-600">{item.oldStatus ?? "-"} → {item.newStatus ?? "-"}</p>
                        <p className="text-zinc-600">{item.actor?.displayName ?? "System"} • {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                        {item.reason ? <p className="text-zinc-700">{item.reason}</p> : null}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="dc-card p-4">
                  <p className="font-semibold">Thao tác duyệt</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-primary" disabled={acting || detail.status !== "PENDING_REVIEW"} onClick={() => { setReason(""); setActionError(""); setDialogAction("approve"); }}>Approve</button>
                    <button className="dc-btn-secondary" disabled={acting || detail.status !== "PENDING_REVIEW"} onClick={() => { setReason(""); setActionError(""); setDialogAction("reject"); }}>Reject</button>
                    <button className="dc-btn-secondary" disabled={acting || detail.status !== "PENDING_REVIEW"} onClick={() => { setReason(""); setActionError(""); setDialogAction("request-changes"); }}>Request changes</button>
                  </div>
                  {dialogAction && dialogAction !== "approve" ? (
                    <div className="mt-3 grid gap-2">
                      <textarea className="dc-input min-h-24" placeholder="Nhập lý do bắt buộc..." value={reason} onChange={(e) => { setReason(e.target.value); if (actionError) setActionError(""); }} />
                      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
                      <div className="flex gap-2">
                        <button className="dc-btn-secondary" disabled={acting} onClick={() => { setDialogAction(null); setReason(""); setActionError(""); }}>Hủy</button>
                        <button className="dc-btn-primary" disabled={acting} onClick={() => void submitDecision()}>{acting ? "Đang xử lý..." : "Xác nhận"}</button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={dialogAction === "approve"}
        title="Xác nhận duyệt Brand"
        message="Hồ sơ sẽ được duyệt, cập nhật Brand và cấp role BRAND_OWNER."
        confirmLabel={acting ? "Đang xử lý..." : "Xác nhận"}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={() => void submitDecision()}
      />

      {toast ? <ActionToast message={toast} /> : null}
    </main>
  );
}
