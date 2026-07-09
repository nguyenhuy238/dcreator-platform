import { ApplicationStatus, CampaignStatus, CreatorMissionPublishStatus, CreatorMissionVideoReviewStatus, MissionLifecycleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type BrandAnalyticsQuery = {
  brandIds: string[];
  from?: string;
  to?: string;
  campaignId?: string;
};

export type BrandAnalyticsOverview = {
  generatedAt: string;
  filters: {
    from: string | null;
    to: string | null;
    brandIds: string[];
    campaignId: string | null;
  };
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    draftCampaigns: number;
    cancelledCampaigns: number;
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    totalCreatorMissions: number;
    proofSubmitted: number;
    proofApproved: number;
    proofRejected: number;
    pendingReviews: number;
  };
  funnel: {
    applications: number;
    approvedApplications: number;
    assignedMissions: number;
    acceptedMissions: number;
    proofSubmitted: number;
    proofApproved: number;
    proofRejected: number;
    rewardCredited: number;
    applicationApprovalRate: number;
    proofApprovalRate: number;
    missionCompletionRate: number;
  };
  pendingReview: {
    pendingApplications: number;
    pendingProofs: number;
    pendingVideoReviews: number;
    pendingFinalReviews: number;
    pendingPayouts: number;
  };
  payments: {
    commissionCreditedVnd: number;
    payoutRequestedVnd: number;
    payoutPaidVnd: number;
    payoutPendingVnd: number;
  };
  campaignPerformance: Array<{
    campaignId: string;
    title: string;
    status: string;
    totalCreatorMissions: number;
    approvedApplications: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
  creatorPerformance: Array<{
    creatorId: string;
    accountId: string | null;
    displayName: string;
    avatarUrl?: string | null;
    campaignCount: number;
    approvedMissions: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
};

export type BrandAnalyticsFilterOptions = {
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    brandId: string;
  }>;
};

type DateRange = {
  from: Date | null;
  to: Date | null;
};

function parseDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeDateRange(params?: Pick<BrandAnalyticsQuery, "from" | "to">): DateRange {
  return {
    from: parseDate(params?.from),
    to: parseDate(params?.to)
  };
}

function dateFilter(range: DateRange) {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {})
  };
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function compactFilter(value?: string | null) {
  return value?.trim() || null;
}

function isProofSubmitted(item: {
  submissionLifecycleStatus: MissionLifecycleStatus;
  submissionFinalSubmittedAt: Date | null;
  videoReviewStatus: CreatorMissionVideoReviewStatus;
  publishStatus: CreatorMissionPublishStatus;
}) {
  return Boolean(
    item.submissionFinalSubmittedAt ||
      ["SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE", "REJECTED"].includes(item.submissionLifecycleStatus) ||
      item.videoReviewStatus !== CreatorMissionVideoReviewStatus.NOT_SUBMITTED ||
      item.publishStatus !== CreatorMissionPublishStatus.NOT_SUBMITTED
  );
}

function isProofApproved(item: {
  submissionLifecycleStatus: MissionLifecycleStatus;
  videoReviewStatus: CreatorMissionVideoReviewStatus;
  publishStatus: CreatorMissionPublishStatus;
}) {
  return (
    item.submissionLifecycleStatus === MissionLifecycleStatus.APPROVED ||
    item.submissionLifecycleStatus === MissionLifecycleStatus.DONE ||
    item.videoReviewStatus === CreatorMissionVideoReviewStatus.APPROVED ||
    item.publishStatus === CreatorMissionPublishStatus.APPROVED
  );
}

function isProofRejected(item: {
  submissionLifecycleStatus: MissionLifecycleStatus;
  videoReviewStatus: CreatorMissionVideoReviewStatus;
  publishStatus: CreatorMissionPublishStatus;
}) {
  return (
    item.submissionLifecycleStatus === MissionLifecycleStatus.REJECTED ||
    item.videoReviewStatus === CreatorMissionVideoReviewStatus.REJECTED ||
    item.publishStatus === CreatorMissionPublishStatus.REJECTED
  );
}

function missionCommission(item: { rewardCreditedAt: Date | null; mission: { rewardCommissionVnd: number } | null }) {
  return item.rewardCreditedAt ? item.mission?.rewardCommissionVnd ?? 0 : 0;
}

async function getBrandScope(brandIds: string[]) {
  const compactBrandIds = [...new Set(brandIds.map((id) => id.trim()).filter(Boolean))];
  if (compactBrandIds.length === 0) throw new AppError("Brand scope is required", 403, "BRAND_SCOPE_REQUIRED");

  const brands = await prisma.brand.findMany({
    where: { id: { in: compactBrandIds } },
    select: { id: true, ownerAccountId: true }
  });

  if (brands.length !== compactBrandIds.length) throw new AppError("Brand scope is invalid", 403, "BRAND_FORBIDDEN");

  const ownerAccountIds = brands.map((brand) => brand.ownerAccountId);
  const linkedCampaigns = await prisma.brandCampaignRequest.findMany({
    where: { brandId: { in: compactBrandIds }, createdCampaignId: { not: null } },
    select: { brandId: true, createdCampaignId: true }
  });
  const legacyCampaigns = await prisma.campaign.findMany({
    where: { brandId: { in: ownerAccountIds } },
    select: { id: true, brandId: true }
  });
  const ownerToBrandId = new Map(brands.map((brand) => [brand.ownerAccountId, brand.id]));
  const campaignBrandMap = new Map<string, string>();

  for (const item of linkedCampaigns) {
    if (item.createdCampaignId) campaignBrandMap.set(item.createdCampaignId, item.brandId);
  }
  for (const item of legacyCampaigns) {
    const brandId = ownerToBrandId.get(item.brandId);
    if (brandId && !campaignBrandMap.has(item.id)) campaignBrandMap.set(item.id, brandId);
  }

  return {
    brandIds: compactBrandIds,
    campaignIds: [...campaignBrandMap.keys()],
    campaignBrandMap
  };
}

async function resolveCampaignScope(params: BrandAnalyticsQuery) {
  const scope = await getBrandScope(params.brandIds);
  const campaignId = compactFilter(params.campaignId);

  if (campaignId && !scope.campaignBrandMap.has(campaignId)) {
    throw new AppError("Campaign is outside brand scope", 403, "BRAND_CAMPAIGN_FORBIDDEN");
  }

  return {
    ...scope,
    campaignIds: campaignId ? [campaignId] : scope.campaignIds,
    campaignId
  };
}

export async function getBrandAnalyticsFilterOptions(params: BrandAnalyticsQuery): Promise<BrandAnalyticsFilterOptions> {
  const range = normalizeDateRange(params);
  const createdAt = dateFilter(range);
  const scope = await resolveCampaignScope({ ...params, campaignId: undefined });

  if (scope.campaignIds.length === 0) return { campaigns: [] };

  const campaigns = await prisma.campaign.findMany({
    where: {
      id: { in: scope.campaignIds },
      ...(createdAt ? { createdAt } : {})
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
    select: { id: true, title: true, status: true }
  });

  return {
    campaigns: campaigns
      .map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        brandId: scope.campaignBrandMap.get(campaign.id) ?? scope.brandIds[0]!
      }))
      .sort((a, b) => {
        if (a.status === CampaignStatus.ACTIVE && b.status !== CampaignStatus.ACTIVE) return -1;
        if (a.status !== CampaignStatus.ACTIVE && b.status === CampaignStatus.ACTIVE) return 1;
        return a.title.localeCompare(b.title, "vi");
      })
  };
}

export async function getBrandAnalyticsOverview(params: BrandAnalyticsQuery): Promise<BrandAnalyticsOverview> {
  const range = normalizeDateRange(params);
  const createdAt = dateFilter(range);
  const scope = await resolveCampaignScope(params);

  const campaigns = scope.campaignIds.length
    ? await prisma.campaign.findMany({
        where: {
          id: { in: scope.campaignIds },
          ...(createdAt ? { createdAt } : {})
        },
        select: { id: true, title: true, status: true }
      })
    : [];
  const campaignIds = campaigns.map((campaign) => campaign.id);

  const [creatorMissions, missionApplications, pendingProofsFromMissionSubmissions] = campaignIds.length
    ? await Promise.all([
        prisma.creatorMission.findMany({
          where: {
            campaignId: { in: campaignIds },
            ...(createdAt ? { appliedAt: createdAt } : {})
          },
          select: {
            id: true,
            campaignId: true,
            accountId: true,
            applicationStatus: true,
            status: true,
            submissionLifecycleStatus: true,
            submissionFinalSubmittedAt: true,
            videoReviewStatus: true,
            publishStatus: true,
            rewardCreditedAt: true,
            mission: { select: { rewardCommissionVnd: true } },
            account: { select: { id: true, displayName: true, email: true, avatarUrl: true } }
          }
        }),
        prisma.missionApplication.findMany({
          where: {
            campaignId: { in: campaignIds },
            ...(createdAt ? { createdAt } : {})
          },
          select: { id: true, campaignId: true, accountId: true, status: true }
        }),
        prisma.missionSubmission.count({
          where: {
            lifecycleStatus: MissionLifecycleStatus.PENDING_REVIEW,
            mission: { campaignId: { in: campaignIds } },
            ...(createdAt ? { createdAt } : {})
          }
        })
      ])
    : [[], [], 0] as const;

  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const approvedApplicationsFromCreatorMissions = creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED).length;
  const rejectedApplicationsFromCreatorMissions = creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.REJECTED).length;
  const pendingApplicationsFromCreatorMissions = creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.PENDING_REVIEW).length;
  const approvedApplicationsFromMissionApplications = missionApplications.filter((item) => item.status === ApplicationStatus.APPROVED).length;
  const rejectedApplicationsFromMissionApplications = missionApplications.filter((item) => item.status === ApplicationStatus.REJECTED).length;
  const pendingApplicationsFromMissionApplications = missionApplications.filter((item) => item.status === ApplicationStatus.PENDING_REVIEW).length;

  const applications = Math.max(creatorMissions.length, missionApplications.length);
  const approvedApplications = Math.max(approvedApplicationsFromCreatorMissions, approvedApplicationsFromMissionApplications);
  const rejectedApplications = Math.max(rejectedApplicationsFromCreatorMissions, rejectedApplicationsFromMissionApplications);
  const pendingApplications = Math.max(pendingApplicationsFromCreatorMissions, pendingApplicationsFromMissionApplications);
  const assignedMissions = creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED || item.status === "IN_PROGRESS" || item.status === "COMPLETED").length;
  const acceptedMissions = creatorMissions.filter((item) =>
    item.status === "IN_PROGRESS" || item.status === "COMPLETED" || ["DOING", "SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE"].includes(item.submissionLifecycleStatus)
  ).length;
  const proofSubmitted = creatorMissions.filter(isProofSubmitted).length;
  const proofApproved = creatorMissions.filter(isProofApproved).length;
  const proofRejected = creatorMissions.filter(isProofRejected).length;
  const rewardCredited = creatorMissions.filter((item) => Boolean(item.rewardCreditedAt)).length;

  const creatorStats = new Map<
    string,
    {
      creatorId: string;
      accountId: string | null;
      displayName: string;
      avatarUrl: string | null;
      campaignIds: Set<string>;
      approvedMissions: number;
      submittedProofs: number;
      approvedProofs: number;
      rejectedProofs: number;
      commissionCreditedVnd: number;
    }
  >();
  const campaignStats = new Map<
    string,
    {
      campaignId: string;
      title: string;
      status: string;
      totalCreatorMissions: number;
      approvedApplications: number;
      submittedProofs: number;
      approvedProofs: number;
      rejectedProofs: number;
      commissionCreditedVnd: number;
    }
  >();

  for (const campaign of campaigns) {
    campaignStats.set(campaign.id, {
      campaignId: campaign.id,
      title: campaign.title,
      status: campaign.status,
      totalCreatorMissions: 0,
      approvedApplications: 0,
      submittedProofs: 0,
      approvedProofs: 0,
      rejectedProofs: 0,
      commissionCreditedVnd: 0
    });
  }

  for (const item of creatorMissions) {
    const campaign = campaignById.get(item.campaignId);
    if (!campaign) continue;

    const creator = creatorStats.get(item.accountId) ?? {
      creatorId: item.accountId,
      accountId: item.accountId,
      displayName: item.account.displayName || item.account.email || `Creator #${item.accountId.slice(-6)}`,
      avatarUrl: item.account.avatarUrl,
      campaignIds: new Set<string>(),
      approvedMissions: 0,
      submittedProofs: 0,
      approvedProofs: 0,
      rejectedProofs: 0,
      commissionCreditedVnd: 0
    };
    const campaignStat = campaignStats.get(item.campaignId);
    if (!campaignStat) continue;

    const submitted = isProofSubmitted(item);
    const approved = isProofApproved(item);
    const rejected = isProofRejected(item);
    const commission = missionCommission(item);

    creator.campaignIds.add(item.campaignId);
    campaignStat.totalCreatorMissions += 1;

    if (item.applicationStatus === ApplicationStatus.APPROVED) {
      creator.approvedMissions += 1;
      campaignStat.approvedApplications += 1;
    }
    if (submitted) {
      creator.submittedProofs += 1;
      campaignStat.submittedProofs += 1;
    }
    if (approved) {
      creator.approvedProofs += 1;
      campaignStat.approvedProofs += 1;
    }
    if (rejected) {
      creator.rejectedProofs += 1;
      campaignStat.rejectedProofs += 1;
    }

    creator.commissionCreditedVnd += commission;
    campaignStat.commissionCreditedVnd += commission;
    creatorStats.set(item.accountId, creator);
    campaignStats.set(item.campaignId, campaignStat);
  }

  const campaignPerformance = Array.from(campaignStats.values())
    .map((item) => ({
      ...item,
      completionRate: pct(item.approvedProofs, item.submittedProofs)
    }))
    .sort((a, b) => b.approvedProofs - a.approvedProofs || b.totalCreatorMissions - a.totalCreatorMissions || b.commissionCreditedVnd - a.commissionCreditedVnd);

  const creatorPerformance = Array.from(creatorStats.values())
    .map((item) => ({
      creatorId: item.creatorId,
      accountId: item.accountId,
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
      campaignCount: item.campaignIds.size,
      approvedMissions: item.approvedMissions,
      submittedProofs: item.submittedProofs,
      approvedProofs: item.approvedProofs,
      rejectedProofs: item.rejectedProofs,
      completionRate: pct(item.approvedProofs, item.submittedProofs),
      commissionCreditedVnd: item.commissionCreditedVnd
    }))
    .sort((a, b) => b.approvedProofs - a.approvedProofs || b.approvedMissions - a.approvedMissions || b.commissionCreditedVnd - a.commissionCreditedVnd)
    .slice(0, 20);

  const commissionCreditedVnd = creatorMissions.reduce((sum, item) => sum + missionCommission(item), 0);
  const pendingProofs = creatorMissions.filter((item) => item.submissionLifecycleStatus === MissionLifecycleStatus.PENDING_REVIEW).length + pendingProofsFromMissionSubmissions;
  const pendingVideoReviews = creatorMissions.filter((item) => item.videoReviewStatus === CreatorMissionVideoReviewStatus.PENDING).length;
  const pendingFinalReviews = creatorMissions.filter((item) => item.publishStatus === CreatorMissionPublishStatus.PENDING).length;

  // TODO(analytics): Brand payment analytics needs normalized mission-to-payout mapping.
  // Keep this conservative until payment intent/reference mapping is standardized.
  const payoutRequestedVnd = 0;
  const payoutPaidVnd = 0;
  const payoutPendingVnd = 0;
  const pendingPayouts = 0;

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
      brandIds: scope.brandIds,
      campaignId: scope.campaignId
    },
    overview: {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((item) => item.status === CampaignStatus.ACTIVE).length,
      completedCampaigns: campaigns.filter((item) => item.status === CampaignStatus.COMPLETED).length,
      draftCampaigns: campaigns.filter((item) => item.status === CampaignStatus.DRAFT).length,
      cancelledCampaigns: campaigns.filter((item) => item.status === CampaignStatus.CANCELLED || item.status === CampaignStatus.ARCHIVED).length,
      totalApplications: applications,
      approvedApplications,
      rejectedApplications,
      pendingApplications,
      totalCreatorMissions: creatorMissions.length,
      proofSubmitted,
      proofApproved,
      proofRejected,
      pendingReviews: pendingApplications + pendingProofs + pendingVideoReviews + pendingFinalReviews + pendingPayouts
    },
    funnel: {
      applications,
      approvedApplications,
      assignedMissions,
      acceptedMissions,
      proofSubmitted,
      proofApproved,
      proofRejected,
      rewardCredited,
      applicationApprovalRate: pct(approvedApplications, applications),
      proofApprovalRate: pct(proofApproved, proofSubmitted),
      missionCompletionRate: pct(rewardCredited || proofApproved, assignedMissions)
    },
    pendingReview: {
      pendingApplications,
      pendingProofs,
      pendingVideoReviews,
      pendingFinalReviews,
      pendingPayouts
    },
    payments: {
      commissionCreditedVnd,
      payoutRequestedVnd,
      payoutPaidVnd,
      payoutPendingVnd
    },
    campaignPerformance,
    creatorPerformance
  };
}
