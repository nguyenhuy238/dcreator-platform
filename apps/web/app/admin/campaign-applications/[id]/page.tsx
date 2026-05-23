"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Detail = {
  id: string;
  lifecycleStatus: string;
  note: string | null;
  proofTextNote: string | null;
  socialPostUrl: string | null;
  fileUploadUrl: string | null;
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
      portfolioUrl: string | null;
      bio: string | null;
    } | null;
  };
  mission: {
    id: string;
    title: string;
    description: string;
    campaign: {
      id: string;
      title: string;
      brief: string;
      brandId: string;
      brand: { id: string; displayName: string; email: string };
    };
  };
};

export default function AdminCampaignApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<Detail | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaign-applications/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
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

  async function confirmAllowCreatorTask() {
    if (!item) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaign-applications/${item.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast("Đã cập nhật application");
      setTimeout(() => setToast(""), 1800);
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
        <PageHeader title="Campaign Application Detail" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được application detail" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title={item.account.displayName}
        subtitle={`Campaign: ${item.mission.campaign.title}`}
        action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/campaign-applications")}>Back</button>}
      />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}

      <section className="dc-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Application status</p>
          <StatusBadge status={item.lifecycleStatus.toLowerCase()} />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Creator: {item.account.displayName} • {item.account.email}</p>
          <p>Platform: {item.account.creatorProfile?.mainPlatform ?? "Không có"} • Followers: {(item.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
          <p>Category: {item.account.creatorProfile?.contentCategory ?? "Không có"}</p>
          <p>Social URL: {item.account.creatorProfile?.socialUrl ?? "Không có"}</p>
          <p>Handle: {item.account.creatorProfile?.handle ?? "Không có"}</p>
          <p>Portfolio: {item.account.creatorProfile?.portfolioUrl ?? "Không có"}</p>
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Campaign brief</p>
        <p className="mt-2 text-sm text-zinc-700">{item.mission.campaign.brief}</p>
        <p className="mt-2 text-xs text-zinc-500">Mission: {item.mission.title}</p>
        <p className="text-xs text-zinc-500">Brand: {item.mission.campaign.brand.displayName} ({item.mission.campaign.brand.email})</p>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Creator motivation / attachments</p>
        <div className="mt-2 grid gap-2 text-sm text-zinc-700">
          <p>Why join (note): {item.note ?? "Không có"}</p>
          <p>Additional note: {item.proofTextNote ?? "Không có"}</p>
          <p>Social post/link: {item.socialPostUrl ?? "Không có"}</p>
          <p>Attachment file: {item.fileUploadUrl ?? "Không có"}</p>
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Decision</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => void confirmAllowCreatorTask()}>
            Xác nhận cho phép creator làm nhiệm vụ
          </button>
        </div>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
