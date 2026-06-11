import { AnalyticsEventName } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AnalyticsEventInput } from "@/lib/validators/analytics";

const BLOCKED_METADATA_KEYS = [/password/i, /token/i, /secret/i, /cookie/i, /authorization/i, /card/i, /cvv/i, /otp/i];

function sanitizeMetadata(metadata: AnalyticsEventInput["metadata"]) {
  if (!metadata) return null;

  const entries = Object.entries(metadata)
    .filter(([key]) => !BLOCKED_METADATA_KEYS.some((pattern) => pattern.test(key)))
    .slice(0, 30)
    .map(([key, value]) => {
      if (typeof value === "string") return [key, value.slice(0, 300)] as const;
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [key, value] as const;
      if (Array.isArray(value)) return [key, value.slice(0, 20)] as const;
      return [key, String(value).slice(0, 300)] as const;
    });

  return Object.fromEntries(entries);
}

export async function trackAnalyticsEvent(input: AnalyticsEventInput & { userId?: string | null }) {
  return prisma.analyticsEvent.create({
    data: {
      eventName: input.eventName,
      userId: input.userId ?? null,
      sessionId: input.sessionId,
      campaignId: input.campaignId ?? null,
      brandId: input.brandId ?? null,
      creatorId: input.creatorId ?? null,
      metadata: sanitizeMetadata(input.metadata)
    }
  });
}

function ratio(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export async function getBrandKpis(brandId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { brandId },
    select: { id: true }
  });
  const campaignIds = campaigns.map((campaign) => campaign.id);

  const [views, ctaClicks, applications, approvedCreators, proofSubmitted, proofApproved, totalOrders, totalRevenue, topCreatorRaw] = await Promise.all([
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.campaign_view } }),
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.campaign_cta_click } }),
    prisma.missionApplication.count({ where: { campaignId: { in: campaignIds } } }),
    prisma.creatorMission.count({ where: { campaignId: { in: campaignIds }, applicationStatus: "APPROVED" } }),
    prisma.creatorMission.count({
      where: {
        campaignId: { in: campaignIds },
        OR: [{ videoReviewStatus: { not: "NOT_SUBMITTED" } }, { publishStatus: { not: "NOT_SUBMITTED" } }, { submissionFinalSubmittedAt: { not: null } }]
      }
    }),
    prisma.creatorMission.count({
      where: {
        campaignId: { in: campaignIds },
        OR: [{ videoReviewStatus: "APPROVED" }, { publishStatus: "APPROVED" }, { submissionLifecycleStatus: { in: ["APPROVED", "DONE"] } }]
      }
    }),
    prisma.paymentOrder.count({ where: { campaignId: { in: campaignIds }, status: "SUCCESS" } }),
    prisma.paymentOrder.aggregate({ _sum: { amountVnd: true }, where: { campaignId: { in: campaignIds }, status: "SUCCESS" } }),
    prisma.creatorMission.groupBy({
      by: ["accountId"],
      where: { campaignId: { in: campaignIds }, applicationStatus: "APPROVED" },
      _count: { _all: true },
      orderBy: { _count: { accountId: "desc" } },
      take: 1
    })
  ]);

  const approvedMissions = await prisma.creatorMission.findMany({
    where: {
      campaignId: { in: campaignIds },
      OR: [{ videoReviewStatus: "APPROVED" }, { publishStatus: "APPROVED" }, { submissionLifecycleStatus: { in: ["APPROVED", "DONE"] } }]
    },
    select: { mission: { select: { rewardCommissionVnd: true } } }
  });

  const topCreatorId = topCreatorRaw[0]?.accountId ?? null;
  const topCreator = topCreatorId
    ? await prisma.account.findUnique({ where: { id: topCreatorId }, select: { id: true, displayName: true } })
    : null;

  const commissionGeneratedVnd = approvedMissions.reduce((sum, item) => sum + (item.mission?.rewardCommissionVnd ?? 0), 0);

  return {
    totalCampaigns: campaignIds.length,
    activeCampaigns: await prisma.campaign.count({ where: { id: { in: campaignIds }, status: "ACTIVE" } }),
    campaignViews: views,
    ctaRate: ratio(ctaClicks, views),
    creatorApplicationCount: applications,
    approvedCreatorCount: approvedCreators,
    proofSubmitted,
    proofApproved,
    proofApprovalRate: ratio(proofApproved, proofSubmitted),
    totalOrders,
    totalRevenueVnd: totalRevenue._sum.amountVnd ?? 0,
    totalCommissionPaidVnd: commissionGeneratedVnd,
    topCreator,
    conversionRatePercent: ratio(totalOrders, views)
  };
}

export async function getCreatorKpis(creatorId: string) {
  const [jobAccepted, jobsDoing, jobsCompleted, proofSubmitted, proofApproved, proofRejected, commissionEarned, commissionPaid] = await Promise.all([
    prisma.creatorMission.count({ where: { accountId: creatorId, applicationStatus: "APPROVED" } }),
    prisma.creatorMission.count({ where: { accountId: creatorId, applicationStatus: "APPROVED", status: "IN_PROGRESS" } }),
    prisma.creatorMission.count({ where: { accountId: creatorId, status: "COMPLETED" } }),
    prisma.creatorMission.count({
      where: {
        accountId: creatorId,
        OR: [{ videoReviewStatus: { not: "NOT_SUBMITTED" } }, { publishStatus: { not: "NOT_SUBMITTED" } }, { submissionFinalSubmittedAt: { not: null } }]
      }
    }),
    prisma.creatorMission.count({
      where: {
        accountId: creatorId,
        OR: [{ videoReviewStatus: "APPROVED" }, { publishStatus: "APPROVED" }, { submissionLifecycleStatus: { in: ["APPROVED", "DONE"] } }]
      }
    }),
    prisma.creatorMission.count({
      where: {
        accountId: creatorId,
        OR: [{ videoReviewStatus: "REJECTED" }, { publishStatus: "REJECTED" }, { submissionLifecycleStatus: "REJECTED" }]
      }
    }),
    prisma.walletTransaction.aggregate({
      _sum: { cashDeltaVnd: true },
      where: { accountId: creatorId, type: "COMMISSION_CREDIT" }
    }),
    prisma.walletTransaction.aggregate({
      _sum: { cashDeltaVnd: true },
      where: { accountId: creatorId, type: "COMMISSION_PAYOUT" }
    })
  ]);

  const creatorMissions = await prisma.creatorMission.findMany({
    where: { accountId: creatorId },
    select: {
      campaignId: true,
      campaign: { select: { id: true, title: true } },
      mission: { select: { rewardCommissionVnd: true } }
    }
  });

  const campaignIds = [...new Set(creatorMissions.map((item) => item.campaignId))];
  const revenueGenerated = await prisma.paymentOrder.aggregate({
    _sum: { amountVnd: true },
    where: { campaignId: { in: campaignIds }, status: "SUCCESS" }
  });

  const campaignScores = new Map<string, { id: string; title: string; commissionVnd: number }>();
  for (const item of creatorMissions) {
    const current = campaignScores.get(item.campaignId) ?? { id: item.campaignId, title: item.campaign.title, commissionVnd: 0 };
    current.commissionVnd += item.mission?.rewardCommissionVnd ?? 0;
    campaignScores.set(item.campaignId, current);
  }
  const topCampaign = [...campaignScores.values()].sort((a, b) => b.commissionVnd - a.commissionVnd)[0] ?? null;

  return {
    jobAccepted,
    jobsDoing,
    jobsCompleted,
    proofSubmitted,
    proofApproved,
    proofRejected,
    revenueGeneratedVnd: revenueGenerated._sum.amountVnd ?? 0,
    commissionEarnedVnd: commissionEarned._sum.cashDeltaVnd ?? 0,
    commissionPendingVnd: Math.max(0, (commissionEarned._sum.cashDeltaVnd ?? 0) - Math.abs(commissionPaid._sum.cashDeltaVnd ?? 0)),
    topCampaign
  };
}

export async function getAdminKpis() {
  const [
    totalUsers,
    totalCreators,
    totalBrands,
    newUsers7d,
    newCreators7d,
    newBrands7d,
    activeCampaigns,
    pendingCampaigns,
    pendingReviews,
    totalOrders,
    totalRevenue,
    totalCommission,
    failedPayment,
    fraudAlerts
  ] = await Promise.all([
    prisma.account.count(),
    prisma.creatorProfile.count(),
    prisma.brand.count(),
    prisma.account.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.creatorProfile.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.brand.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.brandCampaignRequest.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.creatorMission.count({
      where: {
        OR: [{ videoReviewStatus: "PENDING" }, { publishStatus: "PENDING" }, { submissionLifecycleStatus: "PENDING_REVIEW" }]
      }
    }),
    prisma.paymentOrder.count({ where: { status: "SUCCESS" } }),
    prisma.paymentOrder.aggregate({ _sum: { amountVnd: true }, where: { status: "SUCCESS" } }),
    prisma.walletTransaction.aggregate({ _sum: { cashDeltaVnd: true }, where: { type: "COMMISSION_CREDIT" } }),
    prisma.analyticsEvent.count({ where: { eventName: AnalyticsEventName.payment_failed } }),
    prisma.riskFlag.count()
  ]);

  return {
    totalUsers,
    totalCreators,
    totalBrands,
    newUsers7d,
    newCreators7d,
    newBrands7d,
    activeCampaigns,
    pendingCampaigns,
    pendingReviews,
    totalOrders,
    totalRevenueVnd: totalRevenue._sum.amountVnd ?? 0,
    totalCommissionVnd: totalCommission._sum.cashDeltaVnd ?? 0,
    failedPayment,
    fraudAlerts,
    todayActions: pendingCampaigns + pendingReviews + failedPayment + fraudAlerts
  };
}
