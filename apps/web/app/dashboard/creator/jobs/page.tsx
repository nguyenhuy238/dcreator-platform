"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/app/components/dcreator/ui/base";
import { CampaignList } from "@/app/campaigns/_components/CampaignList";

type MissionHistoryItem = {
  id: string;
  status: string;
  campaign: { id: string; title: string; slug: string; brand?: { displayName?: string } | null };
};

type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  coverImageUrl: string | null;
};

type HistoryStatus = "IN_PROGRESS" | "COMPLETED" | "REJECTED";

const statusLabel: Record<HistoryStatus, string> = {
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn thành",
  REJECTED: "Bị từ chối"
};

function toHistoryStatus(status: string): HistoryStatus {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELLED") return "REJECTED";
  return "IN_PROGRESS";
}

export default function CreatorJobsPage() {
  const [historyItems, setHistoryItems] = useState<CampaignItem[]>([]);
  const [participatedSlugs, setParticipatedSlugs] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<HistoryStatus>("IN_PROGRESS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [missionsRes, campaignsRes] = await Promise.all([
          fetch("/api/me/mission", { cache: "no-store" }),
          fetch("/api/campaigns?status=ACTIVE&sort=trending&page=1&limit=50", { cache: "no-store" })
        ]);
        const missionsBody = await missionsRes.json();
        const campaignsBody = await campaignsRes.json();
        if (!active) return;
        const missionRows = (missionsBody?.data ?? []) as MissionHistoryItem[];
        setParticipatedSlugs(Array.from(new Set(missionRows.map((item) => item.campaign.slug))));
        const campaignRows = (campaignsBody?.data?.items ?? []) as CampaignItem[];
        const campaignBySlug = new Map(campaignRows.map((item) => [item.slug, item]));

        const rows: CampaignItem[] = [];
        const seen = new Set<string>();
        for (const mission of missionRows) {
          const status = toHistoryStatus(mission.status);
          if (status !== activeStatus) continue;
          const fromList = campaignBySlug.get(mission.campaign.slug);
          const key = `${status}-${mission.campaign.slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            id: mission.campaign.id,
            slug: mission.campaign.slug,
            title: mission.campaign.title,
            brand: fromList?.brand ?? mission.campaign.brand?.displayName ?? "Đang cập nhật",
            coverImageUrl: fromList?.coverImageUrl ?? null
          });
        }
        setHistoryItems(rows);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [activeStatus]);

  const historyTitle = useMemo(() => statusLabel[activeStatus], [activeStatus]);

  return (
    <>
      <PageHeader title="Campaign / Job" subtitle="Danh sách campaign đang mở để Creator tham gia và nhận nhiệm vụ phù hợp." />
      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-zinc-900">{historyTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(statusLabel) as HistoryStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  activeStatus === status ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {statusLabel[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {loading ? (
            <div className="h-36 min-w-[260px] animate-pulse rounded-xl bg-zinc-100" />
          ) : historyItems.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có campaign trong nhóm này.</p>
          ) : (
            historyItems.map((campaign) => (
              <article key={`${activeStatus}-${campaign.slug}`} className="min-w-[260px] rounded-xl border border-zinc-200 bg-white p-2">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-zinc-100">
                  <Image
                    src={campaign.coverImageUrl ?? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200"}
                    alt={campaign.title}
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-bold text-zinc-900">{campaign.title}</p>
                <p className="text-xs text-zinc-500">Brand: {campaign.brand}</p>
                <div className="mt-2 flex justify-end">
                  <Link href={`/campaigns/${campaign.slug}`} className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                    Xem chi tiết
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <CampaignList excludeSlugs={participatedSlugs} />
    </>
  );
}
