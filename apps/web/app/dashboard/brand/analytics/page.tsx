"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type AnalyticsPayload = {
  kpis?: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalFundingVnd: number;
    totalBackers: number;
    totalCreatorParticipated: number;
    totalProofApproved: number;
    totalProofRejected: number;
    totalVoucherIssued: number;
    totalVoucherUsed: number;
    conversionRatePercent: number;
  };
  campaignPerformance?: Array<{
    id: string;
    title: string;
    fundedAmountVnd: number;
    backerCount: number;
    status?: string;
    targetAmountVnd?: number;
  }>;
  topCreator?: { id: string; displayName: string } | null;
  topProduct?: { id: string; title: string; stockTotal: number; stockRemaining: number } | null;
  voucherRedemption?: number;
  conversionRate?: number;
  topCampaign?: { id: string; title: string; fundedAmountVnd: number; backerCount: number } | null;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

export default function BrandAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/analytics", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<AnalyticsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải analytics");
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const perf = useMemo(() => data?.campaignPerformance ?? [], [data]);

  return (
    <>
      <PageHeader title="KPI / Analytics" subtitle="Theo dõi hiệu suất campaign, creator, proof và chuyển đổi." />

      {error ? <ErrorState title="Không thể tải analytics" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Tổng campaign" value={`${data.kpis?.totalCampaigns ?? 0}`} />
            <StatsCard title="Campaign active" value={`${data.kpis?.activeCampaigns ?? 0}`} />
            <StatsCard title="Tổng funding" value={formatVnd(data.kpis?.totalFundingVnd ?? 0)} />
            <StatsCard title="Tổng creator tham gia" value={`${data.kpis?.totalCreatorParticipated ?? 0}`} />
            <StatsCard title="Tổng applications/proof duyệt" value={`${(data.kpis?.totalProofApproved ?? 0) + (data.kpis?.totalProofRejected ?? 0)}`} />
            <StatsCard title="Voucher đã redeem" value={`${data.voucherRedemption ?? data.kpis?.totalVoucherUsed ?? 0}`} />
            <StatsCard title="Conversion rate" value={`${(data.kpis?.conversionRatePercent ?? 0).toFixed(2)}%`} />
            <StatsCard title="Giá trị TB/conversion" value={formatVnd(Number(data.conversionRate ?? 0))} />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="dc-card p-4">
              <SectionHeader title="Top campaign" />
              {data.topCampaign ? (
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{data.topCampaign.title}</p>
                  <p>Funding: {formatVnd(data.topCampaign.fundedAmountVnd)}</p>
                  <p>Backer: {data.topCampaign.backerCount.toLocaleString("vi-VN")}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có dữ liệu campaign.</p>
              )}
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Top creator" />
              {data.topCreator ? (
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{data.topCreator.displayName}</p>
                  <p>ID: {data.topCreator.id}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có dữ liệu creator.</p>
              )}
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Top product" />
              {data.topProduct ? (
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{data.topProduct.title}</p>
                  <p>Stock total: {data.topProduct.stockTotal.toLocaleString("vi-VN")}</p>
                  <p>Stock remaining: {data.topProduct.stockRemaining.toLocaleString("vi-VN")}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có dữ liệu sản phẩm.</p>
              )}
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Campaign performance" subtitle="Funding progress theo từng campaign" />
            {perf.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu performance" description="Performance campaign sẽ xuất hiện khi có campaign hoạt động." />
            ) : (
              <div className="grid gap-3">
                {perf.map((item) => {
                  const target = item.targetAmountVnd ?? item.fundedAmountVnd;
                  const percent = target > 0 ? Math.min(100, Math.round((item.fundedAmountVnd / target) * 100)) : 0;
                  return (
                    <article key={item.id} className="dc-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-zinc-900">{item.title}</p>
                        <p className="text-sm text-zinc-600">Backer: {item.backerCount.toLocaleString("vi-VN")}</p>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">Funding: {formatVnd(item.fundedAmountVnd)}</p>
                      <div className="mt-2 h-2 rounded-full bg-zinc-200"><div className="h-2 rounded-full bg-zinc-900" style={{ width: `${percent}%` }} /></div>
                      <p className="mt-1 text-xs text-zinc-500">{percent}%</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
