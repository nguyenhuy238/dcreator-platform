import { CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { resolveImageUrl } from "../images/resolve-image-url";

export type ListCampaignsInput = {
  search?: string;
  type?: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
  category?: "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
  status?: CampaignStatus;
  rewardAvailable?: boolean;
  sort: "trending" | "newest" | "ending-soon" | "most-funded";
  page: number;
  limit: number;
};

function toVnd(value: number) {
  return Math.max(0, value);
}

export async function listCampaigns(input: ListCampaignsInput) {
  const where: Prisma.CampaignWhereInput = {
    isPublic: true,
    status: CampaignStatus.ACTIVE
  };

  if (input.status && input.status === CampaignStatus.ACTIVE) {
    where.status = CampaignStatus.ACTIVE;
  }
  if (input.type) where.campaignType = input.type;
  if (input.category) where.category = input.category;
  if (input.rewardAvailable) {
    where.rewards = { some: { isActive: true, stockRemaining: { gt: 0 } } };
  }
  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { brand: { displayName: { contains: input.search, mode: "insensitive" } } },
      { creator: { displayName: { contains: input.search, mode: "insensitive" } } }
    ];
  }

  const orderBy: Prisma.CampaignOrderByWithRelationInput[] = [];
  if (input.sort === "trending") {
    orderBy.push({ backerCount: "desc" }, { updatedAt: "desc" });
  } else if (input.sort === "newest") {
    orderBy.push({ createdAt: "desc" });
  } else if (input.sort === "ending-soon") {
    orderBy.push({ endsAt: "asc" }, { createdAt: "desc" });
  } else {
    orderBy.push({ fundedAmountVnd: "desc" }, { createdAt: "desc" });
  }

  const [total, campaigns] = await prisma.$transaction([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        slug: true,
        title: true,
        brief: true,
        coverImageUrl: true,
        campaignType: true,
        category: true,
        fundedAmountVnd: true,
        targetAmountVnd: true,
        backerCount: true,
        ugcVideoQuota: true,
        ugcVideoApprovedCount: true,
        endsAt: true,
        createdAt: true,
        brand: { select: { displayName: true, avatarUrl: true } },
        creator: { select: { displayName: true } }
      }
    })
  ]);

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const rewardSums =
    campaignIds.length === 0
      ? []
      : await prisma.reward.groupBy({
          by: ["campaignId"],
          where: {
            campaignId: { in: campaignIds },
            isActive: true
          },
          _sum: {
            stockRemaining: true
          }
        });
  const rewardByCampaignId = new Map<string, number>(
    rewardSums.map((row) => [row.campaignId, row._sum.stockRemaining ?? 0])
  );

  const missionApplications =
    campaignIds.length === 0
      ? []
      : await prisma.missionApplication.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: campaignIds } },
          _count: { _all: true }
        });

  const approvedCreatorPairs =
    campaignIds.length === 0
      ? []
      : await prisma.missionApplication.groupBy({
          by: ["campaignId", "accountId"],
          where: {
            campaignId: { in: campaignIds },
            status: "APPROVED"
          }
        });

  const creatorApplicantsByCampaignId = new Map<string, number>();
  for (const row of missionApplications) {
    creatorApplicantsByCampaignId.set(row.campaignId, row._count._all);
  }

  const creatorJoinedByCampaignId = new Map<string, number>();
  for (const row of approvedCreatorPairs) {
    creatorJoinedByCampaignId.set(row.campaignId, (creatorJoinedByCampaignId.get(row.campaignId) ?? 0) + 1);
  }

  return {
    items: campaigns.map((campaign) => {
      const rewardsLeft = rewardByCampaignId.get(campaign.id) ?? 0;
      const creatorApplicants = creatorApplicantsByCampaignId.get(campaign.id) ?? 0;
      const approvedVideos = Math.max(0, campaign.ugcVideoApprovedCount ?? 0);
      const creatorJoined = creatorJoinedByCampaignId.get(campaign.id) ?? 0;
      const videoTarget = Math.max(0, campaign.ugcVideoQuota ?? 0);
      const videoProgressPercent = videoTarget > 0 ? Math.min(100, Math.round((approvedVideos / videoTarget) * 100)) : 0;
      const missionSlotsRemaining = videoTarget > 0 ? Math.max(0, videoTarget - approvedVideos) : 0;

      return {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        coverImageUrl: resolveImageUrl(campaign.coverImageUrl),
        brand: campaign.brand.displayName,
        brandLogoUrl: campaign.brand.avatarUrl,
        creator: campaign.creator?.displayName ?? null,
        campaignType: campaign.campaignType,
        category: campaign.category,
        fundedAmount: toVnd(campaign.fundedAmountVnd),
        targetAmount: toVnd(campaign.targetAmountVnd),
        progressPercent:
          campaign.targetAmountVnd > 0
            ? Math.min(100, Math.round((campaign.fundedAmountVnd / campaign.targetAmountVnd) * 100))
            : 0,
        videoProgressPercent,
        videoApproved: approvedVideos,
        videoTarget,
        creatorJoined,
        missionSlotsRemaining,
        isMissionQuotaReached: videoTarget > 0 && missionSlotsRemaining <= 0,
        backers: campaign.backerCount,
        creatorApplicants,
        rewardsLeft,
        deadline: campaign.endsAt
      };
    }),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}
