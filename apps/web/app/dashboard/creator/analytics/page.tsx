"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type AnalyticsData = {
  jobAccepted: number;
  jobsDoing: number;
  jobsCompleted: number;
  proofSubmitted: number;
  proofApproved: number;
  proofRejected: number;
  revenueGeneratedVnd: number;
  commissionEarnedVnd: number;
  commissionPendingVnd: number;
  topCampaign?: { id: string; title: string; commissionVnd: number } | null;
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
      <PageHeader title="Phân tích chỉ số" subtitle="Theo dõi hiệu suất chiến dịch, tỷ lệ duyệt bằng chứng và thu nhập nhà sáng tạo." />
      {error ? <ErrorState title="Không thể tải dữ liệu phân tích" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng chiến dịch tham gia" value={`${data.jobAccepted}`} />
            <StatsCard title="Nhiệm vụ đang làm" value={`${data.jobsDoing}`} />
            <StatsCard title="Nhiệm vụ hoàn thành" value={`${data.jobsCompleted}`} />
            <StatsCard title="Tổng bằng chứng đã nộp" value={`${data.proofSubmitted}`} />
            <StatsCard title="Bằng chứng được duyệt" value={`${data.proofApproved}`} />
            <StatsCard title="Bằng chứng bị từ chối" value={`${data.proofRejected}`} />
            <StatsCard title="Doanh thu tạo ra" value={formatVnd(data.revenueGeneratedVnd)} />
            <StatsCard title="Hoa hồng đã nhận" value={formatVnd(data.commissionEarnedVnd)} />
            <StatsCard title="Hoa hồng chờ đối soát" value={formatVnd(data.commissionPendingVnd)} />
            <StatsCard title="Tỷ lệ duyệt bằng chứng" value={approvalRate} />
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="dc-card p-4">
              <SectionHeader title="Hiệu suất bằng chứng" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Bằng chứng đã nộp: <span className="font-semibold text-zinc-900">{data.proofSubmitted}</span></p>
                <p>Bằng chứng được duyệt: <span className="font-semibold text-zinc-900">{data.proofApproved}</span></p>
                <p>Bằng chứng bị từ chối: <span className="font-semibold text-zinc-900">{data.proofRejected}</span></p>
                <p>Tỷ lệ duyệt: <span className="font-semibold text-zinc-900">{approvalRate}</span></p>
              </div>
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Hiệu suất doanh thu" />
              <div className="grid gap-2 text-sm text-zinc-600">
                <p>Doanh thu tạo ra: <span className="font-semibold text-zinc-900">{formatVnd(data.revenueGeneratedVnd)}</span></p>
                <p>Hoa hồng đã nhận: <span className="font-semibold text-zinc-900">{formatVnd(data.commissionEarnedVnd)}</span></p>
                <p>Hoa hồng chờ đối soát: <span className="font-semibold text-zinc-900">{formatVnd(data.commissionPendingVnd)}</span></p>
                <p>Chiến dịch hiệu quả nhất: <span className="font-semibold text-zinc-900">{data.topCampaign?.title ?? "Chưa có"}</span></p>
              </div>
            </article>
          </section>
        </>
      ) : null}

      {!loading && !data && !error ? <EmptyState title="Chưa có dữ liệu phân tích" description="Dữ liệu sẽ xuất hiện sau khi bạn tham gia và hoàn thành nhiệm vụ." /> : null}
    </>
  );
}
