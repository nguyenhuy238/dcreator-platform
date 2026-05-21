import { CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";

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
    where.rewards = { some: { isActive: true, stock: { gt: 0 } } };
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
    orderBy.push({ contributions: { _count: "desc" } }, { updatedAt: "desc" });
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
        endsAt: true,
        createdAt: true,
        brand: { select: { displayName: true } },
        creator: { select: { displayName: true } },
        contributions: { select: { supporterId: true } },
        rewards: { select: { stock: true, isActive: true } }
      }
    })
  ]);

  return {
    items: campaigns.map((campaign) => {
      const distinctBackers = new Set(campaign.contributions.map((c) => c.supporterId)).size;
      const rewardsLeft = campaign.rewards
        .filter((reward) => reward.isActive)
        .reduce((sum, reward) => sum + reward.stock, 0);

      return {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        coverImageUrl: campaign.coverImageUrl,
        brand: campaign.brand.displayName,
        creator: campaign.creator?.displayName ?? null,
        campaignType: campaign.campaignType,
        category: campaign.category,
        fundedAmount: toVnd(campaign.fundedAmountVnd),
        targetAmount: toVnd(campaign.targetAmountVnd),
        progressPercent:
          campaign.targetAmountVnd > 0
            ? Math.min(100, Math.round((campaign.fundedAmountVnd / campaign.targetAmountVnd) * 100))
            : 0,
        backers: distinctBackers,
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
