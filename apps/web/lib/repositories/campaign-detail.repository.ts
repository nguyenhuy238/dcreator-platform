import { prisma } from "@/lib/db";

export async function findPublicCampaignDetailBySlug(slug: string, viewerId?: string) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      slug,
      isPublic: true,
      status: { in: ["ACTIVE", "COMPLETED"] }
    },
    select: {
      id: true,
      slug: true,
      title: true,
      brief: true,
      coverImageUrl: true,
      productName: true,
      productDescription: true,
      productImageUrl: true,
      productLink: true,
      campaignType: true,
      category: true,
      benefits: true,
      participationRoadmap: true,
      objective: true,
      priorityChannels: true,
      missionTypes: true,
      creatorCommissionPercent: true,
      userCommissionPercent: true,
      bonusBudgetVnd: true,
      status: true,
      createdAt: true,
      startsAt: true,
      endsAt: true,
      targetAmountVnd: true,
      fundedAmountVnd: true,
      ugcVideoQuota: true,
      ugcVideoApprovedCount: true,
      brand: { select: { displayName: true } },
      creator: { select: { displayName: true } },
      rewards: {
        where: { isActive: true },
        orderBy: { pointsCost: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          pointsCost: true,
          stockTotal: true,
          stockRemaining: true,
          rewardType: true,
          estimatedDeliveryAt: true,
          createdAt: true
        }
      },
      missions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          audience: true,
          productReceiveOption: true,
          productName: true,
          productDescription: true,
          productImageUrl: true,
          productLink: true,
          allowRepeat: true,
          deadlineAt: true,
          rewardPoints: true,
          status: true,
          createdAt: true
        }
      },
      contributions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          supporterId: true,
          amountVnd: true,
          createdAt: true,
          supporter: { select: { displayName: true } }
        }
      },
      creatorMissions: {
        where: { applicationStatus: "APPROVED" },
        select: { accountId: true }
      }
    }
  });

  if (!campaign) return null;

  const viewerHasSupported = viewerId
    ? campaign.contributions.some((contribution) => contribution.supporterId === viewerId)
    : false;

  return { campaign, viewerHasSupported };
}
