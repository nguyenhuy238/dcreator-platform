"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

type ApiPayload<T> = { success: boolean; data: T; error?: string };

type Overview = {
  totalJobs: number;
  pendingProofs: number;
  approvedVideos: number;
  totalCommission: number;
  nPointsBalance: number;
};

type CreatorMissionItem = {
  id: string;
  status: string;
  mission: {
    title: string;
    deadlineAt: string | null;
    rewardPoints: number;
  };
  campaign: {
    title: string;
  };
};

const statusLabel: Record<string, string> = {
  PRODUCT_PENDING: "Xử lý sản phẩm",
  DRAFT_PENDING: "Chờ duyệt kịch bản",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy"
};

const statusTone: Record<string, string> = {
  PRODUCT_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  DRAFT_PENDING: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-zinc-100 text-zinc-700 border-zinc-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200"
};

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

async function fetcher<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as ApiPayload<T>;
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Không thể tải dữ liệu");
  }
  return payload.data;
}

export function CreatorDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [missions, setMissions] = useState<CreatorMissionItem[]>([]);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [overviewData, missionData] = await Promise.all([
        fetcher<Overview>("/api/creator/dashboard/overview"),
        fetcher<CreatorMissionItem[]>("/api/me/mission")
      ]);
      setOverview(overviewData);
      setMissions(missionData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const completedJobs = useMemo(
    () => missions.filter((item) => item.status === "COMPLETED").length,
    [missions]
  );
  const submittedMissions = useMemo(
    () => missions.filter((item) => item.status !== "PRODUCT_PENDING").length,
    [missions]
  );
  const approvedMissions = useMemo(
    () => missions.filter((item) => item.status === "COMPLETED").length,
    [missions]
  );
  const approvalRate = useMemo(() => {
    if (submittedMissions === 0) return 0;
    return Math.round((approvedMissions / submittedMissions) * 100);
  }, [approvedMissions, submittedMissions]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bảng điều khiển Creator"
        subtitle="Theo dõi nhiệm vụ, tiến độ duyệt minh chứng và hoa hồng của bạn."
        action={<Link href="/campaigns" className="dc-btn-primary">Nhận nhiệm vụ</Link>}
      />

      {error ? <ErrorState title="Không thể tải bảng điều khiển" description={error} onRetry={() => void loadDashboard()} /> : null}

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Nhiệm vụ đã nhận" value={`${missions.length.toLocaleString("vi-VN")}`} />
            <StatsCard title="Minh chứng chờ duyệt" value={`${(overview?.pendingProofs ?? 0).toLocaleString("vi-VN")}`} />
            <StatsCard title="Video đã duyệt" value={`${(overview?.approvedVideos ?? 0).toLocaleString("vi-VN")}`} />
            <StatsCard title="Hoa hồng đã ghi nhận" value={`${(overview?.totalCommission ?? 0).toLocaleString("vi-VN")} N-Points`} />
            <StatsCard
              title="Số N-Points"
              value={`${(overview?.nPointsBalance ?? 0).toLocaleString("vi-VN")} N-Points`}
              hint={`${completedJobs.toLocaleString("vi-VN")} nhiệm vụ đã hoàn thành`}
            />
            <StatsCard
              title="Tỉ lệ được duyệt"
              value={`${approvalRate}%`}
              hint={`${approvedMissions.toLocaleString("vi-VN")}/${submittedMissions.toLocaleString("vi-VN")} mission`}
            />
          </section>

          <section>
            <SectionHeader
              title="Công việc của tôi"
              subtitle="Danh sách nhiệm vụ lấy trực tiếp từ trang /me/mission"
              action={<Link href="/me/mission" className="dc-btn-secondary">Xem tất cả</Link>}
            />

            {missions.length === 0 ? (
              <EmptyState
                title="Bạn chưa có nhiệm vụ"
                description="Chọn chiến dịch phù hợp để nhận nhiệm vụ mới."
                action={<Link href="/campaigns" className="dc-btn-primary">Đi đến chiến dịch</Link>}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {missions.map((mission) => {
                  const label = statusLabel[mission.status] ?? mission.status;
                  const tone = statusTone[mission.status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
                  return (
                    <Link
                      key={mission.id}
                      href="/me/mission"
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-semibold text-zinc-900">{mission.mission.title}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">Chiến dịch: {mission.campaign.title}</p>
                      <p className="mt-1 text-sm text-zinc-600">Thưởng: {mission.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                      <p className="mt-1 text-sm text-zinc-600">Hạn: {formatDate(mission.mission.deadlineAt)}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
