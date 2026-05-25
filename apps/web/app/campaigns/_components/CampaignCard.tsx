import Link from "next/link";
import Image from "next/image";

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
  creatorApplicants?: number;
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
    <article className="dc-card overflow-hidden p-0">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
        <Image
          src={resolveCoverImageSrc(campaign.coverImageUrl)}
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
            <p className="text-zinc-500">{"Creator \u1ee9ng tuy\u1ec3n"}</p>
            <p className="font-black text-zinc-900">{campaign.creatorApplicants ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-zinc-500">{"Ho\u00e0n thi\u1ec7n camp"}</p>
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
            aria-label={`Xem chi ti\u1ebft ${campaign.title}`}
          >
            {"Xem chi ti\u1ebft"}
            <span className="text-base font-bold">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
