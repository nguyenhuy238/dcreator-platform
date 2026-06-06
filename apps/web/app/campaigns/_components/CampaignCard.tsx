"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { trackEvent } from "@/lib/analytics";
import { AnalyticsEvents } from "@/lib/analytics-events";
import { CreatorCampaignApplyButton } from "./CreatorCampaignApplyButton";

export type CampaignCardData = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  brand: string;
  creator: string | null;
  campaignType: string;
  fundedAmount: number;
  targetAmount: number;
  progressPercent: number;
  videoProgressPercent?: number;
  videoApproved?: number;
  videoTarget?: number;
  creatorJoined?: number;
  missionSlotsRemaining?: number;
  isMissionQuotaReached?: boolean;
  backers: number;
  creatorApplicants?: number;
  rewardsLeft: number;
  deadline: string | Date | null;
};

export function CampaignCard({
  campaign,
  compact = false,
  pageSource = "campaigns",
  detailHrefBase = "/campaigns",
  clickableCard = false,
  showDetailButton = true
}: {
  campaign: CampaignCardData;
  compact?: boolean;
  pageSource?: string;
  detailHrefBase?: string;
  clickableCard?: boolean;
  showDetailButton?: boolean;
}) {
  const router = useRouter();
  const videoTarget = campaign.videoTarget ?? 0;
  const videoApproved = campaign.videoApproved ?? 0;
  const creatorJoined = campaign.creatorJoined ?? 0;
  const videoProgressPercent = campaign.videoProgressPercent ?? 0;
  const detailHref = `${detailHrefBase}/${campaign.slug}`;

  function trackCampaignClick() {
    trackEvent(AnalyticsEvents.CAMPAIGN_CARD_CLICK, {
      campaign_id: campaign.slug,
      campaign_title: campaign.title,
      campaign_status: "ACTIVE",
      page_source: pageSource
    });
  }

  function openDetail() {
    trackCampaignClick();
    router.push(detailHref);
  }

  return (
    <article
      className={
        clickableCard
          ? "group dc-card flex h-full cursor-pointer flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-zinc-300 focus-visible:-translate-y-1 focus-visible:shadow-xl focus-visible:ring-2 focus-visible:ring-zinc-400"
          : `dc-card flex flex-col overflow-hidden p-0 ${compact ? "" : "h-full"}`
      }
      role={clickableCard ? "link" : undefined}
      tabIndex={clickableCard ? 0 : undefined}
      onClick={clickableCard ? openDetail : undefined}
      onKeyDown={
        clickableCard
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
        <CampaignCoverImage
          src={campaign.coverImageUrl}
          alt={campaign.title}
          className={`object-cover transition duration-500 ${clickableCard ? "group-hover:scale-[1.03]" : "hover:scale-[1.03]"}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-zinc-950/10 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full border border-white/25 bg-zinc-900/65 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-white">
          Video seeding
        </div>
        {clickableCard ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-semibold text-zinc-900 opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            Xem chi tiết
          </div>
        ) : null}
      </div>

      {compact ? (
        <div className="grid gap-y-2 p-4">
          <div className="grid gap-1">
            <h3 className="line-clamp-2 min-h-[4rem] text-2xl font-black leading-tight text-zinc-900">{campaign.title}</h3>
            <p className="truncate text-sm font-semibold leading-5 text-zinc-600">Brand: {campaign.brand}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            <div
              className={`min-w-0 ${showDetailButton ? "flex-1" : "ml-auto w-auto"}`}
              onClick={clickableCard ? (event) => event.stopPropagation() : undefined}
              onKeyDown={clickableCard ? (event) => event.stopPropagation() : undefined}
            >
              <CreatorCampaignApplyButton
                slug={campaign.slug}
                compact
                inline
                hideStatusMessage
                labelOverride={showDetailButton ? undefined : "Tham gia ngay"}
                fullWidth={showDetailButton}
              />
            </div>
            {showDetailButton ? (
              <Link
                href={detailHref}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
                aria-label={`Xem chi tiết ${campaign.title}`}
                onClick={trackCampaignClick}
              >
                Xem chi tiết
                <span className="text-base font-bold">→</span>
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="p-5">
          <h3 className="line-clamp-2 min-h-[4rem] text-2xl font-black leading-tight text-zinc-900">{campaign.title}</h3>
          <p className="mt-3 truncate text-sm font-semibold text-zinc-600">Brand: {campaign.brand}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-600">Video hoàn thành: {videoApproved}/{videoTarget}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-zinc-500">Creator đã tham gia</p>
              <p className="font-black text-zinc-900">{creatorJoined}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-zinc-500">Video dự kiến</p>
              <p className="font-black text-zinc-900">{videoTarget}</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full bg-zinc-900 transition-all" style={{ width: `${videoProgressPercent}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">Tiến độ video: {videoProgressPercent}%</p>

          <div className="mt-4 flex items-center gap-2">
            <div
              className="min-w-0 flex-1"
              onClick={clickableCard ? (event) => event.stopPropagation() : undefined}
              onKeyDown={clickableCard ? (event) => event.stopPropagation() : undefined}
            >
              <CreatorCampaignApplyButton slug={campaign.slug} compact inline hideStatusMessage />
            </div>
            {showDetailButton ? (
              <Link
                href={detailHref}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
                aria-label={`Xem chi tiết ${campaign.title}`}
                onClick={trackCampaignClick}
              >
                Xem chi tiết
                <span className="text-base font-bold">→</span>
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}
