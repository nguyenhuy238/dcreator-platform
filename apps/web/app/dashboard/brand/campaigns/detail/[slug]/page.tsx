import { CampaignDetailContainer } from "@/app/campaigns/[slug]/_components/CampaignDetailContainer";

type Props = {
  params: Promise<{ slug: string }>;
};

const legacySlugMap: Record<string, string> = {
  "freshskin-summer-creator-boost": "beauty-livefest",
  "snackgo-campus-challenge": "spring-ugc-2026",
  "fitplus-voucher-drop": "tech-week-fund"
};

export default async function BrandCampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const resolvedSlug = legacySlugMap[slug] ?? slug;

  return (
    <main className="mx-auto w-full max-w-7xl pb-16 pt-2">
      <CampaignDetailContainer slug={resolvedSlug} />
    </main>
  );
}
