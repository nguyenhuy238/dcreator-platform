"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type FilterType = "ALL" | "MASTER";
type FeaturedCampaignItem = {
  slug: string;
  title: string;
  brand: string;
  campaignType: CampaignType;
  coverImageUrl?: string | null;
  backers: number;
  progressPercent: number;
  creatorApplicants?: number;
};

const typeLabel: Record<FilterType, string> = { ALL: "Video seeding", MASTER: "Master Campaign" };

export function FeaturedCampaignsSection({ campaigns }: { campaigns: FeaturedCampaignItem[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [slideStart, setSlideStart] = useState(0);
  const filters: FilterType[] = ["ALL", "MASTER"];
  const pageSize = 3;

  const filteredCampaigns = useMemo(() => {
    if (activeFilter === "MASTER") return campaigns;
    if (activeFilter === "ALL") return campaigns;
    return campaigns;
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
                <Image
                  src={campaign.coverImageUrl ?? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200"}
                  alt={campaign.title}
                  fill
                  className="object-cover transition duration-500 hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-zinc-950/10 to-transparent" />
                <div className="absolute left-3 top-3 rounded-full border border-white/25 bg-zinc-900/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-white">
                  Video seeding
                </div>
              </div>

              <div className="p-5">
                <h3 className="line-clamp-2 text-2xl font-black leading-tight text-zinc-900">{campaign.title}</h3>

                <p className="mt-3 text-sm font-semibold text-zinc-600">Brand: {campaign.brand}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-zinc-500">Creator ứng tuyển</p>
                    <p className="font-black text-zinc-900">{campaign.creatorApplicants ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-zinc-500">Hoàn thiện camp</p>
                    <p className="font-black text-zinc-900">{campaign.progressPercent}%</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-zinc-900 transition-all" style={{ width: `${campaign.progressPercent}%` }} />
                </div>

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
