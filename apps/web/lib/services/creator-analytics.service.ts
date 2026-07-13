import { ApplicationStatus, CampaignStatus, CreatorMissionPublishStatus, CreatorMissionStatus, CreatorMissionVideoReviewStatus, MissionLifecycleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getAnalyticsPaymentSummary } from "@/lib/services/analytics-payment-mapping.service";

export type CreatorAnalyticsQuery = {
  accountId: string;
  from?: string;
  to?: string;
  campaignId?: string;
};

export type CreatorAnalyticsOverview = {
  generatedAt: string;
  filters: {
    from: string | null;
    to: string | null;
    campaignId: string | null;
  };
  overview: {
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    totalMissions: number;
    acceptedMissions: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    pendingReviews: number;
    completedCampaigns: number;
    activeCampaigns: number;
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
  earnings: {
    commissionCreditedVnd: number;
    payoutRequestedVnd: number;
    payoutPaidVnd: number;
    payoutPendingVnd: number;
    unknownPaymentTransactionsVnd?: number;
  };
  pendingActions: {
    pendingApplications: number;
    missionsToAccept: number;
    proofsToSubmit: number;
    pendingProofReview: number;
    rejectedProofsToRevise: number;
    pendingPayouts: number;
  };
  campaignPerformance: Array<{
    campaignId: string;
    title: string;
    status: string;
    brandName: string | null;
    applicationStatus: string | null;
    missionStatus: string | null;
    proofStatus: string | null;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    campaignId?: string | null;
    createdAt: string;
  }>;
};

export type CreatorAnalyticsFilterOptions = {
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    brandName: string | null;
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

function normalizeDateRange(params?: Pick<CreatorAnalyticsQuery, "from" | "to">): DateRange {
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

function resolveBrandName(campaign: {
  brand: {
    displayName: string;
    ownedBrands: Array<{ name: string; legalName: string | null }>;
  };
}) {
  const ownedBrand = campaign.brand.ownedBrands[0];
  return ownedBrand?.legalName ?? ownedBrand?.name ?? campaign.brand.displayName;
}

const campaignSelect = {
  id: true,
  title: true,
  status: true,
  brand: {
    select: {
      displayName: true,
      ownedBrands: {
        select: { name: true, legalName: true },
        orderBy: { updatedAt: "desc" as const },
        take: 1
      }
    }
  }
};

async function assertCreatorCampaignScope(accountId: string, campaignId: string) {
  const [creatorMission, missionApplication, missionSubmission] = await Promise.all([
    prisma.creatorMission.findFirst({ where: { accountId, campaignId }, select: { id: true } }),
    prisma.missionApplication.findFirst({ where: { accountId, campaignId }, select: { id: true } }),
    prisma.missionSubmission.findFirst({ where: { accountId, mission: { campaignId } }, select: { id: true } })
  ]);
  if (!creatorMission && !missionApplication && !missionSubmission) {
    throw new AppError("Campaign is outside creator scope", 403, "CREATOR_CAMPAIGN_FORBIDDEN");
  }
}

export async function getCreatorAnalyticsFilterOptions(params: CreatorAnalyticsQuery): Promise<CreatorAnalyticsFilterOptions> {
  const range = normalizeDateRange(params);
  const createdAt = dateFilter(range);

  const [creatorMissions, missionApplications, missionSubmissions] = await Promise.all([
    prisma.creatorMission.findMany({
      where: { accountId: params.accountId, ...(createdAt ? { appliedAt: createdAt } : {}) },
      select: { campaign: { select: campaignSelect } }
    }),
    prisma.missionApplication.findMany({
      where: { accountId: params.accountId, ...(createdAt ? { createdAt } : {}) },
      select: { campaign: { select: campaignSelect } }
    }),
    prisma.missionSubmission.findMany({
      where: { accountId: params.accountId, ...(createdAt ? { createdAt } : {}) },
      select: { mission: { select: { campaign: { select: campaignSelect } } } }
    })
  ]);

  const campaignMap = new Map<string, { id: string; title: string; status: string; brandName: string | null }>();
  for (const item of creatorMissions) {
    campaignMap.set(item.campaign.id, { id: item.campaign.id, title: item.campaign.title, status: item.campaign.status, brandName: resolveBrandName(item.campaign) });
  }
  for (const item of missionApplications) {
    campaignMap.set(item.campaign.id, { id: item.campaign.id, title: item.campaign.title, status: item.campaign.status, brandName: resolveBrandName(item.campaign) });
  }
  for (const item of missionSubmissions) {
    const campaign = item.mission.campaign;
    campaignMap.set(campaign.id, { id: campaign.id, title: campaign.title, status: campaign.status, brandName: resolveBrandName(campaign) });
  }

  return {
    campaigns: Array.from(campaignMap.values()).sort((a, b) => {
      if (a.status === CampaignStatus.ACTIVE && b.status !== CampaignStatus.ACTIVE) return -1;
      if (a.status !== CampaignStatus.ACTIVE && b.status === CampaignStatus.ACTIVE) return 1;
      return a.title.localeCompare(b.title, "vi");
    })
  };
}

export async function getCreatorAnalyticsOverview(params: CreatorAnalyticsQuery): Promise<CreatorAnalyticsOverview> {
  const accountId = params.accountId.trim();
  if (!accountId) throw new AppError("Creator account scope is required", 403, "CREATOR_SCOPE_REQUIRED");

  const range = normalizeDateRange(params);
  const createdAt = dateFilter(range);
  const campaignId = compactFilter(params.campaignId);
  if (campaignId) await assertCreatorCampaignScope(accountId, campaignId);

  const [creatorMissions, missionApplications, missionSubmissions] = await Promise.all([
    prisma.creatorMission.findMany({
      where: {
        accountId,
        ...(campaignId ? { campaignId } : {}),
        ...(createdAt ? { appliedAt: createdAt } : {})
      },
      select: {
        id: true,
        campaignId: true,
        applicationStatus: true,
        status: true,
        submissionLifecycleStatus: true,
        submissionFinalSubmittedAt: true,
        videoReviewStatus: true,
        publishStatus: true,
        rewardCreditedAt: true,
        appliedAt: true,
        assignedAt: true,
        completedAt: true,
        updatedAt: true,
        mission: { select: { rewardCommissionVnd: true } },
        campaign: { select: campaignSelect }
      }
    }),
    prisma.missionApplication.findMany({
      where: {
        accountId,
        ...(campaignId ? { campaignId } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      select: { id: true, campaignId: true, status: true, createdAt: true, campaign: { select: campaignSelect } }
    }),
    prisma.missionSubmission.findMany({
      where: {
        accountId,
        ...(campaignId ? { mission: { campaignId } } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      select: {
        id: true,
        missionId: true,
        lifecycleStatus: true,
        rewardGrantedAt: true,
        createdAt: true,
        updatedAt: true,
        mission: { select: { campaignId: true, campaign: { select: campaignSelect } } }
      }
    })
  ]);

  const campaignIds = [...new Set([...creatorMissions.map((item) => item.campaignId), ...missionApplications.map((item) => item.campaignId), ...missionSubmissions.map((item) => item.mission.campaignId)])];
  const paymentSummary = await getAnalyticsPaymentSummary({
    from: params.from,
    to: params.to,
    campaignIds: campaignId ? [campaignId] : undefined,
    creatorAccountIds: [accountId]
  });

  const applications = Math.max(creatorMissions.length, missionApplications.length);
  const approvedApplications = Math.max(
    creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED).length,
    missionApplications.filter((item) => item.status === ApplicationStatus.APPROVED).length
  );
  const rejectedApplications = Math.max(
    creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.REJECTED).length,
    missionApplications.filter((item) => item.status === ApplicationStatus.REJECTED).length
  );
  const pendingApplications = Math.max(
    creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.PENDING_REVIEW).length,
    missionApplications.filter((item) => item.status === ApplicationStatus.PENDING_REVIEW).length
  );
  const assignedMissions = creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED || item.status === CreatorMissionStatus.IN_PROGRESS || item.status === CreatorMissionStatus.COMPLETED).length;
  const acceptedMissions = creatorMissions.filter((item) =>
    item.status === CreatorMissionStatus.IN_PROGRESS || item.status === CreatorMissionStatus.COMPLETED || ["DOING", "SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE"].includes(item.submissionLifecycleStatus)
  ).length;
  const proofSubmitted = creatorMissions.filter(isProofSubmitted).length + missionSubmissions.filter((item) => ["SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE", "REJECTED"].includes(item.lifecycleStatus)).length;
  const proofApproved = creatorMissions.filter(isProofApproved).length + missionSubmissions.filter((item) => item.lifecycleStatus === MissionLifecycleStatus.APPROVED || item.lifecycleStatus === MissionLifecycleStatus.DONE).length;
  const proofRejected = creatorMissions.filter(isProofRejected).length + missionSubmissions.filter((item) => item.lifecycleStatus === MissionLifecycleStatus.REJECTED).length;
  const rewardCredited = creatorMissions.filter((item) => Boolean(item.rewardCreditedAt)).length + missionSubmissions.filter((item) => Boolean(item.rewardGrantedAt)).length;

  const campaignStats = new Map<
    string,
    {
      campaignId: string;
      title: string;
      status: string;
      brandName: string | null;
      applicationStatus: string | null;
      missionStatus: string | null;
      proofStatus: string | null;
      approvedProofs: number;
      rejectedProofs: number;
      submittedProofs: number;
      commissionCreditedVnd: number;
    }
  >();

  for (const item of missionApplications) {
    campaignStats.set(item.campaignId, {
      campaignId: item.campaignId,
      title: item.campaign.title,
      status: item.campaign.status,
      brandName: resolveBrandName(item.campaign),
      applicationStatus: item.status,
      missionStatus: null,
      proofStatus: null,
      approvedProofs: 0,
      rejectedProofs: 0,
      submittedProofs: 0,
      commissionCreditedVnd: 0
    });
  }

  for (const item of creatorMissions) {
    const current = campaignStats.get(item.campaignId) ?? {
      campaignId: item.campaignId,
      title: item.campaign.title,
      status: item.campaign.status,
      brandName: resolveBrandName(item.campaign),
      applicationStatus: item.applicationStatus,
      missionStatus: null,
      proofStatus: null,
      approvedProofs: 0,
      rejectedProofs: 0,
      submittedProofs: 0,
      commissionCreditedVnd: 0
    };
    current.applicationStatus = item.applicationStatus;
    current.missionStatus = item.status;
    current.proofStatus = item.submissionLifecycleStatus;
    if (isProofSubmitted(item)) current.submittedProofs += 1;
    if (isProofApproved(item)) current.approvedProofs += 1;
    if (isProofRejected(item)) current.rejectedProofs += 1;
    current.commissionCreditedVnd += missionCommission(item);
    campaignStats.set(item.campaignId, current);
  }

  for (const item of missionSubmissions) {
    const campaign = item.mission.campaign;
    const current = campaignStats.get(campaign.id) ?? {
      campaignId: campaign.id,
      title: campaign.title,
      status: campaign.status,
      brandName: resolveBrandName(campaign),
      applicationStatus: null,
      missionStatus: null,
      proofStatus: null,
      approvedProofs: 0,
      rejectedProofs: 0,
      submittedProofs: 0,
      commissionCreditedVnd: 0
    };
    current.proofStatus = item.lifecycleStatus;
    if (["SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE", "REJECTED"].includes(item.lifecycleStatus)) current.submittedProofs += 1;
    if (item.lifecycleStatus === MissionLifecycleStatus.APPROVED || item.lifecycleStatus === MissionLifecycleStatus.DONE) current.approvedProofs += 1;
    if (item.lifecycleStatus === MissionLifecycleStatus.REJECTED) current.rejectedProofs += 1;
    campaignStats.set(campaign.id, current);
  }

  const recentActivity = [
    ...creatorMissions.map((item) => ({
      id: `creator-mission-${item.id}`,
      type: "CREATOR_MISSION",
      title: item.campaign.title,
      description: item.rewardCreditedAt ? "Reward credited" : item.completedAt ? "Mission completed" : `Mission status: ${item.status}`,
      campaignId: item.campaignId,
      createdAt: item.updatedAt.toISOString()
    })),
    ...missionApplications.map((item) => ({
      id: `mission-application-${item.id}`,
      type: "MISSION_APPLICATION",
      title: item.campaign.title,
      description: `Application status: ${item.status}`,
      campaignId: item.campaignId,
      createdAt: item.createdAt.toISOString()
    })),
    ...missionSubmissions.map((item) => ({
      id: `mission-submission-${item.id}`,
      type: "MISSION_SUBMISSION",
      title: item.mission.campaign.title,
      description: `Proof status: ${item.lifecycleStatus}`,
      campaignId: item.mission.campaignId,
      createdAt: item.updatedAt.toISOString()
    }))
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
      campaignId
    },
    overview: {
      totalApplications: applications,
      approvedApplications,
      rejectedApplications,
      pendingApplications,
      totalMissions: creatorMissions.length,
      acceptedMissions,
      submittedProofs: proofSubmitted,
      approvedProofs: proofApproved,
      rejectedProofs: proofRejected,
      pendingReviews: creatorMissions.filter((item) => item.submissionLifecycleStatus === MissionLifecycleStatus.PENDING_REVIEW).length + missionSubmissions.filter((item) => item.lifecycleStatus === MissionLifecycleStatus.PENDING_REVIEW).length,
      completedCampaigns: campaignIds.filter((id) => {
        const campaign = campaignStats.get(id);
        return campaign?.status === CampaignStatus.COMPLETED;
      }).length,
      activeCampaigns: campaignIds.filter((id) => {
        const campaign = campaignStats.get(id);
        return campaign?.status === CampaignStatus.ACTIVE;
      }).length
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
    earnings: {
      commissionCreditedVnd: paymentSummary.commissionCreditedVnd,
      payoutRequestedVnd: paymentSummary.payoutRequestedVnd,
      payoutPaidVnd: paymentSummary.payoutPaidVnd,
      payoutPendingVnd: paymentSummary.payoutPendingVnd,
      unknownPaymentTransactionsVnd: paymentSummary.unknownPaymentTransactionsVnd
    },
    pendingActions: {
      pendingApplications,
      missionsToAccept: creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED && item.submissionLifecycleStatus === MissionLifecycleStatus.ACCEPTED).length,
      proofsToSubmit: creatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED && !isProofSubmitted(item) && item.status !== CreatorMissionStatus.COMPLETED).length,
      pendingProofReview: creatorMissions.filter((item) => item.submissionLifecycleStatus === MissionLifecycleStatus.PENDING_REVIEW).length + missionSubmissions.filter((item) => item.lifecycleStatus === MissionLifecycleStatus.PENDING_REVIEW).length,
      rejectedProofsToRevise: proofRejected,
      pendingPayouts: paymentSummary.payoutPendingCount
    },
    campaignPerformance: Array.from(campaignStats.values())
      .map((item) => ({
        campaignId: item.campaignId,
        title: item.title,
        status: item.status,
        brandName: item.brandName,
        applicationStatus: item.applicationStatus,
        missionStatus: item.missionStatus,
        proofStatus: item.proofStatus,
        approvedProofs: item.approvedProofs,
        rejectedProofs: item.rejectedProofs,
        completionRate: pct(item.approvedProofs, item.submittedProofs),
        commissionCreditedVnd: item.commissionCreditedVnd
      }))
      .sort((a, b) => b.approvedProofs - a.approvedProofs || b.commissionCreditedVnd - a.commissionCreditedVnd || a.title.localeCompare(b.title, "vi")),
    recentActivity
  };
}
