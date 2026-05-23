"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type MissionRow = {
  id: string;
  missionId: string;
  title: string;
  campaign: { id: string; title: string; slug: string };
  lifecycleStatus: string;
  statusGroup: "accepted" | "in_progress" | "submitted" | "approved" | "rejected";
  rejectReason: string | null;
  rewardCommissionVnd: number;
  updatedAt: string;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

const taskTypeMap: Record<string, string> = {
  video: "Video",
  livestream: "Livestream",
  review: "Review sản phẩm",
  seeding: "Seeding",
  ugc: "UGC",
  affiliate: "Affiliate content"
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function mapStatus(statusGroup: MissionRow["statusGroup"], lifecycleStatus: string) {
  if (statusGroup === "accepted") return { label: "Chưa bắt đầu", badge: "PENDING" };
  if (statusGroup === "in_progress") return { label: "Đang thực hiện", badge: "ACTIVE" };
  if (statusGroup === "submitted") return { label: "Chờ duyệt", badge: "PENDING_REVIEW" };
  if (statusGroup === "approved") {
    if (lifecycleStatus === "DONE") return { label: "Đã thanh toán", badge: "PAID" };
    return { label: "Đã duyệt", badge: "APPROVED" };
  }
  if (lifecycleStatus === "REJECTED") return { label: "Cần chỉnh sửa", badge: "REJECTED" };
  return { label: "Đã từ chối", badge: "REJECTED" };
}

function inferTaskType(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("live")) return taskTypeMap.livestream;
  if (normalized.includes("review")) return taskTypeMap.review;
  if (normalized.includes("seed")) return taskTypeMap.seeding;
  if (normalized.includes("ugc")) return taskTypeMap.ugc;
  if (normalized.includes("affiliate")) return taskTypeMap.affiliate;
  return taskTypeMap.video;
}

export default function CreatorMissionsPage() {
  const [items, setItems] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/my-jobs", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<MissionRow[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải nhiệm vụ");
      }
      setItems(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải nhiệm vụ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const groupedCount = useMemo(() => {
    const counters = { pending: 0, doing: 0, review: 0, done: 0, rejected: 0 };
    for (const item of items) {
      if (item.statusGroup === "accepted") counters.pending += 1;
      else if (item.statusGroup === "in_progress") counters.doing += 1;
      else if (item.statusGroup === "submitted") counters.review += 1;
      else if (item.statusGroup === "approved") counters.done += 1;
      else counters.rejected += 1;
    }
    return counters;
  }, [items]);

  return (
    <>
      <PageHeader
        title="Nhiệm vụ của tôi"
        subtitle="Theo dõi nhiệm vụ Creator, deadline và trạng thái duyệt proof theo từng campaign."
        action={<Link href="/dashboard/creator/jobs" className="dc-btn-secondary">Xem job có thể tham gia</Link>}
      />

      {error ? <ErrorState title="Không thể tải nhiệm vụ" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading ? (
        <>
          <section className="dc-grid-dashboard">
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Chưa bắt đầu</p><p className="text-2xl font-bold">{groupedCount.pending}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Đang thực hiện</p><p className="text-2xl font-bold">{groupedCount.doing}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Chờ duyệt</p><p className="text-2xl font-bold">{groupedCount.review}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Đã hoàn tất</p><p className="text-2xl font-bold">{groupedCount.done}</p></article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Danh sách nhiệm vụ" subtitle={`${items.length} nhiệm vụ`} />
            {items.length === 0 ? (
              <EmptyState
                title="Chưa có nhiệm vụ"
                description="Nhiệm vụ sẽ xuất hiện sau khi bạn được duyệt vào campaign/job phù hợp."
                action={<Link href="/dashboard/creator/jobs" className="dc-btn-primary">Khám phá campaign</Link>}
              />
            ) : (
              <div className="grid gap-3">
                {items.map((item) => {
                  const status = mapStatus(item.statusGroup, item.lifecycleStatus);
                  return (
                    <article key={item.id} className="dc-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{inferTaskType(item.title)}</p>
                          <h2 className="text-lg font-bold text-zinc-900">{item.title}</h2>
                          <p className="text-sm text-zinc-600">Campaign: {item.campaign.title}</p>
                          <p className="text-sm text-zinc-600">Brand: Nhãn hàng #{item.campaign.slug}</p>
                        </div>
                        <StatusBadge status={status.badge} />
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                        <p>Trạng thái: <span className="font-semibold text-zinc-900">{status.label}</span></p>
                        <p>Cập nhật: <span className="font-semibold text-zinc-900">{formatDate(item.updatedAt)}</span></p>
                        <p>Hoa hồng dự kiến: <span className="font-semibold text-zinc-900">{formatVnd(item.rewardCommissionVnd)}</span></p>
                      </div>

                      {item.rejectReason ? (
                        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Feedback: {item.rejectReason}</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href="/dashboard/creator/proofs" className="dc-btn-secondary">Xem chi tiết</Link>
                        {item.statusGroup === "in_progress" || item.statusGroup === "accepted" ? <Link href="/dashboard/creator/proofs" className="dc-btn-primary">Nộp proof</Link> : null}
                        {item.statusGroup === "rejected" ? <Link href="/dashboard/creator/proofs" className="dc-btn-secondary">Sửa proof</Link> : null}
                        {item.statusGroup === "rejected" ? <Link href="/dashboard/creator/proofs" className="dc-btn-secondary">Xem feedback</Link> : null}
                        <Link href="/dashboard/creator/jobs" className="dc-btn-secondary">Xem campaign</Link>
                      </div>
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
