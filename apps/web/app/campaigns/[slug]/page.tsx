import { CampaignDetailContainer } from "./_components/CampaignDetailContainer";

type Props = {
  params: Promise<{ slug: string }>;
};

const legacySlugMap: Record<string, string> = {
  "freshskin-summer-creator-boost": "beauty-livefest",
  "snackgo-campus-challenge": "spring-ugc-2026",
  "fitplus-voucher-drop": "tech-week-fund"
};

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  return <CampaignDetailContainer slug={legacySlugMap[slug] ?? slug} />;
}
