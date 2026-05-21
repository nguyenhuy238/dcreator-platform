import { CampaignDetailContainer } from "./_components/CampaignDetailContainer";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  return <CampaignDetailContainer slug={slug} />;
}
