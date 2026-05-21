import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

async function createRiskFlag(input: {
  accountId?: string | null;
  targetType: string;
  targetId: string;
  reason: string;
  score: number;
  metadata?: unknown;
}) {
  return prisma.riskFlag.create({
    data: {
      accountId: input.accountId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      score: input.score,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined
    }
  });
}

export async function flagContributionSpam(accountId: string, campaignId: string) {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const count = await prisma.contribution.count({
    where: { supporterId: accountId, campaignId, createdAt: { gte: since } }
  });
  if (count >= 15) {
    await createRiskFlag({
      accountId,
      targetType: "Contribution",
      targetId: campaignId,
      reason: "CONTRIBUTION_SPAM",
      score: 65,
      metadata: { count, windowMinutes: 10 }
    });
  }
}

export async function flagMultipleFailedPayments(accountId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.paymentTransaction.count({
    where: { accountId, status: "FAILED", updatedAt: { gte: since } }
  });
  if (count >= 5) {
    await createRiskFlag({
      accountId,
      targetType: "PaymentTransaction",
      targetId: accountId,
      reason: "MULTIPLE_FAILED_PAYMENTS",
      score: 55,
      metadata: { count, windowHours: 24 }
    });
  }
}

export async function flagDuplicateWebhook(orderCode: string, idempotencyKey: string) {
  const count = await prisma.paymentTransaction.count({
    where: { orderCode, idempotencyKey, status: { in: ["SUCCESS", "FAILED"] } }
  });
  if (count > 0) {
    await createRiskFlag({
      targetType: "PaymentWebhook",
      targetId: orderCode,
      reason: "DUPLICATE_WEBHOOK",
      score: 30,
      metadata: { idempotencyKey }
    });
  }
}

export async function flagProofSpam(accountId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.missionSubmission.count({
    where: { accountId, createdAt: { gte: since } }
  });
  if (count >= 12) {
    await createRiskFlag({
      accountId,
      targetType: "MissionSubmission",
      targetId: accountId,
      reason: "PROOF_SPAM",
      score: 50,
      metadata: { count, windowMinutes: 60 }
    });
  }
}

export async function flagVoucherMultipleRedeem(voucherCode: string, accountId: string) {
  const usage = await prisma.auditLog.count({
    where: { action: "VOUCHER_REDEEMED", targetType: "RewardClaim", metadata: { path: ["voucherCode"], equals: voucherCode } }
  });
  if (usage > 1) {
    await createRiskFlag({
      accountId,
      targetType: "RewardClaim",
      targetId: voucherCode,
      reason: "VOUCHER_REDEEM_MULTI_ATTEMPT",
      score: 60,
      metadata: { usage }
    });
  }
}

export async function flagDuplicateProofUrl(accountId: string, url: string, submissionId: string) {
  const count = await prisma.missionSubmission.count({
    where: {
      accountId,
      id: { not: submissionId },
      OR: [{ videoUrl: url }, { socialPostUrl: url }, { imageUrl: url }]
    }
  });
  if (count > 0) {
    await createRiskFlag({
      accountId,
      targetType: "MissionSubmission",
      targetId: submissionId,
      reason: "CREATOR_DUPLICATE_URL",
      score: 45,
      metadata: { url, duplicateCount: count }
    });
  }
}

export async function flagSharedSessionHeuristic(sessionId: string, accountId: string) {
  const count = await prisma.analyticsEvent.groupBy({
    by: ["userId"],
    where: { sessionId, userId: { not: null } },
    _count: { _all: true }
  });
  if (count.length >= 3) {
    await createRiskFlag({
      accountId,
      targetType: "Session",
      targetId: sessionId,
      reason: "MULTI_ACCOUNT_SHARED_SESSION",
      score: 80,
      metadata: { accountsSeen: count.length }
    });
  }
}

export async function scanFraudRiskSignals() {
  const [duplicatePayments, suspiciousContributions, spamProofs, flaggedAccounts] = await Promise.all([
    prisma.paymentTransaction.groupBy({
      by: ["idempotencyKey"],
      _count: { _all: true },
      where: { status: "SUCCESS" },
      having: { idempotencyKey: { _count: { gt: 1 } } },
      orderBy: { idempotencyKey: "asc" },
      take: 50
    }),
    prisma.contribution.findMany({
      where: { status: "SUCCESS", amountVnd: { gt: 50000000 } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, amountVnd: true, supporterId: true, campaignId: true, createdAt: true }
    }),
    prisma.missionSubmission.groupBy({
      by: ["accountId"],
      _count: { _all: true },
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      having: { accountId: { _count: { gt: 20 } } },
      orderBy: { accountId: "asc" },
      take: 50
    }),
    prisma.riskFlag.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { account: { select: { id: true, displayName: true, email: true, role: true } } }
    })
  ]);

  return { duplicatePayments, suspiciousContributions, spamProofs, flaggedAccounts };
}
