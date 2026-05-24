import Link from "next/link";
import Image from "next/image";
import { CreatorCampaignApplyButton } from "./CreatorCampaignApplyButton";

const FALLBACK_COVER_IMAGE = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200";

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
  backers: number;
  rewardsLeft: number;
  deadline: string | Date | null;
};

function resolveCoverImageSrc(url: string | null) {
  if (!url) return FALLBACK_COVER_IMAGE;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return FALLBACK_COVER_IMAGE;
    if (parsed.pathname === "/" && !parsed.search) return FALLBACK_COVER_IMAGE;
    return parsed.toString();
  } catch {
    return FALLBACK_COVER_IMAGE;
  }
}

export function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  return (
    <article className="dc-card overflow-hidden">
      <Image
        className="aspect-video w-full object-cover bg-zinc-200"
        src={resolveCoverImageSrc(campaign.coverImageUrl)}
        alt={campaign.title}
        width={1200}
        height={675}
      />
      <div className="grid gap-2 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đang mở</span>
          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">{campaign.campaignType}</span>
        </div>
        <h3 className="text-lg font-bold text-zinc-900">{campaign.title}</h3>
        <p className="text-sm text-slate-600">Thương hiệu: {campaign.brand}</p>
        <p className="text-sm text-slate-600">Creator: {campaign.creator ?? "Chưa chỉ định"}</p>
        <p className="text-sm text-slate-600">
          Đã ủng hộ: {campaign.fundedAmount.toLocaleString("vi-VN")} / {campaign.targetAmount.toLocaleString("vi-VN")} VND
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full bg-gradient-to-r from-zinc-900 to-zinc-500" style={{ width: `${campaign.progressPercent}%` }} />
        </div>
        <p className="text-sm text-slate-600">Backer: {campaign.backers}</p>
        <p className="text-sm text-slate-600">Reward còn lại: {campaign.rewardsLeft}</p>
        <p className="text-sm text-slate-600">
          Hạn chót: {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString("vi-VN") : "Không giới hạn"}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link href={`/campaigns/${campaign.slug}`} className="dc-btn-primary">
            Chọn reward
          </Link>
          <CreatorCampaignApplyButton slug={campaign.slug} compact />
        </div>
      </div>
    </article>
  );
}
