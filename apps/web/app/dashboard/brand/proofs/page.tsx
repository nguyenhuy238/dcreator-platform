"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ProofItem = {
  id: string;
  lifecycleStatus: string;
  status: string;
  videoUrl: string | null;
  socialPostUrl: string | null;
  proofTextNote: string | null;
  note: string | null;
  createdAt: string;
  account: {
    id: string;
    displayName: string;
    creatorProfile: { mainPlatform: string; followerCount: number | null } | null;
  };
  mission: {
    id: string;
    title: string;
    campaign: { id: string; title: string };
  };
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function BrandProofsPage() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand/dashboard/proofs", { cache: "no-store" });
      const payload = (await res.json()) as ApiResponse<ProofItem[]>;
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải proofs");
      setItems(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải proofs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(submissionId: string, decision: "APPROVED" | "REJECTED" | "REVISION") {
    const rejectReason = decision === "APPROVED" ? "" : (window.prompt("Nhập lý do:", "Cần chỉnh sửa nội dung proof") ?? "");
    if (decision !== "APPROVED" && rejectReason.trim().length < 5) return;

    try {
      const res = await fetch("/api/brand/dashboard/proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, decision, rejectReason: decision === "APPROVED" ? undefined : rejectReason, note: decision === "APPROVED" ? "Đạt yêu cầu" : undefined })
      });
      const payload = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Thao tác duyệt thất bại");
      setToast("Đã cập nhật trạng thái proof.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác duyệt thất bại");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !(`${item.account.displayName} ${item.mission.title} ${item.mission.campaign.title}`.toLowerCase().includes(q))) return false;
      if (statusFilter && item.lifecycleStatus !== statusFilter && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, query, statusFilter]);

  return (
    <>
      <PageHeader title="Duyệt proof / video" subtitle="Kiểm duyệt nội dung Creator nộp theo campaign." />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="dc-input" placeholder="Tìm creator/campaign/mission" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        </div>
      </section>

      {error ? <div className="mt-4"><ErrorState title="Không thể tải proofs" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}

      {!loading ? (
        <section className="mt-6">
          <SectionHeader title="Danh sách proof" subtitle={`${filtered.length} proof`} />
          {filtered.length === 0 ? (
            <EmptyState title="Không có proof" description="Proof/video sẽ xuất hiện khi creator nộp nội dung." />
          ) : (
            <div className="grid gap-4">
              {filtered.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.account.displayName}</p>
                      <p className="text-sm text-zinc-600">Campaign: {item.mission.campaign.title} • Mission: {item.mission.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={item.lifecycleStatus} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  <div className="mt-2 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                    <p>Platform: {item.account.creatorProfile?.mainPlatform ?? "Không rõ"}</p>
                    <p>Follower: {(item.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                    <p>Video: {item.videoUrl ?? "Không có"}</p>
                    <p>Bài đăng: {item.socialPostUrl ?? "Không có"}</p>
                  </div>

                  {item.proofTextNote ? <p className="mt-2 text-sm text-zinc-700">Caption/Proof note: {item.proofTextNote}</p> : null}
                  {item.note ? <p className="mt-1 text-sm text-zinc-700">Ghi chú: {item.note}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void review(item.id, "APPROVED")}>Approve</button>
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "REVISION")}>Request revision</button>
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "REJECTED")}>Reject</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
