"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ApiResult<T> = { success: boolean; data: T; error?: string };

async function getData<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json()) as ApiResult<T>;
  if (!res.ok || !body.success) throw new Error(body.error ?? "Load failed");
  return body.data;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [userQuery, setUserQuery] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [auditAction, setAuditAction] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, users, creatorVerifications, brandVerifications, campaignReviews, proofs, vouchers, finance, fraudRisk, auditLogs] = await Promise.all([
        getData("/api/admin/dashboard/overview"),
        getData(`/api/admin/dashboard/users?query=${encodeURIComponent(userQuery)}&page=1&limit=20`),
        getData("/api/admin/dashboard/creator-verifications"),
        getData("/api/admin/dashboard/brand-verifications"),
        getData("/api/admin/dashboard/campaign-reviews"),
        getData("/api/admin/dashboard/proofs"),
        getData(`/api/admin/dashboard/vouchers?code=${encodeURIComponent(voucherCode)}&page=1&limit=20`),
        getData("/api/admin/dashboard/finance"),
        getData("/api/admin/dashboard/fraud-risk"),
        getData(`/api/admin/dashboard/audit-logs?action=${encodeURIComponent(auditAction)}&page=1&limit=30`)
      ]);
      setData({ overview, users, creatorVerifications, brandVerifications, campaignReviews, proofs, vouchers, finance, fraudRisk, auditLogs });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [auditAction, userQuery, voucherCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function post(url: string, payload: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = (await res.json()) as ApiResult<unknown>;
    setMessage(res.ok && body.success ? "Action completed" : body.error ?? "Action failed");
    if (res.ok && body.success) await refresh();
  }

  async function onFilter(e: FormEvent) {
    e.preventDefault();
    await refresh();
  }

  if (loading) return <main className="container"><h1>Admin/Ops Dashboard</h1><p>Loading...</p></main>;
  if (error) return <main className="container"><h1>Admin/Ops Dashboard</h1><p className="error">{error}</p></main>;

  const overview = data.overview as { totalUsers: number; totalCreators: number; totalBrands: number; activeCampaigns: number; pendingReviews: number; totalContributions: number; fraudAlerts: number };
  const users = data.users as { items: Array<{ id: string; displayName: string; email: string; role: string; isActive: boolean; wallet?: { pointsBalance: number; cashBalanceVnd: number } }> };
  const creatorVerifications = data.creatorVerifications as Array<{ id: string; account: { displayName: string; email: string } }>;
  const brandVerifications = data.brandVerifications as Array<{ id: string; account: { displayName: string; email: string } }>;
  const campaignReviews = data.campaignReviews as Array<{ id: string; title: string; status: string }>;
  const proofs = data.proofs as Array<{ id: string; account: { displayName: string }; mission: { title: string; campaign: { title: string } } }>;
  const vouchers = data.vouchers as { items: Array<{ id: string; voucherCode: string; status: string; account: { email: string } }> ; logs: Array<{ id: string; action: string; createdAt: string }> };
  const finance = data.finance as { paymentTransactions: Array<{ id: string; provider: string; requestedAmountVnd: number; status: string }>; walletTransactions: Array<{ id: string; type: string; pointsDelta: number; cashDeltaVnd: number }>; payoutRequests: Array<{ id: string; amountVnd: number; status: string }>; brandPrepaidFunds: Array<{ userId: string; pointsBalance: number }> };
  const fraud = data.fraudRisk as { suspiciousContributions: Array<{ id: string; amountVnd: number }>; duplicatePayments: Array<{ idempotencyKey: string; _count: { _all: number } }>; spamProofs: Array<{ accountId: string; _count: { _all: number } }>; flaggedAccounts: Array<{ id: string; reason: string; score: number }> };
  const audit = data.auditLogs as { items: Array<{ id: string; action: string; targetType: string; targetId: string; createdAt: string; metadata?: unknown }> };

  return (
    <main className="container">
      <h1>Admin/Ops Dashboard</h1>
      {message ? <p>{message}</p> : null}

      <section>
        <h2>Dashboard Overview</h2>
        <table><tbody>
          <tr><td>Total users</td><td>{overview.totalUsers}</td></tr>
          <tr><td>Total creators</td><td>{overview.totalCreators}</td></tr>
          <tr><td>Total brands</td><td>{overview.totalBrands}</td></tr>
          <tr><td>Active campaigns</td><td>{overview.activeCampaigns}</td></tr>
          <tr><td>Pending reviews</td><td>{overview.pendingReviews}</td></tr>
          <tr><td>Total contributions</td><td>{overview.totalContributions.toLocaleString("vi-VN")}</td></tr>
          <tr><td>Fraud alerts</td><td>{overview.fraudAlerts}</td></tr>
        </tbody></table>
      </section>

      <section>
        <h2>Filters</h2>
        <form onSubmit={onFilter}>
          <input placeholder="User query" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
          <input placeholder="Voucher code" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} />
          <input placeholder="Audit action" value={auditAction} onChange={(e) => setAuditAction(e.target.value)} />
          <button type="submit">Apply</button>
        </form>
      </section>

      <section>
        <h2>User Management</h2>
        {users.items.length === 0 ? <p>Empty users.</p> : <table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Wallet</th><th>Action</th></tr></thead><tbody>
          {users.items.map((u) => <tr key={u.id}><td>{u.displayName}</td><td>{maskEmail(u.email)}</td><td>{u.role}</td><td>{u.isActive ? "Active" : "Locked"}</td><td>{u.wallet?.pointsBalance ?? 0}/{u.wallet?.cashBalanceVnd ?? 0}</td><td>{u.isActive ? <button onClick={() => post(`/api/admin/dashboard/users/${u.id}/lock`, {})}>Lock</button> : <button onClick={() => post(`/api/admin/dashboard/users/${u.id}/unlock`, {})}>Unlock</button>}</td></tr>)}
        </tbody></table>}
      </section>

      <section><h2>Creator Verification</h2>
        {creatorVerifications.length === 0 ? <p>Empty.</p> : creatorVerifications.map((r) => <p key={r.id}>{r.account.displayName} ({maskEmail(r.account.email)}) <button onClick={() => post(`/api/admin/dashboard/creator-verifications/${r.id}/approve`, {})}>Approve</button> <button onClick={() => post(`/api/admin/dashboard/creator-verifications/${r.id}/reject`, { reason: "Not enough evidence" })}>Reject</button></p>)}
      </section>

      <section><h2>Brand Verification</h2>
        {brandVerifications.length === 0 ? <p>Empty.</p> : brandVerifications.map((r) => <p key={r.id}>{r.account.displayName} ({maskEmail(r.account.email)}) <button onClick={() => post(`/api/admin/dashboard/brand-verifications/${r.id}/approve`, {})}>Approve</button> <button onClick={() => post(`/api/admin/dashboard/brand-verifications/${r.id}/reject`, { reason: "Invalid business info" })}>Reject</button></p>)}
      </section>

      <section><h2>Campaign Review</h2>
        {campaignReviews.length === 0 ? <p>No pending campaigns.</p> : campaignReviews.map((c) => <p key={c.id}>{c.title} <button onClick={() => post(`/api/admin/dashboard/campaign-reviews/${c.id}/decision`, { decision: "APPROVED" })}>Approve</button> <button onClick={() => post(`/api/admin/dashboard/campaign-reviews/${c.id}/decision`, { decision: "REJECTED", reason: "Policy mismatch" })}>Reject</button> <button onClick={() => post(`/api/admin/dashboard/campaign-reviews/${c.id}/decision`, { decision: "CHANGES_REQUESTED", reason: "Need brief update" })}>Request changes</button></p>)}
      </section>

      <section><h2>Proof Review</h2>
        {proofs.length === 0 ? <p>No pending proofs.</p> : proofs.map((p) => <p key={p.id}>{p.mission.campaign.title} - {p.mission.title} - {p.account.displayName} <button onClick={() => post(`/api/admin/dashboard/proofs/${p.id}/decision`, { decision: "APPROVED" })}>Approve</button> <button onClick={() => post(`/api/admin/dashboard/proofs/${p.id}/decision`, { decision: "REJECTED", reason: "Invalid proof" })}>Reject</button> <button onClick={() => post(`/api/admin/dashboard/proofs/${p.id}/decision`, { decision: "OVERRIDE_APPROVE", note: "Override brand decision" })}>Override approve</button></p>)}
      </section>

      <section><h2>Voucher Management</h2>
        {vouchers.items.length === 0 ? <p>Empty vouchers.</p> : vouchers.items.map((v) => <p key={v.id}>{v.voucherCode} - {v.status} - {maskEmail(v.account.email)}</p>)}
        <h3>Redemption Logs</h3>
        {vouchers.logs.length === 0 ? <p>Empty logs.</p> : vouchers.logs.map((l) => <p key={l.id}>{l.action} - {new Date(l.createdAt).toLocaleString("vi-VN")}</p>)}
      </section>

      <section><h2>Finance</h2>
        <p>Payment tx: {finance.paymentTransactions.length} | Wallet tx: {finance.walletTransactions.length} | Payout requests: {finance.payoutRequests.length} | Brand prepaid funds: {finance.brandPrepaidFunds.length}</p>
      </section>

      <section><h2>Fraud/Risk</h2>
        <p>Suspicious contributions: {fraud.suspiciousContributions.length}</p>
        <p>Duplicate payments: {fraud.duplicatePayments.length}</p>
        <p>Spam proof submissions: {fraud.spamProofs.length}</p>
        <p>Flagged accounts: {fraud.flaggedAccounts.length}</p>
      </section>

      <section><h2>Audit Logs</h2>
        {audit.items.length === 0 ? <p>Empty audit logs.</p> : <table><thead><tr><th>Action</th><th>Entity</th><th>Target</th><th>When</th><th>Before/After</th></tr></thead><tbody>
          {audit.items.map((a) => <tr key={a.id}><td>{a.action}</td><td>{a.targetType}</td><td>{a.targetId.slice(0, 8)}***</td><td>{new Date(a.createdAt).toLocaleString("vi-VN")}</td><td>{a.metadata ? JSON.stringify(a.metadata).slice(0, 80) : "N/A"}</td></tr>)}
        </tbody></table>}
      </section>
    </main>
  );
}
