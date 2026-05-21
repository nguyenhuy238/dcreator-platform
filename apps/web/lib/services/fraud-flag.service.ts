import { prisma } from "@/lib/db";

export async function scanFraudRiskSignals() {
  const [duplicatePayments, suspiciousContributions, spamProofs, flaggedAccounts] = await Promise.all([
    prisma.paymentTransaction.groupBy({
      by: ["idempotencyKey"],
      _count: { _all: true },
      where: { status: "SUCCESS" },
      having: { idempotencyKey: { _count: { gt: 1 } } },
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
      having: { _count: { accountId: { gt: 20 } } },
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
