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
      fulfillmentMode: true,
      creatorDepositRequired: true,
      category: true,
      benefits: true,
      requirementsSummary: true,
      creatorBriefDescription: true,
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
      brand: { select: { id: true, displayName: true, avatarUrl: true } },
      creator: {
        select: {
          displayName: true,
          avatarUrl: true,
          creatorProfile: { select: { displayName: true, avatarUrl: true } }
        }
      },
      sourceBrandRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { brand: { select: { name: true, logoUrl: true, legalName: true } } }
      },
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
  const ownerBrand = await prisma.brand.findFirst({
    where: { ownerAccountId: campaign.brand.id },
    orderBy: { updatedAt: "desc" },
    select: { name: true, legalName: true, logoUrl: true }
  });
  let requiredHashtags: string[] = [];
  try {
    const rows = await prisma.$queryRaw<Array<{ requiredHashtags: string[] }>>`
      SELECT "requiredHashtags" FROM "Campaign" WHERE "id" = ${campaign.id} LIMIT 1
    `;
    requiredHashtags = rows[0]?.requiredHashtags ?? [];
  } catch {
    requiredHashtags = [];
  }

  const viewerHasSupported = viewerId
    ? campaign.contributions.some((contribution) => contribution.supporterId === viewerId)
    : false;

  return { campaign: { ...campaign, ownerBrand, requiredHashtags }, viewerHasSupported };
}
