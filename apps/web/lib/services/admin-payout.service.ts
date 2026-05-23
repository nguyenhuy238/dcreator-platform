import { NotificationEvent, PayoutRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification } from "@/lib/services/notification.service";

function ensureTransition(current: PayoutRequestStatus, next: PayoutRequestStatus) {
  if (next === "APPROVED" && current !== "PENDING") throw new AppError("Only pending payout can be approved", 409, "INVALID_STATUS_TRANSITION");
  if (next === "REJECTED" && current !== "PENDING") throw new AppError("Only pending payout can be rejected", 409, "INVALID_STATUS_TRANSITION");
  if (next === "PAID" && current !== "APPROVED") throw new AppError("Only approved payout can be marked paid", 409, "INVALID_STATUS_TRANSITION");
}

export async function getFinanceOverviewForAdmin() {
  const [campaignRevenue, commissionCredits, payoutStats, failedPayments, payoutPendingAmount] = await Promise.all([
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { status: "SUCCESS" } }),
    prisma.walletTransaction.aggregate({ _sum: { cashDeltaVnd: true }, where: { type: "COMMISSION_CREDIT" } }),
    prisma.payoutRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.paymentTransaction.count({ where: { status: "FAILED" } }),
    prisma.payoutRequest.aggregate({ _sum: { amountVnd: true }, where: { status: "PENDING" } })
  ]);

  const stat = { PENDING: 0, APPROVED: 0, REJECTED: 0, PAID: 0 };
  for (const row of payoutStats) stat[row.status] = row._count._all;

  return {
    campaignRevenueVnd: campaignRevenue._sum.amountVnd ?? 0,
    creatorCommissionVnd: Math.max(0, commissionCredits._sum.cashDeltaVnd ?? 0),
    payoutPendingCount: stat.PENDING,
    payoutApprovedCount: stat.APPROVED,
    payoutRejectedCount: stat.REJECTED,
    payoutPaidCount: stat.PAID,
    payoutPendingAmountVnd: payoutPendingAmount._sum.amountVnd ?? 0,
    paymentFailedCount: failedPayments
  };
}

export async function listPayoutRequestsForAdmin(input: { status?: PayoutRequestStatus; query?: string }) {
  return prisma.payoutRequest.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.query
        ? {
            OR: [
              { account: { displayName: { contains: input.query, mode: "insensitive" } } },
              { account: { email: { contains: input.query, mode: "insensitive" } } },
              { note: { contains: input.query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, displayName: true, email: true, role: true } },
      wallet: { select: { id: true, cashBalanceVnd: true, pointsBalance: true } }
    }
  });
}

export async function getPayoutRequestDetailForAdmin(payoutId: string) {
  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutId },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true, bankName: true, bankAccountName: true, bankAccountNumber: true } }
        }
      },
      wallet: { select: { id: true, cashBalanceVnd: true, pointsBalance: true } }
    }
  });
  if (!payout) throw new AppError("Payout request not found", 404, "PAYOUT_NOT_FOUND");

  const relatedTransactions = await prisma.walletTransaction.findMany({
    where: { referenceType: "PAYOUT_REQUEST", referenceId: payout.id },
    orderBy: { createdAt: "desc" }
  });

  const evidenceSubmissions = await prisma.missionSubmission.findMany({
    where: {
      accountId: payout.accountId,
      rewardGrantedAt: { not: null }
    },
    orderBy: { rewardGrantedAt: "desc" },
    take: 20,
    include: {
      mission: {
        select: {
          id: true,
          title: true,
          rewardCommissionVnd: true,
          campaign: { select: { id: true, title: true } }
        }
      }
    }
  });

  return { ...payout, relatedTransactions, evidenceSubmissions };
}

export async function approvePayoutRequestByAdmin(actorId: string, payoutId: string) {
  const payout = await getPayoutRequestDetailForAdmin(payoutId);
  ensureTransition(payout.status, "APPROVED");

  const updated = await prisma.payoutRequest.update({
    where: { id: payoutId },
    data: { status: "APPROVED", reviewedById: actorId, reviewedAt: new Date() }
  });

  await writeAuditLog({
    actorId,
    action: "PAYOUT_APPROVED",
    targetType: "PayoutRequest",
    targetId: payoutId
  });

  await createNotification({
    accountId: payout.accountId,
    event: NotificationEvent.PAYOUT_APPROVED,
    title: "Yêu cầu payout đã được duyệt",
    content: `Yêu cầu payout ${payout.amountVnd.toLocaleString("vi-VN")} VND đã được duyệt.`,
    metadata: { payoutId }
  });

  return updated;
}

export async function rejectPayoutRequestByAdmin(actorId: string, payoutId: string, reason: string) {
  const payout = await getPayoutRequestDetailForAdmin(payoutId);
  ensureTransition(payout.status, "REJECTED");

  const updated = await prisma.$transaction(async (tx) => {
    const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: payout.walletId } });
    const nextCash = currentWallet.cashBalanceVnd + payout.amountVnd;
    const wallet = await tx.wallet.update({
      where: { id: currentWallet.id },
      data: { cashBalanceVnd: nextCash }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: payout.accountId,
        type: "ADJUSTMENT",
        pointsDelta: 0,
        cashDeltaVnd: payout.amountVnd,
        balanceAfterPoints: wallet.pointsBalance,
        balanceAfterCashVnd: wallet.cashBalanceVnd,
        referenceType: "PAYOUT_REQUEST_REJECT_REFUND",
        referenceId: payout.id,
        idempotencyKey: `payout_reject_refund_${payout.id}`
      }
    });

    return tx.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: "REJECTED",
        note: reason,
        reviewedById: actorId,
        reviewedAt: new Date()
      }
    });
  });

  await writeAuditLog({
    actorId,
    action: "PAYOUT_REJECTED",
    targetType: "PayoutRequest",
    targetId: payoutId,
    metadata: { reason, refundedAmountVnd: payout.amountVnd }
  });

  await createNotification({
    accountId: payout.accountId,
    event: NotificationEvent.PAYOUT_REJECTED,
    title: "Yêu cầu payout bị từ chối",
    content: `Yêu cầu payout bị từ chối: ${reason}. Số tiền đã được hoàn lại ví commission.`,
    metadata: { payoutId, reason }
  });

  return updated;
}

export async function markPayoutAsPaidByAdmin(actorId: string, payoutId: string) {
  const payout = await getPayoutRequestDetailForAdmin(payoutId);
  ensureTransition(payout.status, "PAID");

  const updated = await prisma.payoutRequest.update({
    where: { id: payout.id },
    data: { status: "PAID", paidAt: new Date(), reviewedById: actorId, reviewedAt: payout.reviewedAt ?? new Date() }
  });

  await writeAuditLog({
    actorId,
    action: "PAYOUT_MARKED_PAID",
    targetType: "PayoutRequest",
    targetId: payoutId
  });

  await createNotification({
    accountId: payout.accountId,
    event: NotificationEvent.PAYOUT_APPROVED,
    title: "Payout đã thanh toán",
    content: `Khoản payout ${payout.amountVnd.toLocaleString("vi-VN")} VND đã được chuyển khoản.`,
    metadata: { payoutId }
  });

  return updated;
}

