"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type Item = {
  id: string;
  statusView: string;
  videoUrl: string | null;
  socialPostUrl: string | null;
  proofTextNote: string | null;
  account: { id: string; displayName: string; email: string; creatorProfile: { mainPlatform: string } | null };
  mission: { title: string; campaign: { id: string; title: string; brand: { id: string; displayName: string } } };
};

type CreatorMissionItem = {
  id: string;
  videoReviewStatus: string;
  videoReviewFeedback: string | null;
  campaign: {
    id: string;
    brandId: string;
    title: string;
  };
  mission: {
    title: string;
  };
  account: {
    id: string;
    displayName: string;
    email: string;
    creatorProfile: {
      mainPlatform: string;
      socialUrl: string;
      followerCount: number | null;
    } | null;
  };
  submission: {
    id: string;
    videoUrl: string | null;
    note: string | null;
  } | null;
};

type CombinedQueueItem =
  | { kind: "video-review"; id: string; payload: CreatorMissionItem }
  | { kind: "content-review"; id: string; payload: Item };

const statusOptions = ["SUBMITTED", "ADMIN_REVIEWING", "ADMIN_APPROVED", "ADMIN_REJECTED", "CHANGES_REQUESTED", "BRAND_REVIEWING", "READY_TO_PUBLISH", "PUBLISHED"];

export default function AdminContentReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [creatorMissions, setCreatorMissions] = useState<CreatorMissionItem[]>([]);

  const [campaignId, setCampaignId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (campaignId.trim()) params.set("campaignId", campaignId.trim());
      if (creatorId.trim()) params.set("creatorId", creatorId.trim());
      if (brandId.trim()) params.set("brandId", brandId.trim());
      if (status) params.set("status", status);
      if (platform) params.set("platform", platform);
      if (query.trim()) params.set("query", query.trim());

      const [contentRes, creatorMissionRes] = await Promise.all([
        fetch(`/api/admin/content-review?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/admin/dashboard/creator-missions", { cache: "no-store" })
      ]);

      const contentBody = (await contentRes.json()) as ApiResult<Item[]>;
      const creatorMissionBody = (await creatorMissionRes.json()) as ApiResult<CreatorMissionItem[]>;

      if (!contentRes.ok || !contentBody.success) throw new Error(contentBody.error ?? "Tải danh sách bài nộp thất bại");
      if (!creatorMissionRes.ok || !creatorMissionBody.success) throw new Error(creatorMissionBody.error ?? "Tải nhiệm vụ Creator thất bại");

      setItems(contentBody.data);
      setCreatorMissions(creatorMissionBody.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách bài nộp thất bại");
    } finally {
      setLoading(false);
    }
  }, [brandId, campaignId, creatorId, platform, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decideVideoReview(id: string, action: "APPROVE_VIDEO_REVIEW" | "REJECT_VIDEO_REVIEW") {
    setError("");
    setNotice("");
    const actionLabel = action === "APPROVE_VIDEO_REVIEW" ? "duyệt video review" : "từ chối video review";
    if (!window.confirm(`Xác nhận ${actionLabel} cho creator mission này?`)) return;

    let reason: string | undefined;
    if (action === "REJECT_VIDEO_REVIEW") {
      reason = window.prompt("Nhập feedback từ chối video:", "Video chưa đạt guideline")?.trim();
      if (!reason) return;
    }

    try {
      const res = await fetch(`/api/admin/dashboard/creator-missions/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason })
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");

      setNotice("Đã cập nhật duyệt video review.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  const videoReviewQueue = useMemo(() => {
    const q = query.trim().toLowerCase();

    return creatorMissions.filter((item) => {
      if (item.videoReviewStatus !== "PENDING") return false;

      if (campaignId.trim() && item.campaign.id !== campaignId.trim()) return false;
      if (creatorId.trim() && item.account.id !== creatorId.trim()) return false;
      if (brandId.trim() && item.campaign.brandId !== brandId.trim()) return false;
      if (platform && item.account.creatorProfile?.mainPlatform !== platform) return false;

      if (status && status !== "SUBMITTED" && status !== "ADMIN_REVIEWING") return false;

      if (q) {
        const haystack = [
          item.account.displayName,
          item.account.email,
          item.account.creatorProfile?.socialUrl,
          item.mission.title,
          item.campaign.title,
          item.submission?.videoUrl,
          item.submission?.note
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [brandId, campaignId, creatorId, creatorMissions, platform, query, status]);

  const combinedQueue = useMemo<CombinedQueueItem[]>(
    () => [
      ...videoReviewQueue.map((item) => ({ kind: "video-review" as const, id: `video-${item.id}`, payload: item })),
      ...items.map((item) => ({ kind: "content-review" as const, id: `content-${item.id}`, payload: item }))
    ],
    [items, videoReviewQueue]
  );

  return (
    <>
      <PageHeader
        title="Content Review"
        subtitle="Kiểm duyệt nội dung Creator. Bao gồm queue duyệt video review trước khi đăng công khai."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input className="dc-input" placeholder="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <input className="dc-input" placeholder="Creator ID" value={creatorId} onChange={(e) => setCreatorId(e.target.value)} />
          <input className="dc-input" placeholder="Brand ID" value={brandId} onChange={(e) => setBrandId(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="dc-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">All platform</option>
            <option value="TIKTOK">TIKTOK</option>
            <option value="INSTAGRAM">INSTAGRAM</option>
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="FACEBOOK">FACEBOOK</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input className="dc-input md:col-span-3" placeholder="Search campaign/creator/brand/note" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Filter</button>
      </section>

      {notice ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được content queue" description={error} onRetry={() => void load()} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4">
          <h2 className="text-xl font-bold">Queue kiểm duyệt nội dung tổng hợp</h2>
          {combinedQueue.length === 0 ? (
            <div className="mt-3"><EmptyState title="Không có content submission" description="Không có bản ghi phù hợp bộ lọc." /></div>
          ) : (
            <div className="mt-3 grid gap-3">
              {combinedQueue.map((entry) => {
                if (entry.kind === "video-review") {
                  const item = entry.payload;
                  return (
                    <article key={entry.id} className="dc-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.account.displayName}</p>
                          <p className="text-xs text-zinc-500">
                            {item.account.email} • {item.account.creatorProfile?.mainPlatform ?? "Không có"} • Campaign: {item.campaign.title}
                          </p>
                          <p className="text-xs text-zinc-500">Mission: {item.mission.title} • Queue: Video review</p>
                        </div>
                        <StatusBadge status="pending_review" />
                      </div>
                      <p className="mt-2 text-sm text-zinc-700 line-clamp-2">Video URL: {item.submission?.videoUrl ?? "-"}</p>
                      <p className="mt-1 text-xs text-zinc-500">Ghi chú: {item.submission?.note ?? "-"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="dc-btn-primary" onClick={() => void decideVideoReview(item.id, "APPROVE_VIDEO_REVIEW")}>Duyệt video</button>
                        <button className="dc-btn-secondary" onClick={() => void decideVideoReview(item.id, "REJECT_VIDEO_REVIEW")}>Từ chối video</button>
                      </div>
                    </article>
                  );
                }

                const item = entry.payload;
                return (
                  <article key={entry.id} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.account.displayName}</p>
                        <p className="text-xs text-zinc-500">
                          {item.account.email} • {item.account.creatorProfile?.mainPlatform ?? "Không có"} • Campaign: {item.mission.campaign.title}
                        </p>
                        <p className="text-xs text-zinc-500">Brand: {item.mission.campaign.brand.displayName}</p>
                      </div>
                      <StatusBadge status={item.statusView.toLowerCase()} />
                    </div>
                    <p className="mt-2 text-sm text-zinc-700 line-clamp-2">{item.proofTextNote ?? "Chưa có chú thích/ghi chú"}</p>
                    <p className="mt-1 text-xs text-zinc-500">Draft link: {item.videoUrl ?? item.socialPostUrl ?? "Không có"}</p>
                    <div className="mt-3">
                      <Link className="dc-btn-primary" href={`/admin/content-review/${item.id}`}>Review detail</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
