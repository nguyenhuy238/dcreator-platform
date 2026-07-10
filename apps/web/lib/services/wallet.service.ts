import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";
import { topupConfirmSchema } from "@/lib/validators/wallet";

const TOPUP_POINT_RATE = 1;
const PAYOS_WEBHOOK_SECRET = process.env.PAYOS_WEBHOOK_SECRET ?? "";

type ConfirmPayload = z.infer<typeof topupConfirmSchema>;

function signPayload(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret = PAYOS_WEBHOOK_SECRET) {
  if (!secret) {
    throw new AppError("Missing PAYOS_WEBHOOK_SECRET", 500, "PAYMENT_CONFIG_INVALID");
  }
  const expected = signPayload(rawBody, secret);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function calculateTopupPoints(amountVnd: number) {
  return Math.floor(amountVnd / TOPUP_POINT_RATE);
}

export function assertNonNegativeBalance(pointsBalance: number, cashBalanceVnd: number) {
  if (pointsBalance < 0 || cashBalanceVnd < 0) {
    throw new AppError("Insufficient wallet balance", 409, "INSUFFICIENT_BALANCE");
  }
}

export async function ensureWalletByAccountId(accountId: string) {
  try {
    return await prisma.wallet.upsert({
      where: { userId: accountId },
      create: { userId: accountId },
      update: {}
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const wallet = await prisma.wallet.findUnique({ where: { userId: accountId } });
      if (wallet) return wallet;
    }
    throw error;
  }
}

export async function getWalletMe(accountId: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const [transactions, pendingPayments, payouts] = await prisma.$transaction([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.paymentTransaction.findMany({
      where: { walletId: wallet.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.payoutRequest.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return { wallet, transactions, pendingPayments, payouts };
}

async function ensureCreatorBankAccountOwned(accountId: string, creatorBankAccountId: string) {
  const bankAccount = await prisma.creatorBankAccount.findUnique({
    where: { id: creatorBankAccountId }
  });
  if (!bankAccount || bankAccount.accountId !== accountId) {
    throw new AppError("Bank account not found", 404, "BANK_ACCOUNT_NOT_FOUND");
  }
  return bankAccount;
}

export async function getWalletTransactions(accountId: string, page: number, limit: number) {
  const wallet = await ensureWalletByAccountId(accountId);
  const [total, items] = await prisma.$transaction([
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function createTopupPayment(accountId: string, amountVnd: number, idempotencyKey: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const creditedPoints = calculateTopupPoints(amountVnd);
  const existing = await prisma.paymentTransaction.findUnique({
    where: { accountId_idempotencyKey: { accountId, idempotencyKey } }
  });
  if (existing) {
    return existing;
  }
  return prisma.paymentTransaction.create({
    data: {
      walletId: wallet.id,
      accountId,
      provider: "PAYOS",
      idempotencyKey,
      orderCode: `TP${Date.now()}${Math.floor(Math.random() * 1000)}`,
      requestedAmountVnd: amountVnd,
      creditedPoints,
      status: "PENDING"
    }
  });
}

export async function confirmTopupPayment(payload: ConfirmPayload, rawPayload: unknown) {
  const payment = await prisma.paymentTransaction.findUnique({
    where: { orderCode: payload.orderCode }
  });
  if (!payment) {
    throw new AppError("Payment transaction not found", 404, "PAYMENT_NOT_FOUND");
  }

  if (payment.idempotencyKey !== payload.idempotencyKey) {
    throw new AppError("Idempotency key mismatch", 409, "IDEMPOTENCY_KEY_MISMATCH");
  }
  if (payment.requestedAmountVnd !== payload.paidAmountVnd) {
    throw new AppError("Payment amount mismatch", 409, "PAYMENT_AMOUNT_MISMATCH");
  }

  if (payload.status === "FAILED") {
    await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: { status: "FAILED", gatewayTransactionId: payload.transactionId, rawPayload: rawPayload as object }
    });
    return { status: "FAILED" as const };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.paymentTransaction.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCESS", gatewayTransactionId: payload.transactionId, rawPayload: rawPayload as object }
    });

    if (updated.count === 0) {
      const latest = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
      return { status: latest.status, idempotent: true as const };
    }

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: payment.walletId } });
    const nextPoints = wallet.pointsBalance + payment.creditedPoints;
    assertNonNegativeBalance(nextPoints, wallet.cashBalanceVnd);

    const walletUpdated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: nextPoints }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: payment.accountId,
        type: "TOPUP",
        pointsDelta: payment.creditedPoints,
        cashDeltaVnd: 0,
        balanceAfterPoints: walletUpdated.pointsBalance,
        balanceAfterCashVnd: walletUpdated.cashBalanceVnd,
        referenceType: "PAYMENT_TRANSACTION",
        referenceId: payment.id,
        idempotencyKey: payload.idempotencyKey
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: payment.accountId,
        action: "WALLET_BALANCE_CHANGED",
        targetType: "Wallet",
        targetId: wallet.id,
        metadata: { pointsDelta: payment.creditedPoints, cashDeltaVnd: 0, source: "TOPUP_CONFIRM" }
      }
    });

    return { status: "SUCCESS" as const, idempotent: false as const };
  });
}

export async function createCreatorPayoutRequest(
  accountId: string,
  amountVnd: number,
  creatorBankAccountId: string,
  note: string | undefined,
  idempotencyKey: string
) {
  const wallet = await ensureWalletByAccountId(accountId);
  const bankAccount = await ensureCreatorBankAccountOwned(accountId, creatorBankAccountId);
  if (wallet.pointsBalance < amountVnd) {
    throw new AppError("Insufficient N-Point balance", 409, "INSUFFICIENT_NPOINT_BALANCE");
  }

  const existing = await prisma.payoutRequest.findUnique({
    where: { accountId_idempotencyKey: { accountId, idempotencyKey } }
  });
  if (existing) return existing;

  const payoutRequest = await prisma.$transaction(async (tx) => {
    const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const nextPoints = currentWallet.pointsBalance - amountVnd;
    assertNonNegativeBalance(nextPoints, currentWallet.cashBalanceVnd);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        pointsBalance: nextPoints,
        pendingPayoutVnd: currentWallet.pendingPayoutVnd + amountVnd
      }
    });

    const payoutRequest = await tx.payoutRequest.create({
      data: {
        accountId,
        walletId: wallet.id,
        creatorBankAccountId: bankAccount.id,
        amountVnd,
        note,
        bankName: bankAccount.bankName,
        bankCode: bankAccount.bankCode,
        bankBin: bankAccount.bankBin,
        bankAccountName: bankAccount.accountHolderName,
        bankAccountNumber: bankAccount.accountNumber,
        idempotencyKey,
        status: "PENDING"
      }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId,
        type: "COMMISSION_PAYOUT",
        pointsDelta: -amountVnd,
        cashDeltaVnd: 0,
        balanceAfterPoints: updatedWallet.pointsBalance,
        balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
        referenceType: "PAYOUT_REQUEST",
        referenceId: payoutRequest.id,
        idempotencyKey
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: accountId,
        action: "WALLET_BALANCE_CHANGED",
        targetType: "Wallet",
        targetId: wallet.id,
        metadata: {
          pointsDelta: -amountVnd,
          cashDeltaVnd: 0,
          pendingPayoutDeltaVnd: amountVnd,
          source: "PAYOUT_REQUEST_CREATE",
          creatorBankAccountId: bankAccount.id
        }
      }
    });

    return payoutRequest;
  });

  await createNotification({
    accountId,
    event: "PAYOUT_REQUESTED",
    title: "Đã gửi yêu cầu payout",
    content: `Yêu cầu payout ${amountVnd.toLocaleString("vi-VN")} VND của bạn đã được ghi nhận.`,
    metadata: { payoutId: payoutRequest.id }
  });

  await createNotificationForAdminOps({
    event: "PAYOUT_REQUESTED",
    title: "Có yêu cầu payout mới",
    content: `Creator vừa gửi yêu cầu payout ${amountVnd.toLocaleString("vi-VN")} VND.`,
    metadata: { payoutId: payoutRequest.id, accountId },
    excludeAccountId: accountId
  });

  return payoutRequest;
}

export async function spendPointsForSupport(
  accountId: string,
  pointsCost: number,
  campaignId: string,
  idempotencyKey: string
) {
  const wallet = await ensureWalletByAccountId(accountId);
  return prisma.$transaction(async (tx) => {
    const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const nextPoints = currentWallet.pointsBalance - pointsCost;
    assertNonNegativeBalance(nextPoints, currentWallet.cashBalanceVnd);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: nextPoints }
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId,
        type: "SUPPORT",
        pointsDelta: -pointsCost,
        cashDeltaVnd: 0,
        balanceAfterPoints: updatedWallet.pointsBalance,
        balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
        referenceType: "CAMPAIGN",
        referenceId: campaignId,
        idempotencyKey
      }
    });
  });
}

export async function spendPointsForRewardRedeem(
  accountId: string,
  pointsCost: number,
  rewardId: string,
  idempotencyKey: string
) {
  const wallet = await ensureWalletByAccountId(accountId);
  return prisma.$transaction(async (tx) => {
    const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const nextPoints = currentWallet.pointsBalance - pointsCost;
    assertNonNegativeBalance(nextPoints, currentWallet.cashBalanceVnd);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: nextPoints }
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId,
        type: "REWARD_REDEEM",
        pointsDelta: -pointsCost,
        cashDeltaVnd: 0,
        balanceAfterPoints: updatedWallet.pointsBalance,
        balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
        referenceType: "REWARD",
        referenceId: rewardId,
        idempotencyKey
      }
    });
  });
}
