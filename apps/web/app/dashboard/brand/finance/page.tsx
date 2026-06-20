"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
type BrandFinanceData = {
  kpis?: {
    totalOrders: number;
    totalRevenueVnd: number;
    totalCommissionPaidVnd: number;
  };
  campaignPerformance?: Array<{ id: string; title: string; revenueVnd: number; commissionPaidVnd: number; orderCount: number }>;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

export default function BrandFinancePage() {
  const [data, setData] = useState<BrandFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/analytics", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<BrandFinanceData>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải dữ liệu tài chính");
      setData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu tài chính");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Tài chính nhãn hàng" subtitle="Theo dõi doanh thu, đơn hàng và hoa hồng nhà sáng tạo theo chiến dịch / nhiệm vụ." />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không thể tải dữ liệu tài chính" description={error} onRetry={() => void load()} /> : null}
      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng đơn hàng" value={`${data.kpis?.totalOrders ?? 0}`} />
            <StatsCard title="Tổng doanh thu" value={formatVnd(data.kpis?.totalRevenueVnd ?? 0)} />
            <StatsCard title="Hoa hồng nhà sáng tạo" value={formatVnd(data.kpis?.totalCommissionPaidVnd ?? 0)} />
          </section>
          <section className="mt-6 grid gap-3">
            {(data.campaignPerformance ?? []).map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-600">Đơn hàng: {item.orderCount}</p>
                <p className="text-sm text-zinc-600">Doanh thu: {formatVnd(item.revenueVnd)}</p>
                <p className="text-sm text-zinc-600">Hoa hồng: {formatVnd(item.commissionPaidVnd)}</p>
              </article>
            ))}
          </section>
          {(data.campaignPerformance ?? []).length === 0 ? <EmptyState title="Chưa có dữ liệu tài chính" description="Dữ liệu sẽ xuất hiện khi chiến dịch / nhiệm vụ có đơn hàng hoặc hoa hồng." /> : null}
        </>
      ) : null}
    </>
  );
}
