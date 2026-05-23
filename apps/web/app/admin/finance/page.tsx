"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type FinanceOverview = {
  campaignRevenueVnd: number;
  creatorCommissionVnd: number;
  payoutPendingCount: number;
  payoutApprovedCount: number;
  payoutRejectedCount: number;
  payoutPaidCount: number;
  payoutPendingAmountVnd: number;
  paymentFailedCount: number;
};

type FraudData = {
  suspiciousContributions: Array<{ id: string; amountVnd: number }>;
  duplicatePayments: Array<{ idempotencyKey: string; _count: { _all: number } }>;
  spamProofs: Array<{ accountId: string; _count: { _all: number } }>;
  flaggedAccounts: Array<{ id: string; reason: string; score: number }>;
};

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [fraud, setFraud] = useState<FraudData | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [fRes, rRes] = await Promise.all([
        fetch("/api/admin/finance/overview", { cache: "no-store" }),
        fetch("/api/admin/dashboard/fraud-risk", { cache: "no-store" })
      ]);
      const fBody = await fRes.json();
      const rBody = await rRes.json();
      if (!fRes.ok || !fBody.success) throw new Error(fBody.error ?? "Load finance failed");
      if (!rRes.ok || !rBody.success) throw new Error(rBody.error ?? "Load fraud failed");
      setFinance(fBody.data);
      setFraud(rBody.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load finance failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <><PageHeader title="Finance CMS" subtitle="Theo dõi tài chính và rủi ro hệ thống." /><LoadingSkeleton rows={4} /></>;
  if (error || !finance || !fraud) return <ErrorState title="Không tải được dữ liệu finance" description={error ?? "Unknown error"} onRetry={() => void load()} />;

  return (
    <>
      <PageHeader title="Finance CMS" subtitle="Theo dõi doanh thu, commission, payout và tín hiệu fraud." action={<div className="flex gap-2"><Link className="dc-btn-primary" href="/admin/payouts">Open payouts</Link><button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button></div>} />
      <section className="dc-grid-dashboard">
        <StatsCard title="Campaign revenue" value={`${finance.campaignRevenueVnd.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Creator commission" value={`${finance.creatorCommissionVnd.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Payout pending" value={`${finance.payoutPendingCount}`} hint={`${finance.payoutPendingAmountVnd.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Payout approved" value={`${finance.payoutApprovedCount}`} />
        <StatsCard title="Payout paid" value={`${finance.payoutPaidCount}`} />
        <StatsCard title="Payout rejected" value={`${finance.payoutRejectedCount}`} />
        <StatsCard title="Payment failed" value={`${finance.paymentFailedCount}`} />
        <StatsCard title="Flagged Accounts" value={`${fraud.flaggedAccounts.length}`} />
      </section>

      <section className="mt-8 dc-card p-4">
        <SectionHeader title="Fraud Signals" subtitle="Rủi ro cần ưu tiên xử lý" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Suspicious contributions" value={`${fraud.suspiciousContributions.length}`} />
          <StatsCard title="Duplicate payments" value={`${fraud.duplicatePayments.length}`} />
          <StatsCard title="Spam proofs" value={`${fraud.spamProofs.length}`} />
          <StatsCard title="Flagged accounts" value={`${fraud.flaggedAccounts.length}`} />
        </div>
      </section>
    </>
  );
}
