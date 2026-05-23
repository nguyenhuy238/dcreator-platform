"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Review = { id: string; decision: string; rejectReason: string | null; note: string | null; createdAt: string; reviewer: { displayName: string; role: string } };
type Detail = {
  id: string;
  statusView: string;
  lifecycleStatus: string;
  videoUrl: string | null;
  imageUrl: string | null;
  socialPostUrl: string | null;
  screenshotUrl: string | null;
  fileUploadUrl: string | null;
  proofTextNote: string | null;
  note: string | null;
  mission: {
    title: string;
    description: string;
    campaign: {
      id: string;
      title: string;
      brief: string;
      brand: {
        id: string;
        displayName: string;
        email: string;
        brandApplications: Array<{ description: string | null; bccAgreementTerms: string | null; businessGoal: string | null }>;
      };
    };
  };
  account: {
    id: string;
    displayName: string;
    email: string;
    creatorProfile: { mainPlatform: string; socialUrl: string; followerCount: number | null; contentCategory: string | null } | null;
  };
  reviews: Review[];
};

export default function AdminContentReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [feedback, setFeedback] = useState("");
  const [item, setItem] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/content-review/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load detail failed");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load detail failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "reject" | "request-changes" | "send-to-brand-review", markReadyToPublish?: boolean) {
    if (!item) return;
    if (!feedback.trim()) {
      setError("Feedback is required.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/content-review/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim(), markReadyToPublish })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Action failed");
      setToast("Đã cập nhật content submission");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Content Submission Detail" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được content detail" description={error || "Unknown error"} onRetry={() => void load()} />;
  }

  const brandGuide = item.mission.campaign.brand.brandApplications[0];

  return (
    <>
      <PageHeader title={item.account.displayName} subtitle={`Campaign: ${item.mission.campaign.title}`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/content-review")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}

      <section className="dc-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Submission status</p>
          <StatusBadge status={item.statusView.toLowerCase()} />
        </div>
        <div className="mt-2 grid gap-2 text-sm text-zinc-700">
          <p>Creator: {item.account.displayName} • {item.account.email}</p>
          <p>Platform: {item.account.creatorProfile?.mainPlatform ?? "N/A"} • Followers: {(item.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
          <p>Category: {item.account.creatorProfile?.contentCategory ?? "N/A"}</p>
          <p>Profile link: {item.account.creatorProfile?.socialUrl ?? "N/A"}</p>
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Content draft</p>
        <div className="mt-2 grid gap-1 text-sm text-zinc-700">
          <p>Video/link draft: {item.videoUrl ?? item.socialPostUrl ?? "N/A"}</p>
          <p>Image/screenshot: {item.imageUrl ?? item.screenshotUrl ?? "N/A"}</p>
          <p>File upload: {item.fileUploadUrl ?? "N/A"}</p>
          <p>Caption/description: {item.proofTextNote ?? "N/A"}</p>
          <p>Product link/social post: {item.socialPostUrl ?? "N/A"}</p>
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Campaign brief & brand guideline</p>
        <p className="mt-2 text-sm text-zinc-700">Brief: {item.mission.campaign.brief}</p>
        <p className="mt-2 text-sm text-zinc-700">Brand guideline: {brandGuide?.description ?? brandGuide?.businessGoal ?? brandGuide?.bccAgreementTerms ?? "N/A"}</p>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Feedback history</p>
        {item.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">Chưa có lịch sử duyệt.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {item.reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-zinc-200 p-3 text-sm">
                <p className="font-semibold">{review.decision} • {review.reviewer.displayName} ({review.reviewer.role})</p>
                <p className="text-zinc-600">{review.note ?? review.rejectReason ?? "No feedback"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Decision</p>
        <textarea className="dc-input mt-3 min-h-24" placeholder="Nhập feedback bắt buộc..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => void act("approve", false)}>Approve</button>
          <button className="dc-btn-primary" disabled={acting} onClick={() => void act("approve", true)}>Mark READY_TO_PUBLISH</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => void act("send-to-brand-review")}>Send to Brand review</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => void act("request-changes")}>Request changes</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => void act("reject")}>Reject</button>
        </div>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}

