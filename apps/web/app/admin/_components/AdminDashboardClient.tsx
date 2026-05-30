"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";
import { AdminQueueCard } from "@/app/admin/_components/AdminQueueCard";
import { AdminStatCard } from "@/app/admin/_components/AdminStatCard";
import { AuditTimeline } from "@/app/admin/_components/AuditTimeline";
import { SystemAlertCard } from "@/app/admin/_components/SystemAlertCard";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type AdminOverview = {
  queues: {
    brandPendingReview: number;
    creatorPendingReview: number;
    campaignPendingReview: number;
    creatorApplicationsPendingReview: number;
    contentSubmissionsPendingReview: number;
    productInventoryPendingReview: number;
    fulfillmentPendingIssues: number;
    payoutPendingReview: number;
  };
  totals: {
    activeCampaigns: number;
    activeBrands: number;
    activeCreators: number;
  };
  paymentFailed: number;
  payoutPending: number;
  fraudFlags: number;
  campaignOverdue: number;
  systemAlerts: string[];
};
type AuditLog = { id: string; action: string; targetType: string; targetId: string; createdAt: string };

async function getOverview() {
  const res = await fetch("/api/admin/dashboard/overview", { cache: "no-store" });
  const body = (await res.json()) as ApiResult<AdminOverview>;
  if (!res.ok || !body.success) throw new Error(body.error ?? "Tải dữ liệu tổng quan thất bại");
  return body.data;
}
async function getRecentAuditLogs() {
  const res = await fetch("/api/admin/dashboard/audit-logs?page=1&limit=8", { cache: "no-store" });
  const body = (await res.json()) as ApiResult<{ items: AuditLog[] }>;
  if (!res.ok || !body.success) throw new Error(body.error ?? "Tải audit timeline thất bại");
  return body.data.items;
}

const queueCards: Array<{ key: keyof AdminOverview["queues"]; title: string; href: string }> = [
  { key: "brandPendingReview", title: "Brand pending", href: "/admin/brands" },
  { key: "creatorPendingReview", title: "Creator pending", href: "/admin/creators" },
  { key: "campaignPendingReview", title: "Campaign cần xử lý", href: "/admin/campaigns" },
  { key: "contentSubmissionsPendingReview", title: "Proof/video pending", href: "/admin/proofs" },
  { key: "payoutPendingReview", title: "Payout pending", href: "/admin/payouts" },
];

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [auditItems, setAuditItems] = useState<AuditLog[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewData, auditData] = await Promise.all([getOverview(), getRecentAuditLogs()]);
      setOverview(overviewData);
      setAuditItems(auditData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải dữ liệu tổng quan thất bại");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalQueue = useMemo(() => {
    if (!overview) return 0;
    return queueCards.reduce((sum, card) => sum + overview.queues[card.key], 0);
  }, [overview]);

  if (loading) {
    return (
      <>
        <PageHeader title="Admin Command Center" subtitle="Hàng chờ xử lý và cảnh báo vận hành." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !overview) {
    return <ErrorState title="Không tải được Admin Command Center" description={error || "Lỗi không xác định"} onRetry={() => void refresh()} />;
  }

  return (
    <>
      <PageHeader
        title="Admin Command Center"
        subtitle="Ưu tiên xử lý các queue pending trước khi theo dõi KPI tổng."
        action={<button className="dc-btn-secondary" onClick={() => void refresh()}>Làm mới</button>}
      />

      <section className="dc-grid-dashboard">
        <AdminStatCard title="Tổng queue cần xử lý" value={totalQueue} />
        <AdminStatCard title="Campaign active" value={overview.totals.activeCampaigns} />
        <AdminStatCard title="Brand active" value={overview.totals.activeBrands} />
        <AdminStatCard title="Creator active" value={overview.totals.activeCreators} />
        <AdminStatCard title="Payment failed (24h)" value={overview.paymentFailed} />
        <AdminStatCard title="Payout pending" value={overview.payoutPending} />
        <AdminStatCard title="Fraud flags" value={overview.fraudFlags} />
        <AdminStatCard title="Campaign overdue" value={overview.campaignOverdue} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Queue xử lý" subtitle="Nhấn vào card để mở module tương ứng." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {queueCards.map((card) => (
            <AdminQueueCard key={card.key} title={card.title} value={overview.queues[card.key]} href={card.href} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader title="Cảnh báo hệ thống" subtitle="Dựa trên fraud flags, payout queue và payment failures." />
        {overview.systemAlerts.length === 0 ? (
          <EmptyState title="Không có cảnh báo nghiêm trọng" description="Hệ thống đang ổn định theo ngưỡng cảnh báo hiện tại." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {overview.systemAlerts.map((alert) => (
              <SystemAlertCard key={alert} title="System Alert" detail={alert} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeader title="Recent Activity / Audit Timeline" subtitle="Các thao tác Admin/Ops gần nhất." action={<Link className="dc-btn-secondary" href="/admin/audit-log">Mở đầy đủ</Link>} />
        <AuditTimeline items={auditItems} />
      </section>
    </>
  );
}
