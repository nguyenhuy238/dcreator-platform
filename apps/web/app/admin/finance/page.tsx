"use client";

import { useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type FinanceData = {
  paymentTransactions: Array<{ id: string; provider: string; requestedAmountVnd: number; status: string; createdAt?: string }>;
  walletTransactions: Array<{ id: string; type: string; pointsDelta: number; cashDeltaVnd: number; createdAt?: string }>;
  payoutRequests: Array<{ id: string; amountVnd: number; status: string; createdAt?: string }>;
  brandPrepaidFunds: Array<{ userId: string; pointsBalance: number; cashBalanceVnd: number }>;
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
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [fraud, setFraud] = useState<FraudData | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [fRes, rRes] = await Promise.all([
        fetch("/api/admin/dashboard/finance", { cache: "no-store" }),
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

  const totalPayout = finance.payoutRequests.reduce((sum, p) => sum + p.amountVnd, 0);
  const totalBrandFund = finance.brandPrepaidFunds.reduce((sum, b) => sum + b.cashBalanceVnd, 0);

  return (
    <>
      <PageHeader title="Finance CMS" subtitle="Theo dõi thanh toán, payout và tín hiệu fraud." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-grid-dashboard">
        <StatsCard title="Payment Tx" value={`${finance.paymentTransactions.length}`} />
        <StatsCard title="Payout Requests" value={`${finance.payoutRequests.length}`} hint={`${totalPayout.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Brand Funds" value={`${totalBrandFund.toLocaleString("vi-VN")} VND`} />
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
