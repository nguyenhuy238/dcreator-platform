import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      budgetVnd: true,
      brand: { select: { displayName: true } }
    }
  });

  return (
    <main className="container">
      <h1>Campaign Marketplace</h1>
      {campaigns.length === 0 ? <p>Chưa có campaign.</p> : null}
      {campaigns.map((campaign) => (
        <article key={campaign.id} className="card">
          <h2>{campaign.title}</h2>
          <p>Brand: {campaign.brand.displayName}</p>
          <p>Status: {campaign.status}</p>
          <p>Budget: {campaign.budgetVnd.toLocaleString("vi-VN")} VND</p>
          <Link href={`/campaigns/${campaign.slug}`}>Xem chi tiết</Link>
        </article>
      ))}
    </main>
  );
}