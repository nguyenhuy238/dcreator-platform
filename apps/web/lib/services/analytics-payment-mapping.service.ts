import { WalletTransactionType } from "@prisma/client";
import {
  createEmptyAnalyticsPaymentSummary,
  addPaymentTransactions,
  addPlatformPayouts,
  addScopedPayouts,
  type AnalyticsPaymentScope,
  type AnalyticsPaymentSummary
} from "@/lib/analytics-payment-mapping";
import { prisma } from "@/lib/db";

type DateRange = {
  from: Date | null;
  to: Date | null;
};

type PayoutReferenceRow = {
  amountVnd: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  creatorMissionId: string | null;
  campaignId: string | null;
};

type PaymentTransactionIntentRow = {
  requestedAmountVnd: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  intent: string | null;
  rawPayload: unknown;
};

type PrismaWithP1DFields = typeof prisma & {
  payoutRequest: typeof prisma.payoutRequest & {
    findMany(args: unknown): Promise<PayoutReferenceRow[]>;
  };
  paymentTransaction: typeof prisma.paymentTransaction & {
    findMany(args: unknown): Promise<PaymentTransactionIntentRow[]>;
  };
};

function parseDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeDateRange(scope: Pick<AnalyticsPaymentScope, "from" | "to">): DateRange {
  return {
    from: parseDate(scope.from),
    to: parseDate(scope.to)
  };
}

function dateFilter(range: DateRange) {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {})
  };
}

function compactIds(ids?: string[]) {
  if (!ids) return undefined;
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function paymentIntent(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const metadata = (rawPayload as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const intent = (metadata as { intent?: unknown }).intent;
  return typeof intent === "string" ? intent : null;
}

function paymentMetadataCampaignId(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const metadata = (rawPayload as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const campaignId = (metadata as { campaignId?: unknown }).campaignId;
  return typeof campaignId === "string" ? campaignId : null;
}

function paymentMetadataBrandId(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const metadata = (rawPayload as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const brandId = (metadata as { brandId?: unknown }).brandId;
  return typeof brandId === "string" ? brandId : null;
}

export async function getAnalyticsPaymentSummary(scope: AnalyticsPaymentScope = {}): Promise<AnalyticsPaymentSummary> {
  const prismaP1D = prisma as PrismaWithP1DFields;
  const campaignIds = compactIds(scope.campaignIds);
  const creatorAccountIds = compactIds(scope.creatorAccountIds);
  const brandAccountIds = compactIds(scope.brandAccountIds);
  const range = normalizeDateRange(scope);
  const createdAt = dateFilter(range);
  const rewardCreditedAt = dateFilter(range);
  const hasCampaignScope = Boolean(campaignIds);

  if (campaignIds && campaignIds.length === 0) {
    return createEmptyAnalyticsPaymentSummary(["Campaign scope is empty; payment metrics are zero."]);
  }

  const creatorMissionWhere = {
    rewardCreditedAt: { not: null, ...(rewardCreditedAt ?? {}) },
    ...(campaignIds ? { campaignId: { in: campaignIds } } : {}),
    ...(creatorAccountIds ? { accountId: { in: creatorAccountIds } } : {})
  };

  const [creatorMissions, submissionWalletTransactions, creatorMissionWalletTransactions, payouts, paymentTransactions] = await Promise.all([
    prisma.creatorMission.findMany({
      where: creatorMissionWhere,
      select: {
        id: true,
        submissionId: true,
        mission: { select: { rewardCommissionVnd: true } }
      }
    }),
    prisma.walletTransaction.findMany({
      where: {
        type: WalletTransactionType.COMMISSION_CREDIT,
        referenceType: "MISSION_SUBMISSION",
        ...(creatorAccountIds ? { accountId: { in: creatorAccountIds } } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      select: { referenceId: true, cashDeltaVnd: true }
    }),
    prisma.walletTransaction.findMany({
      where: {
        type: WalletTransactionType.COMMISSION_CREDIT,
        referenceType: "CREATOR_MISSION",
        ...(creatorAccountIds ? { accountId: { in: creatorAccountIds } } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      select: { referenceId: true, cashDeltaVnd: true }
    }),
    prismaP1D.payoutRequest.findMany({
      where: {
        ...(creatorAccountIds && !hasCampaignScope ? { accountId: { in: creatorAccountIds } } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      select: { amountVnd: true, status: true, creatorMissionId: true, campaignId: true }
    }),
    prismaP1D.paymentTransaction.findMany({
      where: {
        ...(creatorAccountIds ? { accountId: { in: creatorAccountIds } } : {}),
        ...(brandAccountIds ? { accountId: { in: brandAccountIds } } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      select: { requestedAmountVnd: true, status: true, intent: true, rawPayload: true }
    })
  ]);

  const creatorMissionIds = new Set(creatorMissions.map((item) => item.id));
  const submissionIdsCoveredByCreatorMission = new Set(creatorMissions.map((item) => item.submissionId).filter((id): id is string => typeof id === "string"));
  const submissionReferenceIds = submissionWalletTransactions
    .map((item) => item.referenceId)
    .filter((id): id is string => typeof id === "string" && !submissionIdsCoveredByCreatorMission.has(id));
  const creatorMissionReferenceIds = creatorMissionWalletTransactions
    .map((item) => item.referenceId)
    .filter((id): id is string => typeof id === "string" && !creatorMissionIds.has(id));

  const [submissionCampaignMapRows, creatorMissionCampaignMapRows] = await Promise.all([
    submissionReferenceIds.length
      ? prisma.missionSubmission.findMany({
          where: { id: { in: submissionReferenceIds } },
          select: { id: true, mission: { select: { campaignId: true } } }
        })
      : Promise.resolve([]),
    creatorMissionReferenceIds.length
      ? prisma.creatorMission.findMany({
          where: { id: { in: creatorMissionReferenceIds } },
          select: { id: true, campaignId: true }
        })
      : Promise.resolve([])
  ]);

  const submissionCampaignMap = new Map(submissionCampaignMapRows.map((item) => [item.id, item.mission.campaignId]));
  const payoutCreatorMissionIds = campaignIds
    ? payouts.map((item) => item.creatorMissionId).filter((id): id is string => typeof id === "string")
    : [];
  const payoutCreatorMissionCampaignRows = payoutCreatorMissionIds.length
    ? await prisma.creatorMission.findMany({
        where: { id: { in: payoutCreatorMissionIds } },
        select: { id: true, campaignId: true }
      })
    : [];
  const creatorMissionCampaignMap = new Map([
    ...creatorMissionCampaignMapRows.map((item) => [item.id, item.campaignId] as const),
    ...payoutCreatorMissionCampaignRows.map((item) => [item.id, item.campaignId] as const)
  ]);
  const campaignScope = campaignIds ? new Set(campaignIds) : null;
  const creatorMissionCommission = creatorMissions.reduce((sum, item) => sum + (item.mission?.rewardCommissionVnd ?? 0), 0);
  const submissionWalletCommission = submissionWalletTransactions
    .filter((item) => item.referenceId && !submissionIdsCoveredByCreatorMission.has(item.referenceId))
    .filter((item) => !campaignScope || (item.referenceId ? campaignScope.has(submissionCampaignMap.get(item.referenceId) ?? "") : false))
    .reduce((sum, item) => sum + Math.max(0, item.cashDeltaVnd), 0);
  const creatorMissionWalletCommission = creatorMissionWalletTransactions
    .filter((item) => item.referenceId && !creatorMissionIds.has(item.referenceId))
    .filter((item) => !campaignScope || (item.referenceId ? campaignScope.has(creatorMissionCampaignMap.get(item.referenceId) ?? "") : false))
    .reduce((sum, item) => sum + Math.max(0, item.cashDeltaVnd), 0);

  const filteredPaymentTransactions = paymentTransactions
    .filter((item) => {
      if (campaignScope) {
        const campaignId = paymentMetadataCampaignId(item.rawPayload);
        return campaignId ? campaignScope.has(campaignId) : false;
      }
      if (brandAccountIds) {
        const brandId = paymentMetadataBrandId(item.rawPayload);
        return brandId ? brandAccountIds.includes(brandId) : true;
      }
      return true;
    })
    .map((item) => ({
      requestedAmountVnd: item.requestedAmountVnd,
      status: item.status,
      intent: typeof item.intent === "string" ? item.intent : paymentIntent(item.rawPayload)
    }));

  const summary = addPaymentTransactions(
    campaignIds
      ? addScopedPayouts(createEmptyAnalyticsPaymentSummary(), payouts, campaignIds, creatorMissionCampaignMap)
      : addPlatformPayouts(createEmptyAnalyticsPaymentSummary(), payouts, {
          allowUnscopedPayouts: true
        }),
    filteredPaymentTransactions
  );

  return {
    ...summary,
    commissionCreditedVnd: creatorMissionCommission + submissionWalletCommission + creatorMissionWalletCommission
  };
}
