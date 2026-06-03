"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/dcreator/ui/base";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { CampaignList } from "@/app/campaigns/_components/CampaignList";

type MissionHistoryItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  videoReviewStatus: string;
  submission?: { status: string } | null;
  publishStatus: string;
  missionApplication?: { status: string } | null;
  mission: { title: string };
  campaign: { id: string; title: string; slug: string; coverImageUrl?: string | null; brand?: { displayName?: string } | null };
};

type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  coverImageUrl: string | null;
  missionStatus: string;
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

function missionStatusLabel(item: MissionHistoryItem) {
  if (item.missionApplication?.status === "PENDING_REVIEW") return "Chờ duyệt tham gia";
  if (item.missionApplication?.status === "REJECTED") return "Đăng ký bị từ chối";
  if (item.status === "COMPLETED") return "Đã hoàn thành";
  if (item.status === "CANCELLED") return "Bị từ chối";
  if (item.publishStatus === "PENDING") return "Chờ duyệt link public";
  if (item.publishStatus === "REJECTED") return "Link public bị từ chối";
  if (item.videoReviewStatus === "PENDING") return "Chờ duyệt video";
  if (item.videoReviewStatus === "REJECTED") return "Video bị từ chối";
  if (item.videoReviewStatus === "APPROVED") return "Cần nộp link public";
  if (item.status === "DRAFT_PENDING") {
    if (item.submission?.status === "SUBMITTED") return "Chờ duyệt kịch bản";
    if (item.submission?.status === "REJECTED") return "Kịch bản bị từ chối";
    return "Cần nộp kịch bản";
  }
  if (item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED") return "Cần xác nhận mua hàng";
  return "Cần nộp video";
}

function missionStatusPillClass(label: string) {
  if (label.includes("từ chối")) return "border-red-200 bg-red-50 text-red-700";
  if (label.includes("hoàn thành")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label.includes("Chờ")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
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
        const missionsRes = await fetch("/api/me/mission", { cache: "no-store" });
        const missionsBody = await missionsRes.json();
        if (!active) return;
        const missionRows = (missionsBody?.data ?? []) as MissionHistoryItem[];
        setParticipatedSlugs(Array.from(new Set(missionRows.map((item) => item.campaign.slug))));

        const rows: CampaignItem[] = [];
        const seen = new Set<string>();
        for (const mission of missionRows) {
          const status = toHistoryStatus(mission.status);
          if (status !== activeStatus) continue;
          const key = `${status}-${mission.campaign.slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const currentMissionStatus = missionStatusLabel(mission);
          rows.push({
            id: mission.campaign.id,
            slug: mission.campaign.slug,
            title: mission.campaign.title,
            brand: mission.campaign.brand?.displayName ?? "Đang cập nhật",
            coverImageUrl: mission.campaign.coverImageUrl ?? null,
            missionStatus: currentMissionStatus
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

        <div className="flex gap-3 overflow-x-auto pb-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-48 min-w-[230px] rounded-2xl bg-zinc-100 sm:min-w-[260px]" />)
          ) : historyItems.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có campaign trong nhóm này.</p>
          ) : (
            historyItems.map((campaign) => (
              <article key={`${activeStatus}-${campaign.slug}`} className="min-w-[230px] max-w-[230px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:min-w-[260px] sm:max-w-[260px]">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
                  <CampaignCoverImage
                    src={campaign.coverImageUrl}
                    alt={campaign.title}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <div className="grid min-h-[136px] grid-rows-[auto_1fr] gap-3 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-zinc-900">{campaign.title}</p>
                      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-500">Brand: {campaign.brand}</p>
                    </div>
                    <span className={`max-w-[92px] shrink-0 rounded-xl border px-2 py-1 text-center text-[11px] font-bold leading-tight ${missionStatusPillClass(campaign.missionStatus)}`}>
                      {campaign.missionStatus}
                    </span>
                  </div>
                  <div className="flex items-end justify-end">
                    <Link href={`/campaigns/${campaign.slug}`} className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                    Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <CampaignList excludeSlugs={participatedSlugs} compact />
    </>
  );
}
