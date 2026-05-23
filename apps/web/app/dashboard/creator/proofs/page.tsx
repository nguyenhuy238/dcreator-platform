"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, FormField, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type JobRow = {
  id: string;
  missionId: string;
  title: string;
  campaign: { id: string; title: string; slug: string };
  lifecycleStatus: string;
  statusGroup: "accepted" | "in_progress" | "submitted" | "approved" | "rejected";
  rejectReason: string | null;
  updatedAt: string;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

const platforms = ["TikTok", "Facebook", "Instagram", "YouTube"] as const;

function proofStatusMeta(lifecycleStatus: string) {
  if (lifecycleStatus === "PENDING_REVIEW" || lifecycleStatus === "SUBMITTED") {
    return { badge: "PENDING_REVIEW", label: "Chờ duyệt" };
  }
  if (lifecycleStatus === "APPROVED" || lifecycleStatus === "DONE") {
    return { badge: lifecycleStatus === "DONE" ? "PAID" : "APPROVED", label: lifecycleStatus === "DONE" ? "Đã thanh toán" : "Đã duyệt" };
  }
  if (lifecycleStatus === "REJECTED") {
    return { badge: "REJECTED", label: "Cần chỉnh sửa" };
  }
  return { badge: "PENDING", label: "Chưa bắt đầu" };
}

export default function CreatorProofsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [submissionId, setSubmissionId] = useState("");
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("TikTok");
  const [videoUrl, setVideoUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/my-jobs", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<JobRow[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải proof");
      }
      setJobs(payload.data);
      if (!submissionId && payload.data.length > 0) {
        setSubmissionId(payload.data[0]!.id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải proof");
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingSubmitJobs = useMemo(
    () => jobs.filter((item) => item.statusGroup === "accepted" || item.statusGroup === "in_progress" || item.statusGroup === "rejected"),
    [jobs]
  );

  const historyJobs = useMemo(
    () => jobs.filter((item) => item.statusGroup === "submitted" || item.statusGroup === "approved" || item.statusGroup === "rejected"),
    [jobs]
  );

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submissionId) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/proofs/${submissionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoUrl.trim(),
          screenshotUrl: screenshotUrl.trim() || undefined,
          platform,
          note: note.trim() || undefined
        })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể nộp proof");
      }
      setToast("Nộp proof thành công.");
      setTimeout(() => setToast(""), 2200);
      setVideoUrl("");
      setScreenshotUrl("");
      setNote("");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể nộp proof");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Proof của tôi" subtitle="Nộp proof theo nhiệm vụ và theo dõi trạng thái duyệt từ Brand/Admin." />

      {error ? <ErrorState title="Không thể xử lý proof" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <article className="dc-card p-4">
            <SectionHeader title="Nộp proof" subtitle="Chọn nhiệm vụ và gửi link nội dung" />
            {pendingSubmitJobs.length === 0 ? (
              <EmptyState title="Chưa có nhiệm vụ để nộp" description="Bạn cần nhận nhiệm vụ trước khi gửi proof." />
            ) : (
              <form className="grid gap-3" onSubmit={submitProof}>
                <FormField label="Nhiệm vụ / Campaign">
                  <select className="dc-input" value={submissionId} onChange={(event) => setSubmissionId(event.target.value)} required>
                    {pendingSubmitJobs.map((item) => (
                      <option key={item.id} value={item.id}>{item.title} • {item.campaign.title}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Nền tảng">
                  <select className="dc-input" value={platform} onChange={(event) => setPlatform(event.target.value as (typeof platforms)[number])}>
                    {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </FormField>
                <FormField label="Link video/content">
                  <input className="dc-input" type="url" placeholder="https://..." value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} required />
                </FormField>
                <FormField label="Link ảnh/file minh chứng (tuỳ chọn)">
                  <input className="dc-input" type="url" placeholder="https://..." value={screenshotUrl} onChange={(event) => setScreenshotUrl(event.target.value)} />
                </FormField>
                <FormField label="Ghi chú">
                  <textarea className="dc-input min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Mô tả ngắn về nội dung, ad code, context đăng bài..." />
                </FormField>
                <button type="submit" className="dc-btn-primary" disabled={submitting}>{submitting ? "Đang nộp..." : "Nộp proof"}</button>
              </form>
            )}
          </article>

          <article className="dc-card p-4">
            <SectionHeader title="Lịch sử proof" subtitle={`${historyJobs.length} bản ghi`} />
            {historyJobs.length === 0 ? (
              <EmptyState title="Chưa có proof" description="Proof đã nộp sẽ xuất hiện ở đây cùng feedback duyệt." />
            ) : (
              <div className="grid gap-3">
                {historyJobs.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-zinc-900">{item.title}</p>
                        <p className="text-sm text-zinc-600">{item.campaign.title}</p>
                      </div>
                      <StatusBadge status={proofStatusMeta(item.lifecycleStatus).badge} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Cập nhật: {new Date(item.updatedAt).toLocaleString("vi-VN")}</p>
                    <p className="text-xs text-zinc-500">Trạng thái nghiệp vụ: {proofStatusMeta(item.lifecycleStatus).label}</p>
                    {item.rejectReason ? (
                      <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Cần chỉnh sửa: {item.rejectReason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
