"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionToast,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatsCard,
  StatusBadge
} from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

async function getData<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json()) as ApiResult<T>;
  if (!res.ok || !body.success) throw new Error(body.error ?? "Load failed");
  return body.data;
}

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    const normalized = typeof value === "string" ? value.trim() : String(value);
    if (!normalized) return;
    query.set(key, normalized);
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

function extractKycImages(note: string | null) {
  if (!note) return { front: "", back: "", portrait: "" };
  const lines = note.split("\n");
  const front =
    lines.find((line) => line.startsWith("KYC CCCD mặt trước:"))?.replace("KYC CCCD mặt trước:", "").trim() ??
    lines.find((line) => line.startsWith("KYC CCCD:"))?.replace("KYC CCCD:", "").trim() ??
    "";
  const back = lines.find((line) => line.startsWith("KYC CCCD mặt sau:"))?.replace("KYC CCCD mặt sau:", "").trim() ?? "";
  const portrait = lines.find((line) => line.startsWith("KYC chân dung:"))?.replace("KYC chân dung:", "").trim() ?? "";
  return { front, back, portrait };
}

type Overview = {
  totalUsers: number;
  totalCreators: number;
  totalBrands: number;
  activeCampaigns: number;
  pendingReviews: number;
  totalContributions: number;
  fraudAlerts: number;
};

type UsersData = {
  items: Array<{
    id: string;
    displayName: string;
    email: string;
    role: string;
    isActive: boolean;
    wallet?: { pointsBalance: number; cashBalanceVnd: number };
  }>;
};

type RoleRequest = { id: string; note: string | null; account: { displayName: string; email: string } };
type CampaignReview = { id: string; title: string; status: string };
type ProofItem = { id: string; account: { displayName: string }; mission: { title: string; campaign: { title: string } } };
type VouchersData = {
  items: Array<{ id: string; voucherCode: string; status: string; account: { email: string }; reward?: { campaign?: { title?: string } } }>;
  logs: Array<{ id: string; action: string; createdAt: string }>;
};
type FinanceData = {
  paymentTransactions: Array<{ id: string; provider: string; requestedAmountVnd: number; status: string }>;
  walletTransactions: Array<{ id: string; type: string; pointsDelta: number; cashDeltaVnd: number }>;
  payoutRequests: Array<{ id: string; amountVnd: number; status: string }>;
  brandPrepaidFunds: Array<{ userId: string; pointsBalance: number; cashBalanceVnd?: number }>;
};
type FraudData = {
  suspiciousContributions: Array<{ id: string; amountVnd: number }>;
  duplicatePayments: Array<{ idempotencyKey: string; _count: { _all: number } }>;
  spamProofs: Array<{ accountId: string; _count: { _all: number } }>;
  flaggedAccounts: Array<{ id: string; reason: string; score: number }>;
};
type AuditData = {
  items: Array<{ id: string; action: string; targetType: string; targetId: string; createdAt: string; metadata?: unknown }>;
};
type Analytics = { activeCampaigns: number; totalContributionVnd: number; failedPayment: number; fraudAlerts: number; pendingReviews: number };

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});

  const [userQuery, setUserQuery] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [auditAction, setAuditAction] = useState("");

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, users, creatorVerifications, brandVerifications, campaignReviews, proofs, vouchers, finance, fraudRisk, auditLogs, analytics] = await Promise.all([
        getData<Overview>("/api/admin/dashboard/overview"),
        getData<UsersData>(withQuery("/api/admin/dashboard/users", { query: userQuery, page: 1, limit: 20 })),
        getData<RoleRequest[]>("/api/admin/dashboard/creator-verifications"),
        getData<RoleRequest[]>("/api/admin/dashboard/brand-verifications"),
        getData<CampaignReview[]>("/api/admin/dashboard/campaign-reviews"),
        getData<ProofItem[]>("/api/admin/dashboard/proofs"),
        getData<VouchersData>(withQuery("/api/admin/dashboard/vouchers", { code: voucherCode, page: 1, limit: 20 })),
        getData<FinanceData>("/api/admin/dashboard/finance"),
        getData<FraudData>("/api/admin/dashboard/fraud-risk"),
        getData<AuditData>(withQuery("/api/admin/dashboard/audit-logs", { action: auditAction, page: 1, limit: 30 })),
        getData<Analytics>("/api/admin/dashboard/analytics")
      ]);
      setData({
        overview,
        users,
        creatorVerifications,
        brandVerifications,
        campaignReviews,
        proofs,
        vouchers,
        finance,
        fraudRisk,
        auditLogs,
        analytics
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [auditAction, userQuery, voucherCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function post(url: string, payload: unknown, successMessage: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await res.json()) as ApiResult<unknown>;
    if (!res.ok || !body.success) {
      setError(body.error ?? "Action failed");
      return;
    }
    showToast(successMessage);
    await refresh();
  }

  async function onFilter(e: FormEvent) {
    e.preventDefault();
    await refresh();
  }

  const overview = (data.overview as Overview | undefined) ?? null;
  const users = (data.users as UsersData | undefined) ?? { items: [] };
  const creatorVerifications = (data.creatorVerifications as RoleRequest[] | undefined) ?? [];
  const brandVerifications = (data.brandVerifications as RoleRequest[] | undefined) ?? [];
  const campaignReviews = (data.campaignReviews as CampaignReview[] | undefined) ?? [];
  const proofs = (data.proofs as ProofItem[] | undefined) ?? [];
  const vouchers = (data.vouchers as VouchersData | undefined) ?? { items: [], logs: [] };
  const finance = (data.finance as FinanceData | undefined) ?? {
    paymentTransactions: [],
    walletTransactions: [],
    payoutRequests: [],
    brandPrepaidFunds: []
  };
  const fraud = (data.fraudRisk as FraudData | undefined) ?? {
    suspiciousContributions: [],
    duplicatePayments: [],
    spamProofs: [],
    flaggedAccounts: []
  };
  const audit = (data.auditLogs as AuditData | undefined) ?? { items: [] };
  const analytics = (data.analytics as Analytics | undefined) ?? {
    activeCampaigns: 0,
    totalContributionVnd: 0,
    failedPayment: 0,
    fraudAlerts: 0,
    pendingReviews: 0
  };

  const totalBrandFund = useMemo(
    () => finance.brandPrepaidFunds.reduce((sum, item) => sum + (item.cashBalanceVnd ?? 0), 0),
    [finance.brandPrepaidFunds]
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Admin/Ops Dashboard" subtitle="Giám sát vận hành, rủi ro và kiểm duyệt toàn hệ thống." />
        <LoadingSkeleton rows={8} />
      </>
    );
  }

  if (error && !overview) {
    return <ErrorState title="Không tải được dashboard admin" description={error} onRetry={() => void refresh()} />;
  }

  return (
    <>
      <PageHeader
        title="Admin/Ops Dashboard"
        subtitle="Giám sát review, fraud risk, payment, audit log và duyệt role request."
        action={<button className="dc-btn-secondary" onClick={() => void refresh()}>Làm mới</button>}
      />

      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void refresh()} /></div> : null}

      <section className="dc-grid-dashboard">
        <StatsCard title="Total users" value={`${overview?.totalUsers ?? 0}`} />
        <StatsCard title="Pending reviews" value={`${overview?.pendingReviews ?? 0}`} hint={`Fraud alerts: ${overview?.fraudAlerts ?? 0}`} />
        <StatsCard title="Total contribution" value={formatVnd(overview?.totalContributions ?? 0)} />
        <StatsCard title="Brand prepaid" value={formatVnd(totalBrandFund)} />
      </section>

      <section className="mt-8 dc-card p-4">
        <SectionHeader title="Bộ lọc nhanh" subtitle="Lọc user, voucher và audit logs." />
        <form onSubmit={onFilter} className="grid gap-3 md:grid-cols-4">
          <input className="dc-input" placeholder="User query" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
          <input className="dc-input" placeholder="Voucher code" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} />
          <input className="dc-input" placeholder="Audit action" value={auditAction} onChange={(e) => setAuditAction(e.target.value)} />
          <button className="dc-btn-primary" type="submit">Apply</button>
        </form>
      </section>

      <section className="mt-8">
        <SectionHeader title="User Management" subtitle="Khóa/mở tài khoản và theo dõi ví người dùng." />
        <div className="dc-card overflow-auto">
          {users.items.length === 0 ? (
            <div className="p-6"><EmptyState title="Không có user" description="Không tìm thấy dữ liệu phù hợp." /></div>
          ) : (
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.items.map((u) => (
                  <tr key={u.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-900">{u.displayName}</p>
                      <p className="text-xs text-zinc-500">{maskEmail(u.email)}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.role.toLowerCase().includes("admin") ? "review" : "active"} /></td>
                    <td className="px-4 py-3">{u.isActive ? <StatusBadge status="active" /> : <StatusBadge status="rejected" />}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      P: {(u.wallet?.pointsBalance ?? 0).toLocaleString("vi-VN")}<br />
                      C: {formatVnd(u.wallet?.cashBalanceVnd ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <button className="dc-btn-secondary" onClick={() => void post(`/api/admin/dashboard/users/${u.id}/lock`, {}, "Đã khóa user")}>Lock</button>
                      ) : (
                        <button className="dc-btn-primary" onClick={() => void post(`/api/admin/dashboard/users/${u.id}/unlock`, {}, "Đã mở khóa user")}>Unlock</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <div className="dc-card p-4">
          <SectionHeader title="Creator Verification" subtitle={`Pending: ${creatorVerifications.length}`} />
          {creatorVerifications.length === 0 ? <p className="text-sm text-zinc-600">Không có request.</p> : (
            <div className="grid gap-4">
              {creatorVerifications.map((r) => {
                const images = extractKycImages(r.note);
                return (
                  <article key={r.id} className="rounded-2xl border border-zinc-200 p-3">
                    <p className="font-semibold">{r.account.displayName}</p>
                    <p className="text-xs text-zinc-500">{maskEmail(r.account.email)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="dc-btn-primary" onClick={() => void post(`/api/admin/dashboard/creator-verifications/${r.id}/approve`, {}, "Đã duyệt Creator")}>Approve</button>
                      <button
                        className="dc-btn-secondary"
                        onClick={() => {
                          const reason = window.prompt("Lý do từ chối:", "Thiếu minh chứng KYC")?.trim();
                          if (!reason) return;
                          void post(`/api/admin/dashboard/creator-verifications/${r.id}/reject`, { reason }, "Đã từ chối Creator");
                        }}
                      >
                        Reject
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600 whitespace-pre-wrap">{r.note ?? "No note"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {images.front ? <Image src={images.front} alt="CCCD front" width={140} height={90} className="rounded-xl border border-zinc-200" /> : null}
                      {images.back ? <Image src={images.back} alt="CCCD back" width={140} height={90} className="rounded-xl border border-zinc-200" /> : null}
                      {images.portrait ? <Image src={images.portrait} alt="Portrait" width={140} height={90} className="rounded-xl border border-zinc-200" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="dc-card p-4">
          <SectionHeader title="Brand Verification" subtitle={`Pending: ${brandVerifications.length}`} />
          {brandVerifications.length === 0 ? <p className="text-sm text-zinc-600">Không có request.</p> : (
            <div className="grid gap-4">
              {brandVerifications.map((r) => (
                <article key={r.id} className="rounded-2xl border border-zinc-200 p-3">
                  <p className="font-semibold">{r.account.displayName}</p>
                  <p className="text-xs text-zinc-500">{maskEmail(r.account.email)}</p>
                  <p className="mt-2 text-xs text-zinc-600 whitespace-pre-wrap">{r.note ?? "No note"}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="dc-btn-primary" onClick={() => void post(`/api/admin/dashboard/brand-verifications/${r.id}/approve`, {}, "Đã duyệt Brand")}>Approve</button>
                    <button
                      className="dc-btn-secondary"
                      onClick={() => {
                        const reason = window.prompt("Lý do từ chối:", "Thông tin doanh nghiệp chưa hợp lệ")?.trim();
                        if (!reason) return;
                        void post(`/api/admin/dashboard/brand-verifications/${r.id}/reject`, { reason }, "Đã từ chối Brand");
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <div className="dc-card p-4">
          <SectionHeader title="Campaign Review" subtitle={`Pending: ${campaignReviews.length}`} />
          {campaignReviews.length === 0 ? <p className="text-sm text-zinc-600">Không có campaign chờ duyệt.</p> : (
            <div className="grid gap-3">
              {campaignReviews.map((c) => (
                <article key={c.id} className="rounded-2xl border border-zinc-200 p-3">
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">Status: {c.status}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void post(`/api/admin/dashboard/campaign-reviews/${c.id}/decision`, { decision: "APPROVED" }, "Campaign đã được duyệt")}>Approve</button>
                    <button
                      className="dc-btn-secondary"
                      onClick={() => {
                        const reason = window.prompt("Lý do từ chối:", "Không phù hợp policy")?.trim();
                        if (!reason) return;
                        void post(`/api/admin/dashboard/campaign-reviews/${c.id}/decision`, { decision: "REJECTED", reason }, "Campaign đã bị từ chối");
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="dc-btn-secondary"
                      onClick={() => {
                        const reason = window.prompt("Yêu cầu chỉnh sửa:", "Cần cập nhật nội dung brief")?.trim();
                        if (!reason) return;
                        void post(`/api/admin/dashboard/campaign-reviews/${c.id}/decision`, { decision: "CHANGES_REQUESTED", reason }, "Đã yêu cầu chỉnh sửa campaign");
                      }}
                    >
                      Request changes
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="dc-card p-4">
          <SectionHeader title="Proof Review" subtitle={`Queue: ${proofs.length}`} />
          {proofs.length === 0 ? <p className="text-sm text-zinc-600">Không có proof pending.</p> : (
            <div className="grid gap-3">
              {proofs.map((p) => (
                <article key={p.id} className="rounded-2xl border border-zinc-200 p-3">
                  <p className="font-semibold">{p.mission.title}</p>
                  <p className="text-xs text-zinc-500">Campaign: {p.mission.campaign.title} • Creator: {p.account.displayName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void post(`/api/admin/dashboard/proofs/${p.id}/decision`, { decision: "APPROVED" }, "Đã duyệt proof")}>Approve</button>
                    <button
                      className="dc-btn-secondary"
                      onClick={() => {
                        const reason = window.prompt("Lý do reject proof:", "Proof không hợp lệ")?.trim();
                        if (!reason) return;
                        void post(`/api/admin/dashboard/proofs/${p.id}/decision`, { decision: "REJECTED", reason }, "Đã reject proof");
                      }}
                    >
                      Reject
                    </button>
                    <button className="dc-btn-secondary" onClick={() => void post(`/api/admin/dashboard/proofs/${p.id}/decision`, { decision: "OVERRIDE_APPROVE", note: "Admin override" }, "Đã override approve")}>Override approve</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <div className="dc-card p-4">
          <SectionHeader title="Voucher Management" subtitle={`Records: ${vouchers.items.length}`} />
          {vouchers.items.length === 0 ? <p className="text-sm text-zinc-600">Không có voucher.</p> : (
            <div className="grid gap-3">
              {vouchers.items.map((v) => (
                <article key={v.id} className="rounded-2xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{v.voucherCode}</p>
                      <p className="text-xs text-zinc-500">{maskEmail(v.account.email)}</p>
                    </div>
                    <StatusBadge status={v.status.toLowerCase()} />
                  </div>
                  <button
                    className="dc-btn-secondary mt-2"
                    disabled={v.status === "USED" || v.status === "CANCELLED"}
                    onClick={() => {
                      const reason = window.prompt("Lý do hủy voucher:", "Fraud detected")?.trim();
                      if (!reason) return;
                      void post(`/api/admin/vouchers/${v.id}/cancel`, { reason }, "Đã hủy voucher");
                    }}
                  >
                    Cancel voucher
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="dc-card p-4">
          <SectionHeader title="Audit Logs" subtitle={`Rows: ${audit.items.length}`} />
          <div className="max-h-[440px] overflow-auto">
            {audit.items.length === 0 ? <p className="text-sm text-zinc-600">Không có audit log.</p> : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.items.map((a) => (
                    <tr key={a.id} className="border-t border-zinc-100 align-top">
                      <td className="px-3 py-2 font-medium">{a.action}</td>
                      <td className="px-3 py-2 text-zinc-600">{a.targetType} · {a.targetId.slice(0, 8)}***</td>
                      <td className="px-3 py-2 text-zinc-600">{new Date(a.createdAt).toLocaleString("vi-VN")}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500">{a.metadata ? JSON.stringify(a.metadata).slice(0, 120) : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 dc-card p-4">
        <SectionHeader title="Finance & Fraud Snapshot" subtitle="Theo dõi nhanh tài chính và rủi ro." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Payment tx" value={`${finance.paymentTransactions.length}`} hint={`Failed: ${analytics.failedPayment}`} />
          <StatsCard title="Payout requests" value={`${finance.payoutRequests.length}`} />
          <StatsCard title="Fraud alerts" value={`${fraud.flaggedAccounts.length}`} hint={`Duplicate payments: ${fraud.duplicatePayments.length}`} />
          <StatsCard title="Spam proofs" value={`${fraud.spamProofs.length}`} hint={`Suspicious contributions: ${fraud.suspiciousContributions.length}`} />
        </div>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
