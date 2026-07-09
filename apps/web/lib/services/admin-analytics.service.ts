import { ApplicationStatus, CampaignStatus, CreatorMissionPublishStatus, CreatorMissionVideoReviewStatus, MissionLifecycleStatus, PaymentTransactionStatus, PayoutRequestStatus, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AdminAnalyticsQuery = {
  from?: string;
  to?: string;
  brandId?: string;
  campaignId?: string;
};

export type AdminAnalyticsOverview = {
  generatedAt: string;
  filters: {
    from: string | null;
    to: string | null;
    brandId: string | null;
    campaignId: string | null;
  };
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    draftCampaigns: number;
    cancelledCampaigns: number;
    totalBrandCampaignRequests: number;
    pendingBrandCampaignRequests: number;
    approvedBrandCampaignRequests: number;
    rejectedBrandCampaignRequests: number;
  };
  funnel: {
    totalCreatorMissions: number;
    applications: number;
    approvedApplications: number;
    rejectedApplications: number;
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
    paymentTransactionsSucceededVnd: number;
    paymentTransactionsPendingVnd: number;
    paymentTransactionsFailedVnd: number;
  };
  topCreators: Array<{
    creatorId: string;
    accountId: string | null;
    displayName: string;
    avatarUrl?: string | null;
    approvedMissions: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
  campaignPerformance: Array<{
    campaignId: string;
    title: string;
    status: string;
    brandId: string | null;
    brandName: string | null;
    totalCreatorMissions: number;
    approvedApplications: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
};

export type AdminAnalyticsFilterOptions = {
  brands: Array<{
    id: string;
    name: string;
    campaignCount: number;
  }>;
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    brandId: string | null;
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

function normalizeDateRange(params?: AdminAnalyticsQuery): DateRange {
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

function isProofSubmitted(item: {
  submissionLifecycleStatus: MissionLifecycleStatus;
  submissionFinalSubmittedAt: Date | null;
  videoReviewStatus: CreatorMissionVideoReviewStatus;
  publishStatus: CreatorMissionPublishStatus;
}) {
  return Boolean(
    item.submissionFinalSubmittedAt ||
      ["SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE", "REJECTED"].includes(item.submissionLifecycleStatus) ||
      item.videoReviewStatus !== "NOT_SUBMITTED" ||
      item.publishStatus !== "NOT_SUBMITTED"
  );
}

function isProofApproved(item: {
  submissionLifecycleStatus: MissionLifecycleStatus;
  videoReviewStatus: CreatorMissionVideoReviewStatus;
  publishStatus: CreatorMissionPublishStatus;
}) {
  return item.submissionLifecycleStatus === "APPROVED" || item.submissionLifecycleStatus === "DONE" || item.videoReviewStatus === "APPROVED" || item.publishStatus === "APPROVED";
}

function isProofRejected(item: {
  submissionLifecycleStatus: MissionLifecycleStatus;
  videoReviewStatus: CreatorMissionVideoReviewStatus;
  publishStatus: CreatorMissionPublishStatus;
}) {
  return item.submissionLifecycleStatus === "REJECTED" || item.videoReviewStatus === "REJECTED" || item.publishStatus === "REJECTED";
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

function compactFilter(value?: string | null) {
  return value?.trim() || null;
}

export async function getAdminAnalyticsFilterOptions(params: Pick<AdminAnalyticsQuery, "from" | "to"> = {}): Promise<AdminAnalyticsFilterOptions> {
  const range = normalizeDateRange(params);
  const createdAt = dateFilter(range);
  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(createdAt ? { createdAt } : {})
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
    select: {
      id: true,
      title: true,
      status: true,
      brandId: true,
      brand: {
        select: {
          displayName: true,
          ownedBrands: {
            select: { name: true, legalName: true },
            orderBy: { updatedAt: "desc" },
            take: 1
          }
        }
      }
    }
  });

  const brandMap = new Map<string, { id: string; name: string; campaignCount: number }>();
  const campaignOptions = campaigns
    .map((campaign) => {
      const brandName = resolveBrandName(campaign);
      const brand = brandMap.get(campaign.brandId) ?? { id: campaign.brandId, name: brandName, campaignCount: 0 };
      brand.campaignCount += 1;
      brandMap.set(campaign.brandId, brand);
      return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        brandId: campaign.brandId,
        brandName
      };
    })
    .sort((a, b) => {
      if (a.status === CampaignStatus.ACTIVE && b.status !== CampaignStatus.ACTIVE) return -1;
      if (a.status !== CampaignStatus.ACTIVE && b.status === CampaignStatus.ACTIVE) return 1;
      return a.title.localeCompare(b.title, "vi");
    });

  return {
    brands: Array.from(brandMap.values()).sort((a, b) => b.campaignCount - a.campaignCount || a.name.localeCompare(b.name, "vi")),
    campaigns: campaignOptions
  };
}

export async function getAdminAnalyticsOverview(params: AdminAnalyticsQuery = {}): Promise<AdminAnalyticsOverview> {
  const range = normalizeDateRange(params);
  const createdAt = dateFilter(range);
  const brandId = compactFilter(params.brandId);
  const campaignId = compactFilter(params.campaignId);

  const campaignWhere = {
    ...(campaignId ? { id: campaignId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(createdAt ? { createdAt } : {})
  };
  const campaignScopeWhere = {
    ...(campaignId ? { campaignId } : {}),
    ...(brandId ? { campaign: { brandId } } : {})
  };
  const creatorMissionWhere = {
    ...campaignScopeWhere,
    ...(createdAt ? { appliedAt: createdAt } : {})
  };
  const brandCampaignRequestWhere = {
    ...(brandId ? { brandId } : {}),
    ...(campaignId ? { createdCampaignId: campaignId } : {}),
    ...(createdAt ? { createdAt } : {})
  };
  const paymentCreatedAtWhere = createdAt ? { createdAt } : {};

  const [
    campaigns,
    brandCampaignRequests,
    creatorMissions,
    pendingApplicationsFromMissionApplications,
    pendingProofsFromMissionSubmissions,
    payoutRequests,
    paymentTransactions,
    commissionCredited
  ] = await Promise.all([
    prisma.campaign.findMany({
      where: campaignWhere,
      select: {
        id: true,
        title: true,
        status: true,
        brandId: true,
        brand: {
          select: {
            displayName: true,
            ownedBrands: {
              select: { name: true, legalName: true },
              orderBy: { updatedAt: "desc" },
              take: 1
            }
          }
        }
      }
    }),
    prisma.brandCampaignRequest.findMany({
      where: brandCampaignRequestWhere,
      select: { id: true, status: true }
    }),
    prisma.creatorMission.findMany({
      where: creatorMissionWhere,
      select: {
        id: true,
        campaignId: true,
        accountId: true,
        applicationStatus: true,
        appliedAt: true,
        status: true,
        submissionLifecycleStatus: true,
        submissionStatus: true,
        submissionFinalSubmittedAt: true,
        videoReviewStatus: true,
        publishStatus: true,
        rewardCreditedAt: true,
        mission: { select: { rewardCommissionVnd: true } },
        account: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
            brandId: true,
            brand: {
              select: {
                displayName: true,
                ownedBrands: {
                  select: { name: true, legalName: true },
                  orderBy: { updatedAt: "desc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    }),
    prisma.missionApplication.count({
      where: {
        status: ApplicationStatus.PENDING_REVIEW,
        ...(campaignId ? { campaignId } : {}),
        ...(brandId ? { campaign: { brandId } } : {}),
        ...(createdAt ? { createdAt } : {})
      }
    }),
    prisma.missionSubmission.count({
      where: {
        lifecycleStatus: MissionLifecycleStatus.PENDING_REVIEW,
        ...(campaignId || brandId ? { mission: { ...(campaignId ? { campaignId } : {}), ...(brandId ? { campaign: { brandId } } : {}) } } : {}),
        ...(createdAt ? { createdAt } : {})
      }
    }),
    prisma.payoutRequest.findMany({
      where: {
        ...(createdAt ? { createdAt } : {})
      },
      select: { amountVnd: true, status: true }
    }),
    // TODO(analytics): PaymentTransaction is not yet fully separated by intent.
    // Keep this metric conservative until payment intent mapping is normalized.
    prisma.paymentTransaction.findMany({
      where: paymentCreatedAtWhere,
      select: { requestedAmountVnd: true, status: true }
    }),
    prisma.walletTransaction.aggregate({
      _sum: { cashDeltaVnd: true },
      where: {
        type: WalletTransactionType.COMMISSION_CREDIT,
        ...(createdAt ? { createdAt } : {})
      }
    })
  ]);

  const campaignIdsInScope = new Set(campaigns.map((campaign) => campaign.id));
  const scopedCreatorMissions = creatorMissions.filter((item) => campaignIdsInScope.size === 0 || campaignIdsInScope.has(item.campaignId));

  const approvedApplications = scopedCreatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED).length;
  const rejectedApplications = scopedCreatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.REJECTED).length;
  const assignedMissions = scopedCreatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.APPROVED || item.status === "IN_PROGRESS" || item.status === "COMPLETED").length;
  const acceptedMissions = scopedCreatorMissions.filter((item) => item.status === "IN_PROGRESS" || item.status === "COMPLETED" || ["DOING", "SUBMITTED", "PENDING_REVIEW", "APPROVED", "DONE"].includes(item.submissionLifecycleStatus)).length;
  const proofSubmitted = scopedCreatorMissions.filter(isProofSubmitted).length;
  const proofApproved = scopedCreatorMissions.filter(isProofApproved).length;
  const proofRejected = scopedCreatorMissions.filter(isProofRejected).length;
  const rewardCredited = scopedCreatorMissions.filter((item) => Boolean(item.rewardCreditedAt)).length;

  const creatorStats = new Map<
    string,
    {
      creatorId: string;
      accountId: string | null;
      displayName: string;
      avatarUrl: string | null;
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
      brandId: string | null;
      brandName: string | null;
      totalCreatorMissions: number;
      approvedApplications: number;
      submittedProofs: number;
      approvedProofs: number;
      rejectedProofs: number;
      commissionCreditedVnd: number;
    }
  >();

  for (const item of scopedCreatorMissions) {
    const creator = creatorStats.get(item.accountId) ?? {
      creatorId: item.accountId,
      accountId: item.accountId,
      displayName: item.account.displayName || item.account.email || `Creator #${item.accountId.slice(-6)}`,
      avatarUrl: item.account.avatarUrl,
      approvedMissions: 0,
      submittedProofs: 0,
      approvedProofs: 0,
      rejectedProofs: 0,
      commissionCreditedVnd: 0
    };
    const campaign = campaignStats.get(item.campaignId) ?? {
      campaignId: item.campaignId,
      title: item.campaign.title,
      status: item.campaign.status,
      brandId: item.campaign.brandId,
      brandName: resolveBrandName(item.campaign),
      totalCreatorMissions: 0,
      approvedApplications: 0,
      submittedProofs: 0,
      approvedProofs: 0,
      rejectedProofs: 0,
      commissionCreditedVnd: 0
    };

    const submitted = isProofSubmitted(item);
    const approved = isProofApproved(item);
    const rejected = isProofRejected(item);
    const commission = missionCommission(item);

    campaign.totalCreatorMissions += 1;
    if (item.applicationStatus === ApplicationStatus.APPROVED) {
      creator.approvedMissions += 1;
      campaign.approvedApplications += 1;
    }
    if (submitted) {
      creator.submittedProofs += 1;
      campaign.submittedProofs += 1;
    }
    if (approved) {
      creator.approvedProofs += 1;
      campaign.approvedProofs += 1;
    }
    if (rejected) {
      creator.rejectedProofs += 1;
      campaign.rejectedProofs += 1;
    }
    creator.commissionCreditedVnd += commission;
    campaign.commissionCreditedVnd += commission;

    creatorStats.set(item.accountId, creator);
    campaignStats.set(item.campaignId, campaign);
  }

  for (const campaign of campaigns) {
    if (!campaignStats.has(campaign.id)) {
      campaignStats.set(campaign.id, {
        campaignId: campaign.id,
        title: campaign.title,
        status: campaign.status,
        brandId: campaign.brandId,
        brandName: resolveBrandName(campaign),
        totalCreatorMissions: 0,
        approvedApplications: 0,
        submittedProofs: 0,
        approvedProofs: 0,
        rejectedProofs: 0,
        commissionCreditedVnd: 0
      });
    }
  }

  const topCreators = Array.from(creatorStats.values())
    .map((item) => ({
      ...item,
      completionRate: pct(item.approvedProofs, item.submittedProofs)
    }))
    .sort((a, b) => b.approvedProofs - a.approvedProofs || b.approvedMissions - a.approvedMissions || b.commissionCreditedVnd - a.commissionCreditedVnd)
    .slice(0, 10);

  const campaignPerformance = Array.from(campaignStats.values())
    .map((item) => ({
      ...item,
      completionRate: pct(item.approvedProofs, item.submittedProofs)
    }))
    .sort((a, b) => b.approvedProofs - a.approvedProofs || b.totalCreatorMissions - a.totalCreatorMissions || b.commissionCreditedVnd - a.commissionCreditedVnd);

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
      brandId,
      campaignId
    },
    overview: {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((item) => item.status === CampaignStatus.ACTIVE).length,
      completedCampaigns: campaigns.filter((item) => item.status === CampaignStatus.COMPLETED).length,
      draftCampaigns: campaigns.filter((item) => item.status === CampaignStatus.DRAFT).length,
      cancelledCampaigns: campaigns.filter((item) => item.status === CampaignStatus.CANCELLED || item.status === CampaignStatus.ARCHIVED).length,
      totalBrandCampaignRequests: brandCampaignRequests.length,
      pendingBrandCampaignRequests: brandCampaignRequests.filter((item) => item.status === "PENDING_REVIEW" || item.status === "NEEDS_REVISION").length,
      approvedBrandCampaignRequests: brandCampaignRequests.filter((item) => item.status === "APPROVED").length,
      rejectedBrandCampaignRequests: brandCampaignRequests.filter((item) => item.status === "REJECTED" || item.status === "CANCELLED").length
    },
    funnel: {
      totalCreatorMissions: scopedCreatorMissions.length,
      applications: scopedCreatorMissions.length,
      approvedApplications,
      rejectedApplications,
      assignedMissions,
      acceptedMissions,
      proofSubmitted,
      proofApproved,
      proofRejected,
      rewardCredited,
      applicationApprovalRate: pct(approvedApplications, scopedCreatorMissions.length),
      proofApprovalRate: pct(proofApproved, proofSubmitted),
      missionCompletionRate: pct(rewardCredited || proofApproved, assignedMissions)
    },
    pendingReview: {
      pendingApplications: scopedCreatorMissions.filter((item) => item.applicationStatus === ApplicationStatus.PENDING_REVIEW).length + pendingApplicationsFromMissionApplications,
      pendingProofs: scopedCreatorMissions.filter((item) => item.submissionLifecycleStatus === MissionLifecycleStatus.PENDING_REVIEW).length + pendingProofsFromMissionSubmissions,
      pendingVideoReviews: scopedCreatorMissions.filter((item) => item.videoReviewStatus === CreatorMissionVideoReviewStatus.PENDING).length,
      pendingFinalReviews: scopedCreatorMissions.filter((item) => item.publishStatus === CreatorMissionPublishStatus.PENDING).length,
      pendingPayouts: payoutRequests.filter((item) => item.status === PayoutRequestStatus.PENDING).length
    },
    payments: {
      commissionCreditedVnd: commissionCredited._sum.cashDeltaVnd ?? 0,
      payoutRequestedVnd: payoutRequests.reduce((sum, item) => sum + item.amountVnd, 0),
      payoutPaidVnd: payoutRequests.filter((item) => item.status === PayoutRequestStatus.PAID).reduce((sum, item) => sum + item.amountVnd, 0),
      payoutPendingVnd: payoutRequests.filter((item) => item.status === PayoutRequestStatus.PENDING || item.status === PayoutRequestStatus.APPROVED).reduce((sum, item) => sum + item.amountVnd, 0),
      paymentTransactionsSucceededVnd: paymentTransactions.filter((item) => item.status === PaymentTransactionStatus.SUCCESS).reduce((sum, item) => sum + item.requestedAmountVnd, 0),
      paymentTransactionsPendingVnd: paymentTransactions.filter((item) => item.status === PaymentTransactionStatus.PENDING).reduce((sum, item) => sum + item.requestedAmountVnd, 0),
      paymentTransactionsFailedVnd: paymentTransactions.filter((item) => item.status === PaymentTransactionStatus.FAILED).reduce((sum, item) => sum + item.requestedAmountVnd, 0)
    },
    topCreators,
    campaignPerformance
  };
}
