import { CampaignStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";

function startByPeriod(period: "7d" | "30d" | "month") {
  const now = new Date();
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getAdminReportsSummary(period: "7d" | "30d" | "month") {
  const from = startByPeriod(period);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;

  const [
    totalCampaigns,
    activeCampaigns,
    pendingCampaigns,
    totalBrands,
    activeBrands,
    totalCreators,
    activeCreators,
    pendingBrandReview,
    pendingCreatorReview,
    pendingContentReview,
    pendingProductReview,
    pendingCreatorApplications,
    payoutPending,
    fulfillmentPendingIssues,
    totalRevenue,
    contentReviewedTotal,
    contentApprovedTotal,
    contentRejectedTotal,
    creatorCompletedSubmissions,
    topCampaigns
  ] = await Promise.all([
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
    prisma.campaign.count({ where: { status: { in: [CampaignStatus.DRAFT, CampaignStatus.PAUSED] } } }),
    prisma.brand.count(),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
    prisma.account.count({ where: { role: Role.CREATOR } }),
    prisma.account.count({ where: { role: Role.CREATOR, isActive: true } }),
    prisma.brandApplication.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.creatorApplication.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.missionSubmission.count({ where: { mission: { audience: "CREATOR" }, lifecycleStatus: "PENDING_REVIEW" } }),
    prismaAny.productSubmission.count({ where: { reviewStatus: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } } }),
    prisma.missionSubmission.count({ where: { mission: { audience: "CREATOR" }, lifecycleStatus: { in: ["ACCEPTED", "DOING"] } } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prismaAny.fulfillmentOrder.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { status: "SUCCESS", createdAt: { gte: from } } }),
    prisma.missionSubmission.count({
      where: {
        mission: { audience: "CREATOR" },
        lifecycleStatus: { in: ["APPROVED", "DONE", "REJECTED"] },
        reviewedAt: { gte: from }
      }
    }),
    prisma.missionSubmission.count({
      where: {
        mission: { audience: "CREATOR" },
        lifecycleStatus: { in: ["APPROVED", "DONE"] },
        reviewedAt: { gte: from }
      }
    }),
    prisma.missionSubmission.count({
      where: {
        mission: { audience: "CREATOR" },
        lifecycleStatus: "REJECTED",
        reviewedAt: { gte: from }
      }
    }),
    prisma.missionSubmission.findMany({
      where: {
        mission: { audience: "CREATOR" },
        rewardGrantedAt: { gte: from }
      },
      select: { accountId: true }
    }),
    prisma.contribution.groupBy({
      by: ["campaignId"],
      where: { status: "SUCCESS", createdAt: { gte: from } },
      _sum: { amountVnd: true },
      _count: { _all: true },
      orderBy: { _sum: { amountVnd: "desc" } },
      take: 5
    })
  ]);

  const creatorCountMap = creatorCompletedSubmissions.reduce<Map<string, number>>((map, item) => {
    map.set(item.accountId, (map.get(item.accountId) ?? 0) + 1);
    return map;
  }, new Map());
  const topCreators = Array.from(creatorCountMap.entries())
    .map(([accountId, submissions]) => ({ accountId, submissions }))
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, 5);
  const creatorIds = topCreators.map((i) => i.accountId);
  const campaignIds = topCampaigns.map((i) => i.campaignId);
  const [creatorProfiles, campaignProfiles] = await Promise.all([
    prisma.account.findMany({ where: { id: { in: creatorIds } }, select: { id: true, displayName: true, email: true } }),
    prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, title: true, status: true } })
  ]);

  const creatorMap = new Map(creatorProfiles.map((c) => [c.id, c]));
  const campaignMap = new Map(campaignProfiles.map((c) => [c.id, c]));
  const contentApprovalRate = contentReviewedTotal > 0 ? Number(((contentApprovedTotal / contentReviewedTotal) * 100).toFixed(2)) : 0;

  return {
    period,
    from,
    totals: {
      totalCampaigns,
      activeCampaigns,
      pendingCampaigns,
      totalBrands,
      activeBrands,
      totalCreators,
      activeCreators,
      totalRevenueVnd: totalRevenue._sum.amountVnd ?? 0
    },
    pendingReviewsByType: {
      brand: pendingBrandReview,
      creator: pendingCreatorReview,
      campaign: pendingCampaigns,
      creatorApplications: pendingCreatorApplications,
      content: pendingContentReview,
      productInventory: pendingProductReview
    },
    opsStatus: {
      payoutPending,
      fulfillmentPendingIssues
    },
    contentReview: {
      reviewed: contentReviewedTotal,
      approved: contentApprovedTotal,
      rejected: contentRejectedTotal,
      approvalRate: contentApprovalRate
    },
    topCreatorPerformance: topCreators.map((item) => ({
      accountId: item.accountId,
      name: creatorMap.get(item.accountId)?.displayName ?? "Unknown",
      email: creatorMap.get(item.accountId)?.email ?? "",
      submissions: item.submissions
    })),
    topCampaignPerformance: topCampaigns.map((item) => ({
      campaignId: item.campaignId,
      title: campaignMap.get(item.campaignId)?.title ?? "Unknown",
      status: campaignMap.get(item.campaignId)?.status ?? "DRAFT",
      contributionCount: item._count._all,
      revenueVnd: item._sum.amountVnd ?? 0
    }))
  };
}
