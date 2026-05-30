"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminAvatar } from "@/app/admin/_components/AdminAvatar";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CreatorApplicationDetail = {
  id: string;
  status: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  mainPlatform: string;
  socialUrl: string;
  handle: string | null;
  followerCount: number | null;
  contentCategory: string | null;
  portfolioUrl: string | null;
  location: string | null;
  expectedRate: number | null;
  maxJobsPerMonth: number | null;
  rejectReason: string | null;
  reviewNote: string | null;
  socialLinks?: Array<{
    id: string;
    platform: string;
    socialUrl: string;
    followers: number;
    engagementRate: number | null;
    isPrimary: boolean;
    verificationStatus: string;
    status: string;
  }>;
  account: {
    id: string;
    email: string;
    displayName: string;
    creatorProfile: {
      id: string;
      mainPlatform: string;
      socialUrl: string;
      handle: string | null;
      followerCount: number | null;
      contentCategory: string | null;
    } | null;
  };
};

export default function AdminCreatorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<CreatorApplicationDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [dialogAction, setDialogAction] = useState<null | "verify" | "risk" | "restrict">(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/creators/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CreatorApplicationDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết thất bại");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(url: string, payload?: unknown, message?: string) {
    setActing(true);
    setError("");
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast(message ?? "Thành công");
      setTimeout(() => setToast(""), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Creator Verification Detail" subtitle="Kiểm tra hồ sơ phục vụ risk/moderation operations." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được hồ sơ Creator" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  const channels = item.socialLinks?.length
    ? item.socialLinks.map((channel) => ({
        platform: channel.platform,
        url: channel.socialUrl,
        followers: channel.followers,
        isPrimary: channel.isPrimary,
        verificationStatus: channel.verificationStatus
      }))
    : [
        { platform: item.mainPlatform, url: item.socialUrl, followers: item.followerCount, isPrimary: false, verificationStatus: "UNVERIFIED" },
        ...(item.portfolioUrl ? [{ platform: "PORTFOLIO", url: item.portfolioUrl, followers: null as number | null, isPrimary: false, verificationStatus: "UNVERIFIED" }] : [])
      ].filter((channel) => channel.url);

  return (
    <>
      <PageHeader title={item.displayName} subtitle={`Account: ${item.account.displayName} (${item.account.email})`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/creators")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}
      <section className="dc-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Current status</p>
          <StatusBadge status={item.status.toLowerCase()} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <AdminAvatar name={item.displayName || "Creator"} imageUrl={item.avatarUrl} className="h-12 w-12" alt={item.displayName || "Creator avatar"} />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900">{item.displayName}</p>
            <p className="truncate text-sm text-zinc-600">{item.account.email}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Category: {item.contentCategory ?? "Không có"}</p>
          <p>Handle: {item.handle ?? "Không có"}</p>
          <p>Followers: {(item.followerCount ?? 0).toLocaleString("vi-VN")}</p>
          <p>Location: {item.location ?? "Không có"}</p>
          <p>Expected rate: {item.expectedRate ?? 0}</p>
          <p>Max jobs/month: {item.maxJobsPerMonth ?? 0}</p>
          {item.bio ? <p>Bio: {item.bio}</p> : null}
          {item.rejectReason ? <p className="text-red-700">Reject reason: {item.rejectReason}</p> : null}
          {item.reviewNote ? <p>Review note: {item.reviewNote}</p> : null}
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Social channels</p>
        <div className="mt-3 grid gap-2">
          {channels.map((channel, index) => (
            <div key={`${channel.url}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold">{channel.platform}</p>
              <p className="break-all text-zinc-700">{channel.url}</p>
              <p className="text-zinc-500">Followers: {(channel.followers ?? 0).toLocaleString("vi-VN")}</p>
              <p className="text-zinc-500">{channel.isPrimary ? "Kênh chính" : "Kênh phụ"} • {channel.verificationStatus}</p>
            </div>
          ))}
          {item.account.creatorProfile ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Existing CreatorProfile: {item.account.creatorProfile.mainPlatform} • {item.account.creatorProfile.socialUrl}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Risk Decision</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => setDialogAction("verify")}>
            Xác nhận an toàn cơ bản
          </button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setDialogAction("risk")}>
            Gắn cờ rủi ro
          </button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setDialogAction("restrict")}>
            Yêu cầu bổ sung
          </button>
        </div>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
      <ReviewActionDialog
        open={dialogAction === "verify"}
        title="Xác nhận hồ sơ an toàn cơ bản"
        description="Đánh dấu hồ sơ qua kiểm tra cơ bản. Không phải bước mở quyền onboarding."
        confirmLabel="Xác nhận"
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={() => {
          setDialogAction(null);
          void patch(`/api/admin/creators/${item.id}/verify`, {}, "Creator verification confirmed");
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "risk"}
        title="Gắn cờ rủi ro Creator"
        description="Bắt buộc nhập lý do rủi ro."
        confirmLabel="Gắn cờ"
        requireReason
        reasonPlaceholder="Nội dung kênh chưa phù hợp guideline..."
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void patch(`/api/admin/creators/${item.id}/risk`, { reason }, "Creator risk flagged");
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "restrict"}
        title="Yêu cầu bổ sung hồ sơ Creator"
        description="Bắt buộc nhập nội dung cần bổ sung."
        confirmLabel="Yêu cầu bổ sung"
        requireReason
        reasonPlaceholder="Bổ sung hồ sơ social/profile..."
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void patch(`/api/admin/creators/${item.id}/restrict`, { reason }, "Creator restrictions requested");
        }}
      />
    </>
  );
}
