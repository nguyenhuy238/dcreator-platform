"use client";

import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type CampaignItem = {
  id: string;
  title: string;
  status: string;
  budgetVnd: number;
  fundedAmountVnd: number;
  backerCount: number;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const nav = [
  { href: "/dashboard/brand", label: "Bảng điều khiển Nhãn hàng" },
  { href: "/dashboard/brand/profile", label: "Hồ sơ Nhãn hàng" },
  { href: "/brand", label: "Chiến dịch" },
  { href: "/brand/proofs", label: "Duyệt proof" },
  { href: "/wallet", label: "Quỹ" }
];

export default function BrandPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  useEffect(() => {
    let active = true;
    async function loadCampaigns() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/brand/dashboard/campaigns", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<CampaignItem[]>;
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Không thể tải chiến dịch của Brand" : payload.error);
        }
        if (active) setCampaigns(payload.data);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Không thể tải chiến dịch của Brand");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCampaigns();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Quản lý chiến dịch" subtitle="Theo dõi campaign thuộc Brand, ngân sách và trạng thái vận hành." />
        {error ? <ErrorState title="Không thể tải chiến dịch" description={error} /> : null}
        {loading ? <LoadingSkeleton rows={4} /> : null}
        {!loading && !error && campaigns.length === 0 ? (
          <EmptyState title="Chưa có chiến dịch" description="Tạo campaign đầu tiên để bắt đầu thu hút creator." />
        ) : null}
        {!loading && campaigns.length > 0 ? (
          <section className="mt-6">
            <SectionHeader title="Danh sách chiến dịch" subtitle={`${campaigns.length} campaign`} />
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-zinc-600">
                    <p>Budget: {item.budgetVnd.toLocaleString("vi-VN")}đ</p>
                    <p>Đã fund: {item.fundedAmountVnd.toLocaleString("vi-VN")}đ</p>
                    <p>Backers: {item.backerCount.toLocaleString("vi-VN")}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </AppShell>
    </>
  );
}
