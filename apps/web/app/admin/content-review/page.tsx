"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

const statusOptions = ["SUBMITTED", "ADMIN_REVIEWING", "ADMIN_APPROVED", "ADMIN_REJECTED", "CHANGES_REQUESTED", "BRAND_REVIEWING", "READY_TO_PUBLISH", "PUBLISHED"];

export default function AdminContentReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
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
      const res = await fetch(`/api/admin/content-review?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load submissions failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load submissions failed");
    } finally {
      setLoading(false);
    }
  }, [brandId, campaignId, creatorId, platform, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Content Review"
        subtitle="Kiểm duyệt draft/video/link từ Creator trước khi chuyển Brand hoặc publish."
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

      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được content queue" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có content submission" description="Không có bản ghi phù hợp bộ lọc." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.account.email} • {item.account.creatorProfile?.mainPlatform ?? "N/A"} • Campaign: {item.mission.campaign.title}
                    </p>
                    <p className="text-xs text-zinc-500">Brand: {item.mission.campaign.brand.displayName}</p>
                  </div>
                  <StatusBadge status={item.statusView.toLowerCase()} />
                </div>
                <p className="mt-2 text-sm text-zinc-700 line-clamp-2">{item.proofTextNote ?? "No caption/note"}</p>
                <p className="mt-1 text-xs text-zinc-500">Draft link: {item.videoUrl ?? item.socialPostUrl ?? "N/A"}</p>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/content-review/${item.id}`}>Review detail</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}

