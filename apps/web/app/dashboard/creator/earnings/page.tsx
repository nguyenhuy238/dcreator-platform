"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
type CreatorEarningsData = {
  commissionEarnedVnd: number;
  commissionPendingVnd: number;
  revenueGeneratedVnd: number;
  topCampaign?: { id: string; title: string; commissionVnd: number } | null;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

export default function CreatorEarningsPage() {
  const [data, setData] = useState<CreatorEarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/analytics", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CreatorEarningsData>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải earnings");
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải earnings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Thu nhập nhà sáng tạo" subtitle="Theo dõi hoa hồng, doanh thu tạo ra và chiến dịch / nhiệm vụ hiệu quả." />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không thể tải earnings" description={error} onRetry={() => void load()} /> : null}
      {!loading && data ? (
        <section className="dc-grid-dashboard">
          <StatsCard title="Tổng hoa hồng" value={formatVnd(data.commissionEarnedVnd)} />
          <StatsCard title="Hoa hồng chờ đối soát" value={formatVnd(data.commissionPendingVnd)} />
          <StatsCard title="Doanh thu tạo ra" value={formatVnd(data.revenueGeneratedVnd)} />
          <StatsCard title="Chiến dịch hiệu quả nhất" value={data.topCampaign?.title ?? "Chưa có"} />
        </section>
      ) : null}
      {!loading && !data && !error ? <EmptyState title="Chưa có dữ liệu earnings" description="Dữ liệu sẽ xuất hiện khi bạn hoàn thành job và phát sinh hoa hồng." /> : null}
    </>
  );
}
