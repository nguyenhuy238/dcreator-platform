"use client";

import { useEffect, useState } from "react";

type ApiResult<T> = { success: boolean; data: T; error?: string };

async function load<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as ApiResult<T>;
  if (!res.ok || !payload.success) throw new Error(payload.error ?? "Load failed");
  return payload.data;
}

export function BrandDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [overview, profile, products, campaigns, applications, proofs, budget, analytics] = await Promise.all([
        load("/api/brand/dashboard/overview"),
        load("/api/brand/dashboard/profile"),
        load("/api/brand/dashboard/products"),
        load("/api/brand/dashboard/campaigns"),
        load("/api/brand/dashboard/creator-applications"),
        load("/api/brand/dashboard/proofs"),
        load("/api/brand/dashboard/budget"),
        load("/api/brand/dashboard/analytics")
      ]);
      setData({ overview, profile, products, campaigns, applications, proofs, budget, analytics });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = (await res.json()) as ApiResult<unknown>;
    setMessage(res.ok && payload.success ? "Success" : payload.error ?? "Failed");
    if (res.ok && payload.success) await refresh();
  }

  if (loading) return <main className="container"><h1>Brand Dashboard</h1><p>Loading dashboard...</p></main>;
  if (error) return <main className="container"><h1>Brand Dashboard</h1><p className="error">{error}</p></main>;

  const overview = data.overview as { activeCampaigns: number; totalBudget: number; prepaidFundBalance: number; totalCreators: number; totalVideosSubmitted: number; totalSalesConversions: number };
  const profile = data.profile as { brandName: string; logoUrl: string; businessInfo: string; verificationStatus: string };
  const products = data.products as Array<{ id: string; name: string; sku: string; stockQty: number; voucherStock: number; campaignEligibility: boolean }>;
  const campaigns = data.campaigns as Array<{ id: string; title: string; status: string }>;
  const applications = data.applications as Array<{
    id: string;
    account: {
      displayName: string;
      creatorProfile: { mainPlatform: string; socialUrl: string; followerCount: number | null } | null;
    };
    mission: { title: string };
  }>;
  const proofs = data.proofs as Array<{ id: string; account: { displayName: string }; mission: { title: string }; videoUrl: string | null }>;
  const budget = data.budget as { prepaidFundBalance: number; transactionHistory: Array<{ id: string; type: string; pointsDelta: number }> };
  const analytics = data.analytics as {
    campaignPerformance: Array<{ id: string; title: string; fundedAmountVnd: number }>;
    topCreator: { displayName: string } | null;
    topProduct: { title: string } | null;
    voucherRedemption: number;
    conversionRate: number;
    kpis?: {
      campaignViews: number;
      ctaRate: number;
      contributionConversion: number;
      totalFundedVnd: number;
      topCreator: { displayName: string } | null;
      rewardClaimRate: number;
      voucherRedemptionRate: number;
    };
  };

  return (
    <main className="container">
      <h1>Brand Dashboard</h1>
      {message ? <p>{message}</p> : null}

      <section>
        <h2>Overview</h2>
        <ul>
          <li>Active campaigns: {overview?.activeCampaigns ?? 0}</li>
          <li>Total budget: {(overview?.totalBudget ?? 0).toLocaleString("vi-VN")} VND</li>
          <li>Prepaid fund balance: {overview?.prepaidFundBalance ?? 0}</li>
          <li>Total creators: {overview?.totalCreators ?? 0}</li>
          <li>Total videos submitted: {overview?.totalVideosSubmitted ?? 0}</li>
          <li>Total sales/conversions: {(overview?.totalSalesConversions ?? 0).toLocaleString("vi-VN")}</li>
        </ul>
      </section>

      <section>
        <h2>Brand Profile</h2>
        {!profile ? <p>Empty profile.</p> : <>
          <p>Brand name: {profile.brandName || "N/A"}</p>
          <p>Logo: {profile.logoUrl || "N/A"}</p>
          <p>Business info: {profile.businessInfo || "N/A"}</p>
          <p>Verification status: {profile.verificationStatus}</p>
        </>}
      </section>

      <section>
        <h2>Product/SKU Management</h2>
        {products?.length ? products.map((p) => <p key={p.id}>{p.name} ({p.sku}) - stock: {p.stockQty} - voucher: {p.voucherStock} - eligible: {String(p.campaignEligibility)}</p>) : <p>Chưa có product.</p>}
      </section>

      <section>
        <h2>Campaign Management</h2>
        {campaigns?.length ? campaigns.map((c) => (
          <p key={c.id}>{c.title} - {c.status} <button onClick={() => postJson(`/api/brand/dashboard/campaigns/${c.id}/submit-review`, {})}>Submit for admin review</button></p>
        )) : <p>Chưa có campaign.</p>}
      </section>

      <section>
        <h2>Reward Management</h2>
        <button onClick={() => postJson("/api/brand/dashboard/rewards", { campaignId: campaigns?.[0]?.id, title: "Default reward", stockTotal: 10, priceVnd: 100000, pricePoints: 1000 })}>Add reward tier (sample)</button>
      </section>

      <section>
        <h2>Creator Applications</h2>
        {applications?.length ? applications.map((a) => (
          <p key={a.id}>
            {a.account.displayName} - {a.mission.title}
            {a.account.creatorProfile ? ` | ${a.account.creatorProfile.mainPlatform} | ${a.account.creatorProfile.socialUrl} | Followers: ${a.account.creatorProfile.followerCount ?? 0}` : " | Chưa có hồ sơ Creator"}
            {" "}
            <button onClick={() => postJson("/api/brand/dashboard/creator-applications", { submissionId: a.id, decision: "APPROVED" })}>Approve</button>{" "}
            <button onClick={() => postJson("/api/brand/dashboard/creator-applications", { submissionId: a.id, decision: "REJECTED", note: "Not fit" })}>Reject</button>
          </p>
        )) : <p>Không có creator applications.</p>}
      </section>

      <section>
        <h2>Proof Review</h2>
        {proofs?.length ? proofs.map((p) => (
          <p key={p.id}>{p.account.displayName} - {p.mission.title} - {p.videoUrl || "No video"} <button onClick={() => postJson("/api/brand/dashboard/proofs", { submissionId: p.id, decision: "APPROVED" })}>Approve</button> <button onClick={() => postJson("/api/brand/dashboard/proofs", { submissionId: p.id, decision: "REVISION", rejectReason: "Need better angle" })}>Request revision</button></p>
        )) : <p>Không có proof cần review.</p>}
      </section>

      <section>
        <h2>Budget/Prepaid Fund</h2>
        <p>Current prepaid balance: {budget?.prepaidFundBalance ?? 0}</p>
        <button onClick={() => postJson("/api/brand/dashboard/budget/topup", { amountVnd: 500000, idempotencyKey: `topup_${Date.now()}` })}>Top-up sample</button>
        <button onClick={() => postJson("/api/brand/dashboard/budget/lock", { campaignId: campaigns?.[0]?.id, amountVnd: 100000, idempotencyKey: `lock_${Date.now()}` })}>Lock budget sample</button>
        <h3>Transaction history</h3>
        {budget?.transactionHistory?.length ? budget.transactionHistory.map((t) => <p key={t.id}>{t.type}: {t.pointsDelta}</p>) : <p>Không có transaction.</p>}
      </section>

      <section>
        <h2>Analytics</h2>
        <p>Campaign views: {analytics?.kpis?.campaignViews ?? 0}</p>
        <p>CTA rate: {analytics?.kpis?.ctaRate ?? 0}%</p>
        <p>Contribution conversion: {analytics?.kpis?.contributionConversion ?? 0}%</p>
        <p>Total funded: {(analytics?.kpis?.totalFundedVnd ?? 0).toLocaleString("vi-VN")} VND</p>
        <p>Top creator (KPI): {analytics?.kpis?.topCreator?.displayName || "N/A"}</p>
        <p>Reward claim rate: {analytics?.kpis?.rewardClaimRate ?? 0}%</p>
        <p>Voucher redemption rate: {analytics?.kpis?.voucherRedemptionRate ?? 0}%</p>
        <p>Top creator: {analytics?.topCreator?.displayName || "N/A"}</p>
        <p>Top product: {analytics?.topProduct?.title || "N/A"}</p>
        <p>Voucher redemption: {analytics?.voucherRedemption ?? 0}</p>
        <p>Conversion rate: {analytics?.conversionRate ?? 0}</p>
        {analytics?.campaignPerformance?.length ? analytics.campaignPerformance.map((c) => <p key={c.id}>{c.title}: {c.fundedAmountVnd.toLocaleString("vi-VN")} VND</p>) : <p>Empty analytics.</p>}
      </section>
    </main>
  );
}
