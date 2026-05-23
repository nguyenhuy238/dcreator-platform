"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Item = {
  id: string;
  lifecycleStatus: string;
  account: { id: string; displayName: string; email: string; creatorProfile: { mainPlatform: string; followerCount: number | null } | null };
  mission: { campaign: { id: string; title: string; brand: { displayName: string } } };
};

export default function AdminCampaignScopedApplicationsPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!campaignId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/campaigns/${campaignId}/applications`, { cache: "no-store" });
        const body = (await res.json()) as ApiResult<Item[]>;
        if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách đơn ứng tuyển thất bại");
        if (active) setItems(body.data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Tải danh sách đơn ứng tuyển thất bại");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [campaignId]);

  return (
    <>
      <PageHeader title="Campaign Applications" subtitle={`Campaign ID: ${campaignId}`} />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không tải được applications" description={error} /> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState title="Không có application" description="Campaign này chưa có creator apply." />
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.account.email} • {item.account.creatorProfile?.mainPlatform ?? "Không có"} • {item.account.creatorProfile?.followerCount ?? 0} followers</p>
                  </div>
                  <StatusBadge status={item.lifecycleStatus.toLowerCase()} />
                </div>
                <div className="mt-3">
                  <Link className="dc-btn-primary" href={`/admin/campaign-applications/${item.id}`}>Xem chi tiết</Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
