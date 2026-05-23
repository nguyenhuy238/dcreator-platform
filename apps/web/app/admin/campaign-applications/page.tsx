"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Item = {
  id: string;
  lifecycleStatus: string;
  note: string | null;
  account: {
    id: string;
    email: string;
    displayName: string;
    creatorProfile: { mainPlatform: string; followerCount: number | null; contentCategory: string | null; socialUrl: string } | null;
  };
  mission: { campaign: { id: string; title: string; brand: { id: string; displayName: string } } };
};

export default function AdminCampaignApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [followerMin, setFollowerMin] = useState("");
  const [followerMax, setFollowerMax] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (campaignId.trim()) params.set("campaignId", campaignId.trim());
      if (brandId.trim()) params.set("brandId", brandId.trim());
      if (status) params.set("status", status);
      if (platform) params.set("platform", platform);
      if (followerMin) params.set("followerMin", followerMin);
      if (followerMax) params.set("followerMax", followerMax);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/campaign-applications?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load applications failed");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load applications failed");
    } finally {
      setLoading(false);
    }
  }, [brandId, campaignId, followerMax, followerMin, platform, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Creator Apply Campaign" subtitle="Admin review creator applications cho từng campaign." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input className="dc-input" placeholder="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <input className="dc-input" placeholder="Brand ID" value={brandId} onChange={(e) => setBrandId(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="ACCEPTED">APPLIED</option>
            <option value="DOING">ADMIN_APPROVED / SENT_TO_BRAND / ASSIGNED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select className="dc-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">All platform</option>
            <option value="TIKTOK">TIKTOK</option>
            <option value="INSTAGRAM">INSTAGRAM</option>
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="FACEBOOK">FACEBOOK</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input className="dc-input" placeholder="Follower min" value={followerMin} onChange={(e) => setFollowerMin(e.target.value)} />
          <input className="dc-input" placeholder="Follower max" value={followerMax} onChange={(e) => setFollowerMax(e.target.value)} />
          <input className="dc-input md:col-span-2" placeholder="Search name/email/social/link" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Filter</button>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được application queue" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="mt-4"><EmptyState title="Không có creator applications" description="Không có dữ liệu phù hợp bộ lọc." /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.account.email} • {item.account.creatorProfile?.mainPlatform ?? "N/A"} • {item.account.creatorProfile?.followerCount ?? 0} followers
                    </p>
                    <p className="text-xs text-zinc-500">Campaign: {item.mission.campaign.title} • Brand: {item.mission.campaign.brand.displayName}</p>
                  </div>
                  <StatusBadge status={item.lifecycleStatus.toLowerCase()} />
                </div>
                {item.note ? <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{item.note}</p> : null}
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/campaign-applications/${item.id}`}>Review detail</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
