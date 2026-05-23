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
      if (!fRes.ok || !fBody.success) throw new Error(fBody.error ?? "Tải dữ liệu tài chính thất bại");
      if (!rRes.ok || !rBody.success) throw new Error(rBody.error ?? "Tải dữ liệu rủi ro thất bại");
      setFinance(fBody.data);
      setFraud(rBody.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải dữ liệu tài chính thất bại");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <><PageHeader title="Bảng tài chính vận hành" subtitle="Theo dõi tài chính và rủi ro hệ thống." /><LoadingSkeleton rows={4} /></>;
  if (error || !finance || !fraud) return <ErrorState title="Không tải được dữ liệu finance" description={error ?? "Lỗi không xác định"} onRetry={() => void load()} />;

  return (
    <>
      <PageHeader title="Bảng tài chính vận hành" subtitle="Theo dõi doanh thu, hoa hồng, payout và tín hiệu rủi ro." action={<div className="flex gap-2"><Link className="dc-btn-primary" href="/admin/payouts">Mở payout</Link><button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button></div>} />
      <section className="dc-grid-dashboard">
        <StatsCard title="Doanh thu campaign" value={`${finance.campaignRevenueVnd.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Hoa hồng Creator" value={`${finance.creatorCommissionVnd.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Payout chờ duyệt" value={`${finance.payoutPendingCount}`} hint={`${finance.payoutPendingAmountVnd.toLocaleString("vi-VN")} VND`} />
        <StatsCard title="Payout đã duyệt" value={`${finance.payoutApprovedCount}`} />
        <StatsCard title="Payout đã chi trả" value={`${finance.payoutPaidCount}`} />
        <StatsCard title="Payout từ chối" value={`${finance.payoutRejectedCount}`} />
        <StatsCard title="Thanh toán lỗi" value={`${finance.paymentFailedCount}`} />
        <StatsCard title="Tài khoản bị gắn cờ" value={`${fraud.flaggedAccounts.length}`} />
      </section>

      <section className="mt-8 dc-card p-4">
        <SectionHeader title="Tín hiệu rủi ro" subtitle="Các cảnh báo cần ưu tiên xử lý" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Ủng hộ nghi ngờ" value={`${fraud.suspiciousContributions.length}`} />
          <StatsCard title="Thanh toán trùng lặp" value={`${fraud.duplicatePayments.length}`} />
          <StatsCard title="Proof spam" value={`${fraud.spamProofs.length}`} />
          <StatsCard title="Tài khoản bị gắn cờ" value={`${fraud.flaggedAccounts.length}`} />
        </div>
      </section>
    </>
  );
}
