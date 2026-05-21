import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: {
      brand: { select: { displayName: true } },
      missions: { select: { id: true, title: true, rewardPoints: true, status: true } },
      rewards: { select: { id: true, title: true, pointsCost: true, stock: true, isActive: true } }
    }
  });

  if (!campaign) return notFound();

  return (
    <main className="container">
      <h1>{campaign.title}</h1>
      <p>{campaign.brief}</p>
      <p>Brand: {campaign.brand.displayName}</p>
      <p>Budget: {campaign.budgetVnd.toLocaleString("vi-VN")} VND</p>

      <h2>Missions</h2>
      {campaign.missions.map((mission) => (
        <article key={mission.id} className="card">
          <strong>{mission.title}</strong>
          <p>Status: {mission.status}</p>
          <p>Reward: {mission.rewardPoints} N-Points</p>
        </article>
      ))}

      <h2>Rewards/Vouchers</h2>
      {campaign.rewards.map((reward) => (
        <article key={reward.id} className="card">
          <strong>{reward.title}</strong>
          <p>Cost: {reward.pointsCost} points</p>
          <p>Stock: {reward.stock}</p>
          <p>{reward.isActive ? "Active" : "Inactive"}</p>
        </article>
      ))}
    </main>
  );
}