"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";

type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type FeaturedType = "VIDEO_SEEDING" | "MASTER";
type FilterType = "ALL" | FeaturedType;
type FeaturedCampaignItem = {
  slug: string;
  title: string;
  brand: string;
  campaignType: CampaignType;
  featuredType: FeaturedType;
  coverImageUrl?: string | null;
  backers: number;
  progressPercent: number;
  videoProgressPercent?: number;
  videoApproved?: number;
  videoTarget?: number;
  creatorJoined?: number;
  creatorApplicants?: number;
};

const typeLabel: Record<FilterType, string> = {
  ALL: "Tất cả",
  VIDEO_SEEDING: "Video seeding",
  MASTER: "Master Campaign"
};

export function FeaturedCampaignsSection({ campaigns }: { campaigns: FeaturedCampaignItem[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [slideStart, setSlideStart] = useState(0);
  const filters: FilterType[] = ["ALL", "VIDEO_SEEDING", "MASTER"];
  const pageSize = 3;

  const filteredCampaigns = useMemo(() => {
    if (activeFilter === "ALL") return campaigns;
    return campaigns.filter((campaign) => campaign.featuredType === activeFilter);
  }, [activeFilter, campaigns]);

  useEffect(() => {
    setSlideStart(0);
  }, [activeFilter]);

  const visibleCampaigns = filteredCampaigns.slice(slideStart, slideStart + pageSize);
  const canSlide = filteredCampaigns.length > pageSize;

  function goNext() {
    if (!canSlide) return;
    const nextStart = slideStart + pageSize;
    setSlideStart(nextStart >= filteredCampaigns.length ? 0 : nextStart);
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-black">Chiến dịch nổi bật</h2>
        <div className="flex items-center gap-3">
          {canSlide ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-lg font-bold text-zinc-800 transition hover:bg-zinc-100"
              aria-label="Xem thêm chiến dịch tiếp theo"
            >
              →
            </button>
          ) : null}
          <Link href="/campaigns" className="text-sm font-semibold text-zinc-600">
            Xem tất cả
          </Link>
        </div>
      </div>

      <div className="mb-5 overflow-x-auto pb-1">
        <div className="flex w-max gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                activeFilter === filter
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-zinc-50 text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              {typeLabel[filter]}
            </button>
          ))}
        </div>
      </div>

      {visibleCampaigns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCampaigns.map((campaign) => (
            <article key={campaign.slug} className="dc-card overflow-hidden p-0">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
                <CampaignCoverImage
                  src={campaign.coverImageUrl}
                  alt={campaign.title}
                  className="object-cover transition duration-500 hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-zinc-950/10 to-transparent" />
                <div className="absolute left-3 top-3 rounded-full border border-white/25 bg-zinc-900/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-white">
                  {typeLabel[campaign.featuredType]}
                </div>
              </div>

              <div className="p-5">
                <h3 className="line-clamp-2 text-2xl font-black leading-tight text-zinc-900">{campaign.title}</h3>

                <p className="mt-3 text-sm font-semibold text-zinc-600">Brand: {campaign.brand}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-600">
                  Video hoàn thành: {campaign.videoApproved ?? 0}/{campaign.videoTarget ?? 0}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-zinc-500">Creator đã tham gia</p>
                    <p className="font-black text-zinc-900">{campaign.creatorJoined ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-zinc-500">Video dự kiến</p>
                    <p className="font-black text-zinc-900">{campaign.videoTarget ?? 0}</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-zinc-900 transition-all" style={{ width: `${campaign.videoProgressPercent ?? 0}%` }} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">Tiến độ video: {campaign.videoProgressPercent ?? 0}%</p>

                <div className="mt-4 flex justify-end">
                  <Link
                    href={`/campaigns/${campaign.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
                    aria-label={`Xem chi tiết ${campaign.title}`}
                  >
                    Xem chi tiết
                    <span className="text-base font-bold">→</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dc-card p-6 text-sm text-zinc-600">Chưa có chiến dịch phù hợp với bộ lọc này.</div>
      )}
    </section>
  );
}
