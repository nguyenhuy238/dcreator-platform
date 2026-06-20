"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";
import { CreatorMissionsPanel } from "@/app/dashboard/creator/_components/CreatorMissionsPanel";

type ApiPayload<T> = { success: boolean; data: T; error?: string };

export type CreatorOverview = {
  totalJobs: number;
  pendingProofs: number;
  approvedVideos: number;
  totalCommission: number;
  nPointsBalance: number;
  creatorDepositBankConfig?: {
    qrImageUrl: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    transferPrefix: string;
  };
};

async function fetcher<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as ApiPayload<T>;
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Không thể tải dữ liệu");
  }
  return payload.data;
}

export function CreatorDashboardClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [createdNotice, setCreatedNotice] = useState(false);

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const data = await fetcher<CreatorOverview>("/api/creator/dashboard/overview");
      setOverview(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCreatedNotice(new URLSearchParams(window.location.search).get("created") === "1");
    void loadOverview();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển Creator"
        subtitle="Theo dõi nhiệm vụ, tiến độ duyệt nội dung và hoa hồng của bạn."
        action={<Link href="/campaigns" className="dc-btn-primary">Nhận thêm nhiệm vụ</Link>}
      />

      {createdNotice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">Creator Profile đã được tạo</p>
          <p>Hãy thêm kênh social và bắt đầu xin nhiệm vụ phù hợp.</p>
        </div>
      ) : null}

      {error ? <ErrorState title="Không thể tải bảng điều khiển" description={error} onRetry={() => void loadOverview()} /> : null}
      {loading ? <LoadingSkeleton rows={3} /> : null}

      {!loading ? <CreatorMissionsPanel overview={overview} initialDetailMissionId={searchParams.get("missionId")?.trim() ?? ""} /> : null}
    </div>
  );
}
