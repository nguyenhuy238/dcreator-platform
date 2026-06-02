import { CampaignDetailContainer } from "./_components/CampaignDetailContainer";
import { CreatorWorkspaceGate } from "@/app/dashboard/creator/_components/CreatorWorkspaceGate";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";

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
    <CreatorWorkspaceGate
      fallback={
        <>
          <PublicHeader />
          <main className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-6 md:px-6">{content}</main>
        </>
      }
    >
      {content}
    </CreatorWorkspaceGate>
  );
}
