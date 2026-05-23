"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Item = {
  id: string;
  status: string;
  brandName: string;
  legalName: string | null;
  industry: string | null;
  contactEmail: string;
  taxCode: string | null;
  productCategories: string | null;
  revenueSharePercent: number | null;
  commissionRatePercent: number | null;
  bccAgreementAccepted: boolean;
  bccAgreementVersion: string | null;
  bccAgreementTerms: string | null;
  legalResponsibilityAccepted: boolean;
  businessLicenseUrl: string | null;
  contractFileUrl: string | null;
  contractSignedAt: string | null;
  rejectReason: string | null;
  reviewNote: string | null;
  account: { email: string; displayName: string };
};

export default function BrandApplicationsAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query.trim()) params.set("query", query.trim());
    const res = await fetch(`/api/admin/dashboard/brand-applications?${params.toString()}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Tải dữ liệu thất bại");
      setLoading(false);
      return;
    }
    setItems(body.data as Item[]);
    setError("");
    setLoading(false);
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION") {
    const actionLabel = decision === "APPROVED" ? "duyệt" : decision === "REJECTED" ? "từ chối" : "yêu cầu bổ sung";
    if (!window.confirm(`Xác nhận ${actionLabel} hồ sơ Brand này?`)) return;
    let rejectReason: string | undefined;
    if (decision !== "APPROVED") {
      rejectReason = window.prompt("Nhập lý do (>=10 ký tự):", "Thiếu thông tin doanh nghiệp") ?? "";
      if (!rejectReason || rejectReason.trim().length < 10) return;
    }
    const res = await fetch(`/api/admin/dashboard/brand-applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, rejectReason })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Thao tác thất bại");
      return;
    }
    await load();
  }

  return (
    <>
      <PageHeader title="Brand Applications" subtitle="Duyệt hồ sơ Brand/KYB với lý do và trạng thái rõ ràng." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <div className="mt-4 flex flex-wrap gap-2">
        <select className="dc-input max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="NEEDS_REVISION">NEEDS_REVISION</option>
        </select>
        <input className="dc-input max-w-80" placeholder="Search brand/email/taxCode" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
      </div>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được brand applications" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="mt-4"><EmptyState title="Không có brand applications" description="Không có dữ liệu phù hợp bộ lọc." /></div>
      ) : null}
      {!loading && !error ? <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="dc-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{item.brandName} ({item.contactEmail})</p>
              <StatusBadge status={item.status.toLowerCase()} />
            </div>
            <p className="text-sm">Applicant: {item.account.displayName} - {item.account.email}</p>
            {item.legalName ? <p className="text-sm">Legal name: {item.legalName}</p> : null}
            {item.industry ? <p className="text-sm">Industry: {item.industry}</p> : null}
            {item.taxCode ? <p className="text-sm">Tax code: {item.taxCode}</p> : null}
            {item.productCategories ? <p className="text-sm">Product categories: {item.productCategories}</p> : null}
            {item.businessLicenseUrl ? <p className="text-sm">Business license: <a className="underline" href={item.businessLicenseUrl} target="_blank" rel="noreferrer">{item.businessLicenseUrl}</a></p> : null}
            <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold">BCC terms</p>
              <p>Revenue share: {item.revenueSharePercent ?? "Không có"}%</p>
              <p>Commission: {item.commissionRatePercent ?? "Không có"}%</p>
              <p>Version: {item.bccAgreementVersion ?? "Không có"}</p>
              <p>Agreement accepted: {item.bccAgreementAccepted ? "Có" : "Không"}</p>
              <p>Legal responsibility accepted: {item.legalResponsibilityAccepted ? "Có" : "Không"}</p>
              {item.bccAgreementTerms ? <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-zinc-600">{item.bccAgreementTerms}</p> : null}
              {item.contractFileUrl ? <a className="font-semibold text-zinc-900 underline" href={item.contractFileUrl} target="_blank" rel="noreferrer">Contract file</a> : null}
              {item.contractSignedAt ? <p>Signed at: {new Date(item.contractSignedAt).toLocaleString("vi-VN")}</p> : null}
            </div>
            {item.rejectReason ? <p className="text-sm text-red-700">Reject reason: {item.rejectReason}</p> : null}
            {item.reviewNote ? <p className="text-sm text-zinc-600">Review note: {item.reviewNote}</p> : null}
            <div className="mt-3 flex gap-2">
              <button className="dc-btn-primary" disabled={item.status !== "PENDING_REVIEW"} onClick={() => void decide(item.id, "APPROVED")}>Approve</button>
              <button className="dc-btn-secondary" disabled={item.status !== "PENDING_REVIEW"} onClick={() => void decide(item.id, "REJECTED")}>Reject</button>
              <button className="dc-btn-secondary" disabled={item.status !== "PENDING_REVIEW"} onClick={() => void decide(item.id, "NEEDS_REVISION")}>Needs revision</button>
            </div>
          </article>
        ))}
      </div> : null}
    </>
  );
}
