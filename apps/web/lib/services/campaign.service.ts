import { CampaignStatus } from "@prisma/client";
import { prisma } from "../db";

export async function listCampaigns(input: { status?: CampaignStatus; limit: number }) {
  return prisma.campaign.findMany({
    where: input.status ? { status: input.status } : undefined,
    take: input.limit,
    orderBy: { createdAt: "desc" },
    include: {
      brand: { select: { id: true, displayName: true } }
    }
  });
}
