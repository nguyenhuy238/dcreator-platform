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
  const [views, ctaClicks, contributionSuccess, totalFunded, rewardSelected, voucherIssued, voucherRedeemed, topCreatorRaw] = await Promise.all([
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.campaign_view } }),
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.campaign_cta_click } }),
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.campaign_contribution_success } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { campaign: { brandId }, status: "SUCCESS" } }),
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.reward_selected } }),
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.voucher_issued } }),
    prisma.analyticsEvent.count({ where: { brandId, eventName: AnalyticsEventName.voucher_redeemed } }),
    prisma.analyticsEvent.groupBy({
      by: ["creatorId"],
      where: { brandId, eventName: AnalyticsEventName.campaign_contribution_success, creatorId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { creatorId: "desc" } },
      take: 1
    })
  ]);

  const topCreatorId = topCreatorRaw[0]?.creatorId ?? null;
  const topCreator = topCreatorId
    ? await prisma.account.findUnique({ where: { id: topCreatorId }, select: { id: true, displayName: true } })
    : null;

  return {
    campaignViews: views,
    ctaRate: ratio(ctaClicks, views),
    contributionConversion: ratio(contributionSuccess, views),
    totalFundedVnd: totalFunded._sum.amountVnd ?? 0,
    topCreator,
    rewardClaimRate: ratio(voucherIssued, rewardSelected),
    voucherRedemptionRate: ratio(voucherRedeemed, voucherIssued)
  };
}

export async function getCreatorKpis(creatorId: string) {
  const [jobAccepted, proofSubmitted, proofApproved, commissionEarned, contributionDriven] = await Promise.all([
    prisma.analyticsEvent.count({ where: { creatorId, eventName: AnalyticsEventName.mission_accept } }),
    prisma.analyticsEvent.count({ where: { creatorId, eventName: AnalyticsEventName.mission_submit } }),
    prisma.analyticsEvent.count({ where: { creatorId, eventName: AnalyticsEventName.proof_approved } }),
    prisma.walletTransaction.aggregate({
      _sum: { cashDeltaVnd: true },
      where: { accountId: creatorId, type: "COMMISSION_CREDIT" }
    }),
    prisma.analyticsEvent.count({ where: { creatorId, eventName: AnalyticsEventName.campaign_contribution_success } })
  ]);

  const contributionDrivenVnd = await prisma.analyticsEvent.findMany({
    where: { creatorId, eventName: AnalyticsEventName.campaign_contribution_success },
    select: { metadata: true }
  });

  const drivenAmount = contributionDrivenVnd.reduce((sum, item) => {
    if (!item.metadata || typeof item.metadata !== "object") return sum;
    const amount = (item.metadata as Record<string, unknown>).amountVnd;
    return typeof amount === "number" ? sum + amount : sum;
  }, 0);

  return {
    jobAccepted,
    proofSubmitted,
    proofApproved,
    commissionEarnedVnd: commissionEarned._sum.cashDeltaVnd ?? 0,
    contributionDriven,
    contributionDrivenVnd: drivenAmount,
    salesConversions: contributionDriven
  };
}

export async function getAdminKpis() {
  const [activeCampaigns, totalContribution, failedPayment, fraudAlerts, pendingReviews] = await Promise.all([
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { status: "SUCCESS" } }),
    prisma.analyticsEvent.count({ where: { eventName: AnalyticsEventName.payment_failed } }),
    prisma.riskFlag.count(),
    prisma.missionSubmission.count({ where: { lifecycleStatus: "PENDING_REVIEW" } })
  ]);

  return {
    activeCampaigns,
    totalContributionVnd: totalContribution._sum.amountVnd ?? 0,
    failedPayment,
    fraudAlerts,
    pendingReviews
  };
}
