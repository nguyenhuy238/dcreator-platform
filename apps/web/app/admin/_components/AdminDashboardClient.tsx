"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
} from "@/app/components/dcreator/ui/base";
import { AdminQueueCard } from "@/app/admin/_components/AdminQueueCard";
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
type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

async function getOverview() {
  const res = await fetch("/api/admin/dashboard/overview", {
    cache: "no-store",
  });
  const body = (await res.json()) as ApiResult<AdminOverview>;
  if (!res.ok || !body.success)
    throw new Error(body.error ?? "Tải dữ liệu tổng quan thất bại");
  return body.data;
}
async function getRecentAuditLogs() {
  const res = await fetch("/api/admin/dashboard/audit-logs?page=1&limit=8", {
    cache: "no-store",
  });
  const body = (await res.json()) as ApiResult<{ items: AuditLog[] }>;
  if (!res.ok || !body.success)
    throw new Error(body.error ?? "Tải audit timeline thất bại");
  return body.data.items;
}

const queueCards: Array<{
  key: keyof AdminOverview["queues"];
  title: string;
  href: string;
}> = [
  {
    key: "brandPendingReview",
    title: "Brand cần giám sát",
    href: "/admin/brands",
  },
  {
    key: "creatorPendingReview",
    title: "Creator cần giám sát",
    href: "/admin/creators",
  },
  {
    key: "campaignPendingReview",
    title: "Campaign cần xử lý",
    href: "/admin/campaigns",
  },
  {
    key: "contentSubmissionsPendingReview",
    title: "Duyệt nhiệm vụ Creator",
    href: "/admin/mission-reviews",
  },
  {
    key: "payoutPendingReview",
    title: "Payout pending",
    href: "/admin/payouts",
  },
];

function PriorityActionCard({
  title,
  value,
  href,
  priority,
  description,
}: {
  title: string;
  value: number;
  href: string;
  priority: "critical" | "high" | "normal";
  description: string;
}) {
  const active = value > 0;
  const priorityLabel =
    priority === "critical"
      ? "Critical"
      : priority === "high"
        ? "High"
        : "Normal";
  return (
    <article
      className={`flex min-h-44 flex-col rounded-2xl border p-4 shadow-sm transition ${active ? "border-zinc-900 bg-white shadow-md" : "border-zinc-200 bg-white/70 opacity-75"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-800">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
            {description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-100 text-zinc-500"}`}
        >
          {priorityLabel}
        </span>
      </div>
      <p
        className={`mt-4 text-4xl font-black ${active ? "text-zinc-900" : "text-zinc-400"}`}
      >
        {value}
      </p>
      <Link
        href={href}
        className={`mt-auto inline-flex min-w-[72px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold leading-5 transition ${active ? "bg-zinc-950 text-white hover:bg-zinc-800" : "border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"}`}
      >
        <span className={active ? "text-white" : "text-zinc-600"}>Xử lý</span>
      </Link>
    </article>
  );
}

function HealthCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-zinc-900">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </article>
  );
}

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [auditItems, setAuditItems] = useState<AuditLog[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewData, auditData] = await Promise.all([
        getOverview(),
        getRecentAuditLogs(),
      ]);
      setOverview(overviewData);
      setAuditItems(auditData);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Tải dữ liệu tổng quan thất bại",
      );
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
        <PageHeader
          title="Admin Command Center"
          subtitle="Ưu tiên xử lý campaign, verification, payout, proof và rủi ro hệ thống."
        />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !overview) {
    return (
      <ErrorState
        title="Không tải được Admin Command Center"
        description={error || "Lỗi không xác định"}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Admin Command Center"
        subtitle="Ưu tiên xử lý campaign, verification, payout, proof và rủi ro hệ thống."
        action={
          <button className="dc-btn-secondary" onClick={() => void refresh()}>
            Làm mới
          </button>
        }
      />

      <section id="now" className="scroll-mt-24">
        <SectionHeader
          title="Việc cần xử lý ngay"
          subtitle="Các queue có rủi ro vận hành cao được đưa lên trước KPI tổng."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <PriorityActionCard
            title="Campaign chờ duyệt"
            value={overview.queues.campaignPendingReview}
            href="/admin/campaigns"
            priority="critical"
            description="Yêu cầu campaign/job cần tạo, duyệt hoặc yêu cầu bổ sung."
          />
          <PriorityActionCard
            title="Proof chờ duyệt"
            value={overview.queues.contentSubmissionsPendingReview}
            href="/admin/mission-reviews"
            priority="critical"
            description="Proof, video hoặc báo cáo Creator đang chờ Ops xử lý."
          />
          <PriorityActionCard
            title="Payout pending"
            value={overview.payoutPending}
            href="/admin/payouts"
            priority="critical"
            description="Yêu cầu payout Creator cần duyệt hoặc xác nhận chi trả."
          />
          <PriorityActionCard
            title="Payment failed"
            value={overview.paymentFailed}
            href="/admin/finance"
            priority="high"
            description="Thanh toán lỗi trong 24 giờ cần rà soát và đối soát."
          />
          <PriorityActionCard
            title="Fraud flags"
            value={overview.fraudFlags}
            href="/admin/risk"
            priority="critical"
            description="Tín hiệu gian lận hoặc lạm dụng cần kiểm tra."
          />
          <PriorityActionCard
            title="Chờ xác minh"
            value={
              overview.queues.brandPendingReview +
              overview.queues.creatorPendingReview
            }
            href="/admin/creators"
            priority="high"
            description="Brand/Creator cần xác minh hồ sơ hoặc giám sát rủi ro."
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Sức khỏe hệ thống"
          subtitle="KPI nền để theo dõi trạng thái vận hành dCreator."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <HealthCard
            title="Campaign active"
            value={overview.totals.activeCampaigns}
          />
          <HealthCard
            title="Brand active"
            value={overview.totals.activeBrands}
          />
          <HealthCard
            title="Creator active"
            value={overview.totals.activeCreators}
          />
          <HealthCard
            title="User active"
            value="--"
            hint="Chưa có trong overview API"
          />
          <HealthCard
            title="Voucher issued"
            value="--"
            hint="Chưa có trong overview API"
          />
          <HealthCard
            title="N-Points volume"
            value="--"
            hint="Chưa có trong overview API"
          />
        </div>
      </section>

      <section id="queues" className="mt-8 scroll-mt-24">
        <SectionHeader
          title="Queue xử lý"
          subtitle={`Tổng ${totalQueue.toLocaleString("vi-VN")} việc đang chờ trong các module vận hành.`}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {queueCards.map((card) => (
            <AdminQueueCard
              key={card.key}
              title={card.title}
              value={overview.queues[card.key]}
              href={card.href}
              description={
                card.key === "brandPendingReview"
                  ? "Theo dõi KYB, trạng thái vận hành và rủi ro Brand."
                  : card.key === "creatorPendingReview"
                    ? "Theo dõi xác minh, kênh social và trạng thái Creator."
                    : card.key === "campaignPendingReview"
                      ? "Duyệt yêu cầu campaign/job và cập nhật lifecycle."
                      : card.key === "contentSubmissionsPendingReview"
                        ? "Duyệt proof, video, báo cáo hoàn thành của Creator."
                        : "Duyệt payout và đối soát chi trả Creator."
              }
            />
          ))}
        </div>
      </section>

      <section id="alerts" className="mt-8 scroll-mt-24">
        <SectionHeader
          title="Cảnh báo hệ thống"
          subtitle="Fraud flags, payment failed, campaign overdue và health signals."
        />
        {overview.systemAlerts.length === 0 &&
        overview.fraudFlags === 0 &&
        overview.paymentFailed === 0 &&
        overview.campaignOverdue === 0 ? (
          <EmptyState
            title="Không có cảnh báo nghiêm trọng"
            description="Hệ thống đang ổn định theo ngưỡng cảnh báo hiện tại."
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {overview.fraudFlags > 0 ? (
              <SystemAlertCard
                title="Fraud flags"
                detail={`${overview.fraudFlags.toLocaleString("vi-VN")} tín hiệu rủi ro cần xử lý.`}
              />
            ) : null}
            {overview.paymentFailed > 0 ? (
              <SystemAlertCard
                title="Payment failed"
                detail={`${overview.paymentFailed.toLocaleString("vi-VN")} giao dịch lỗi trong 24 giờ.`}
              />
            ) : null}
            {overview.campaignOverdue > 0 ? (
              <SystemAlertCard
                title="Campaign overdue"
                detail={`${overview.campaignOverdue.toLocaleString("vi-VN")} campaign quá hạn cần rà soát.`}
              />
            ) : null}
            {overview.systemAlerts.length === 0 ? (
              <SystemAlertCard
                title="System health"
                detail="Không có cảnh báo health bổ sung từ hệ thống."
              />
            ) : null}
            {overview.systemAlerts.map((alert) => (
              <SystemAlertCard
                key={alert}
                title="System Alert"
                detail={alert}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Recent Activity / Audit Timeline"
          subtitle="Các thao tác Admin/Ops gần nhất."
          action={
            <Link className="dc-btn-secondary" href="/admin/audit-log">
              Mở đầy đủ
            </Link>
          }
        />
        <AuditTimeline items={auditItems} />
      </section>
    </>
  );
}
