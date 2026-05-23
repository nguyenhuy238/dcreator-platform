"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type AnalyticsData = {
  jobAccepted: number;
  proofSubmitted: number;
  proofApproved: number;
  commissionEarnedVnd: number;
  contributionDriven: number;
  contributionDrivenVnd: number;
  salesConversions: number;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function CreatorAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/analytics", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<AnalyticsData>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải analytics");
      }
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const approvalRate = useMemo(() => formatPercent(data?.proofApproved ?? 0, data?.proofSubmitted ?? 0), [data?.proofApproved, data?.proofSubmitted]);

  return (
    <>
      <PageHeader title="KPI / Analytics" subtitle="Theo dõi hiệu suất campaign, tỷ lệ duyệt proof và thu nhập Creator." />
      {error ? <ErrorState title="Không thể tải analytics" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng campaign tham gia" value={`${data.jobAccepted}`} />
            <StatsCard title="Tổng nhiệm vụ hoàn thành" value={`${data.proofApproved}`} />
            <StatsCard title="Tổng proof đã nộp" value={`${data.proofSubmitted}`} />
            <StatsCard title="Tổng hoa hồng" value={formatVnd(data.commissionEarnedVnd)} />
            <StatsCard title="Tỷ lệ duyệt proof" value={approvalRate} />
            <StatsCard title="Đóng góp chuyển đổi" value={`${data.salesConversions}`} hint={formatVnd(data.contributionDrivenVnd)} />
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="dc-card p-4">
              <SectionHeader title="Hiệu suất proof" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Proof đã nộp: <span className="font-semibold text-zinc-900">{data.proofSubmitted}</span></p>
                <p>Proof được duyệt: <span className="font-semibold text-zinc-900">{data.proofApproved}</span></p>
                <p>Tỷ lệ duyệt: <span className="font-semibold text-zinc-900">{approvalRate}</span></p>
              </div>
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Hiệu suất doanh thu" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Hoa hồng tích luỹ: <span className="font-semibold text-zinc-900">{formatVnd(data.commissionEarnedVnd)}</span></p>
                <p>Giá trị đóng góp campaign: <span className="font-semibold text-zinc-900">{formatVnd(data.contributionDrivenVnd)}</span></p>
                <p>Số chuyển đổi: <span className="font-semibold text-zinc-900">{data.contributionDriven}</span></p>
              </div>
            </article>
          </section>
        </>
      ) : null}

      {!loading && !data && !error ? <EmptyState title="Chưa có dữ liệu analytics" description="Dữ liệu sẽ xuất hiện sau khi bạn tham gia và hoàn thành nhiệm vụ." /> : null}
    </>
  );
}
