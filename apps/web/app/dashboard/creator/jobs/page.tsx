"use client";

import { useEffect, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type Job = {
  id: string;
  title: string;
  rewardPoints: number;
  rewardCommissionVnd: number;
  deadlineAt: string | null;
  campaign: { id: string; title: string; category: string };
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

export default function CreatorJobsPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/marketplace?campaignStatus=ACTIVE", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<Job[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải job");
      }
      setItems(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải job");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function acceptJob(missionId: string) {
    setAcceptingId(missionId);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/marketplace/${missionId}/accept`, { method: "POST" });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể nhận job");
      }
      setToast("Đã nhận job thành công.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể nhận job");
    } finally {
      setAcceptingId("");
    }
  }

  return (
    <>
      <PageHeader title="Campaign / Job" subtitle="Danh sách job Creator có thể tham gia và nhận nhiệm vụ ngay." />
      {error ? <ErrorState title="Không thể tải job" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading ? (
        items.length === 0 ? (
          <EmptyState title="Chưa có job phù hợp" description="Hệ thống sẽ cập nhật job mới theo lĩnh vực nội dung của bạn." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((job) => (
              <article key={job.id} className="dc-card p-4">
                <p className="font-semibold text-zinc-900">{job.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{job.campaign.title} • {job.campaign.category}</p>
                <p className="text-sm text-zinc-600">Reward: {job.rewardPoints} points • {formatVnd(job.rewardCommissionVnd)}</p>
                <p className="text-sm text-zinc-600">Deadline: {job.deadlineAt ? new Date(job.deadlineAt).toLocaleDateString("vi-VN") : "Không giới hạn"}</p>
                <button className="dc-btn-primary mt-3" disabled={acceptingId === job.id} onClick={() => void acceptJob(job.id)}>
                  {acceptingId === job.id ? "Đang xử lý..." : "Nhận job"}
                </button>
              </article>
            ))}
          </div>
        )
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
