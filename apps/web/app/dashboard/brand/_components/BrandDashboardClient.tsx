"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActionToast,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatsCard,
  StatusBadge
} from "@/app/components/dcreator/ui/base";
import { useCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";

type ApiResult<T> = { success: boolean; data: T; error?: string };

async function load<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as ApiResult<T>;
  if (!res.ok || !payload.success) throw new Error(payload.error ?? "Tải dữ liệu thất bại");
  return payload.data;
}

export function BrandDashboardClient() {
  const searchParams = useSearchParams();
  const { currentBrandId } = useCurrentBrand();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [message] = useState("");

  const apiPath = useCallback((path: string) => {
    if (!currentBrandId) return path;
    return `${path}?brandId=${encodeURIComponent(currentBrandId)}`;
  }, [currentBrandId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, campaigns] = await Promise.all([
        load(apiPath("/api/brand/dashboard/overview")),
        load(apiPath("/api/brand/dashboard/campaigns"))
      ]);
      setData({ overview, campaigns });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState title="Không thể tải Brand Dashboard" description={error} onRetry={() => void refresh()} />;

  const overview = data.overview as { activeCampaigns: number; totalBudget: number; prepaidFundBalance: number; totalCreators: number; totalVideosSubmitted: number; totalSalesConversions: number };
  const campaigns = data.campaigns as Array<{ id: string; title: string; status: string }>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bảng điều khiển Nhãn hàng"
        subtitle="Theo dõi campaign, creator application, proof review và vận hành Brand."
        action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Yêu cầu Admin tạo campaign</Link>}
      />
      {searchParams.get("created") === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">Brand đã được tạo</p>
          <p>Bạn có thể bắt đầu thiết lập sản phẩm/campaign.</p>
        </div>
      ) : null}
      {message ? <ActionToast message={message === "Thành công" ? "Cập nhật thành công" : message} /> : null}
      <section>
        <div className="dc-grid-dashboard">
          <StatsCard title="Campaign đang chạy" value={`${overview?.activeCampaigns ?? 0}`} />
          <StatsCard title="Tổng ngân sách" value={`${(overview?.totalBudget ?? 0).toLocaleString("vi-VN")} VND`} />
          <StatsCard title="Quỹ prepaid" value={`${(overview?.prepaidFundBalance ?? 0).toLocaleString("vi-VN")} VND`} />
          <StatsCard title="Creator tham gia" value={`${overview?.totalCreators ?? 0}`} />
        </div>
      </section>

      <section>
        <SectionHeader title="Tất cả các campaign" action={<Link href="/brand" className="dc-btn-secondary">Xem campaign public</Link>} />
        {campaigns?.length ? (
          <div className="grid gap-3">
            {campaigns.map((c) => (
              <article key={c.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-zinc-900">{c.title}</p>
                  <StatusBadge status={c.status.toLowerCase()} />
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Chưa có campaign" description="Gửi yêu cầu để Admin tạo campaign/job cho brand." />}
      </section>
    </div>
  );
}
