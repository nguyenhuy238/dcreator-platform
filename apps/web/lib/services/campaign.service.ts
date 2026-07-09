import { ApplicationStatus, CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getCampaignBrandDisplay, getCreatorDisplay } from "../display-identity";
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
      { creator: { displayName: { contains: input.search, mode: "insensitive" } } },
      { sourceBrandRequests: { some: { brand: { name: { contains: input.search, mode: "insensitive" } } } } },
      { creator: { creatorProfile: { displayName: { contains: input.search, mode: "insensitive" } } } }
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
        }
      }
    })
  ]);

  const brandOwnerAccountIds = [...new Set(campaigns.map((campaign) => campaign.brand.id))];
  const brandProfiles = brandOwnerAccountIds.length
    ? await prisma.brand.findMany({
        where: { ownerAccountId: { in: brandOwnerAccountIds } },
        orderBy: { updatedAt: "desc" },
        select: { ownerAccountId: true, name: true, legalName: true, logoUrl: true }
      })
    : [];
  const brandProfileByOwnerAccountId = new Map<string, (typeof brandProfiles)[number]>();
  for (const brand of brandProfiles) {
    if (!brandProfileByOwnerAccountId.has(brand.ownerAccountId)) {
      brandProfileByOwnerAccountId.set(brand.ownerAccountId, brand);
    }
  }

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

  const registeredCreatorPairs =
    campaignIds.length === 0
      ? []
      : await prisma.creatorMission.groupBy({
          by: ["campaignId", "accountId"],
          where: {
            campaignId: { in: campaignIds },
            applicationStatus: { in: [ApplicationStatus.PENDING_REVIEW, ApplicationStatus.APPROVED] }
          }
        });
  const approvedCreatorPairs =
    campaignIds.length === 0
      ? []
      : await prisma.creatorMission.groupBy({
          by: ["campaignId", "accountId"],
          where: {
            campaignId: { in: campaignIds },
            applicationStatus: ApplicationStatus.APPROVED
          }
        });

  const registeredCreatorCountByCampaignId = new Map<string, number>();
  for (const row of registeredCreatorPairs) {
    registeredCreatorCountByCampaignId.set(
      row.campaignId,
      (registeredCreatorCountByCampaignId.get(row.campaignId) ?? 0) + 1
    );
  }

  const creatorJoinedByCampaignId = new Map<string, number>();
  for (const row of approvedCreatorPairs) {
    creatorJoinedByCampaignId.set(row.campaignId, (creatorJoinedByCampaignId.get(row.campaignId) ?? 0) + 1);
  }

  return {
    items: campaigns.map((campaign) => {
      const rewardsLeft = rewardByCampaignId.get(campaign.id) ?? 0;
      const registeredCreatorCount = registeredCreatorCountByCampaignId.get(campaign.id) ?? 0;
      const approvedVideos = Math.max(0, campaign.ugcVideoApprovedCount ?? 0);
      const creatorJoined = creatorJoinedByCampaignId.get(campaign.id) ?? 0;
      const videoTarget = Math.max(0, campaign.ugcVideoQuota ?? 0);
      const videoProgressPercent = videoTarget > 0 ? Math.min(100, Math.round((approvedVideos / videoTarget) * 100)) : 0;
      const missionSlotsRemaining = videoTarget > 0 ? Math.max(0, videoTarget - approvedVideos) : 0;

      const sourceBrand = campaign.sourceBrandRequests[0]?.brand;
      const brandDisplay = getCampaignBrandDisplay({
        brand: sourceBrand ?? brandProfileByOwnerAccountId.get(campaign.brand.id) ?? null
      });
      const creatorDisplay = campaign.creator
        ? getCreatorDisplay({
            displayName: campaign.creator.creatorProfile?.displayName,
            avatarUrl: campaign.creator.creatorProfile?.avatarUrl,
            account: campaign.creator
          })
        : null;

      return {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        coverImageUrl: resolveImageUrl(campaign.coverImageUrl),
        brand: brandDisplay.name,
        brandLogoUrl: brandDisplay.logo,
        creator: creatorDisplay?.name ?? null,
        campaignType: campaign.campaignType,
        featuredType: "VIDEO_SEEDING" as const,
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
        registeredCreatorCount,
        creatorApplicants: registeredCreatorCount,
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
