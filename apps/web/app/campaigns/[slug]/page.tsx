import { CampaignDetailContainer } from "./_components/CampaignDetailContainer";
import { CreatorWorkspaceGate } from "@/app/dashboard/creator/_components/CreatorWorkspaceGate";

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
  const resolvedSlug = legacySlugMap[slug] ?? slug;
  const content = <CampaignDetailContainer slug={resolvedSlug} />;

  return (
    <CreatorWorkspaceGate fallback={content}>
      {content}
    </CreatorWorkspaceGate>
  );
}
