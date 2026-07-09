import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PaymentTransactionStatus, Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { shouldProcessPaymentWebhook } from "@/lib/payments/idempotency";
import { flagDuplicateWebhook, flagMultipleFailedPayments } from "@/lib/services/fraud-flag.service";
import { calculateTopupPoints } from "@/lib/services/wallet.service";
import {
  adminPaymentQuerySchema,
  payosCreatePaymentSchema,
  payosWebhookSchema
} from "@/lib/validators/payment";

type CreatePayosInput = z.infer<typeof payosCreatePaymentSchema>;
type PayosWebhookInput = z.infer<typeof payosWebhookSchema>;
type AdminPaymentQuery = z.infer<typeof adminPaymentQuerySchema>;

type PaymentIntent = "TOPUP_NPOINTS" | "CONTRIBUTION" | "BRAND_TOPUP_FUND";

function toPaymentUrl(orderCode: string) {
  return `${process.env.PAYOS_CHECKOUT_BASE_URL ?? "https://pay.payos.vn/web"}/${orderCode}`;
}

function generateOrderCode(intent: PaymentIntent) {
  const prefix = intent === "CONTRIBUTION" ? "SP" : intent === "BRAND_TOPUP_FUND" ? "BF" : "TP";
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function generateVoucherCode() {
  return `VCH-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function parseIntent(payment: { rawPayload: Prisma.JsonValue | null }) {
  const intent = (payment.rawPayload as { metadata?: { intent?: PaymentIntent } } | null)?.metadata?.intent;
  if (!intent) throw new AppError("Payment intent metadata missing", 500, "PAYMENT_METADATA_INVALID");
  return intent;
}

async function ensureWalletInTx(tx: Prisma.TransactionClient, accountId: string) {
  return tx.wallet.upsert({
    where: { userId: accountId },
    create: { userId: accountId },
    update: {}
  });
}

export function verifyPayosWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.PAYOS_WEBHOOK_SECRET ?? "";
  if (!secret) throw new AppError("Missing PAYOS_WEBHOOK_SECRET", 500, "PAYMENT_CONFIG_INVALID");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function createPayosPayment(account: { id: string; role: string }, input: CreatePayosInput) {
  if (input.intent === "CONTRIBUTION" && !input.campaignId) {
    throw new AppError("campaignId is required for contribution", 422, "CAMPAIGN_ID_REQUIRED");
  }
  let brandTopupBrandId: string | null = null;
  if (input.intent === "BRAND_TOPUP_FUND") {
    const membership = await prisma.brandMember.findFirst({
      where: {
        accountId: account.id,
        status: "ACTIVE",
        ...(input.currentBrandId ? { brandId: input.currentBrandId } : {}),
        brand: { isLocked: false, status: { notIn: ["LOCKED", "SUSPENDED"] } }
      },
      select: { brandId: true }
    });
    if (!membership) {
      throw new AppError("Active brand membership is required", 403, "BRAND_FORBIDDEN");
    }
    brandTopupBrandId = membership.brandId;
  }

  const existing = await prisma.paymentTransaction.findUnique({
    where: { accountId_idempotencyKey: { accountId: account.id, idempotencyKey: input.idempotencyKey } }
  });
  if (existing) {
    return { ...existing, paymentUrl: toPaymentUrl(existing.orderCode) };
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWalletInTx(tx, account.id);

    if (input.intent === "CONTRIBUTION") {
      const campaign = await tx.campaign.findUnique({
        where: { id: input.campaignId! },
        select: { id: true, status: true }
      });
      if (!campaign || campaign.status !== "ACTIVE") {
        throw new AppError("Campaign is not active", 409, "CAMPAIGN_INACTIVE");
      }
      if (input.rewardId) {
        const rewardUpdate = await tx.reward.updateMany({
          where: { id: input.rewardId, campaignId: campaign.id, isActive: true, stockRemaining: { gt: 0 } },
          data: { stockRemaining: { decrement: 1 } }
        });
        if (rewardUpdate.count === 0) throw new AppError("Reward is out of stock", 409, "REWARD_OUT_OF_STOCK");
      }
    }

    const payment = await tx.paymentTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: account.id,
        provider: "PAYOS",
        idempotencyKey: input.idempotencyKey,
        orderCode: generateOrderCode(input.intent),
        requestedAmountVnd: input.amountVnd,
        creditedPoints: input.intent === "TOPUP_NPOINTS" ? calculateTopupPoints(input.amountVnd) : 0,
        intent: input.intent,
        status: "PENDING",
        rawPayload: {
          metadata: {
            intent: input.intent,
            campaignId: input.campaignId ?? null,
            brandId: brandTopupBrandId,
            rewardId: input.rewardId ?? null,
            note: input.note ?? null
          }
        }
      } as never
    });

    if (input.intent === "CONTRIBUTION") {
      await tx.contribution.create({
        data: {
          campaignId: input.campaignId!,
          supporterId: account.id,
          rewardId: input.rewardId ?? null,
          paymentMethod: "PAYOS",
          status: "PENDING",
          idempotencyKey: input.idempotencyKey,
          paymentTransactionId: payment.id,
          amountVnd: payment.requestedAmountVnd,
          note: input.note
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: account.id,
        action: "PAYMENT_CREATED",
        targetType: "PaymentTransaction",
        targetId: payment.id,
        metadata: { intent: input.intent, amountVnd: payment.requestedAmountVnd, orderCode: payment.orderCode }
      }
    });

    return { ...payment, paymentUrl: toPaymentUrl(payment.orderCode) };
  });
}

async function finalizePaymentByIntent(tx: Prisma.TransactionClient, paymentId: string, status: PaymentTransactionStatus) {
  const payment = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: paymentId } });
  const intent = parseIntent(payment);

  await tx.analyticsEvent.create({
    data: {
      eventName: status === "SUCCESS" ? "payment_success" : "payment_failed",
      userId: payment.accountId,
      sessionId: `srv_${payment.accountId}`,
      metadata: { intent, amountVnd: payment.requestedAmountVnd }
    }
  });

  if (status !== "SUCCESS") {
    if (intent === "CONTRIBUTION") {
      const contribution = await tx.contribution.findFirst({ where: { paymentTransactionId: payment.id } });
      if (contribution && contribution.status === "PENDING") {
        await tx.contribution.update({ where: { id: contribution.id }, data: { status } });
        if (contribution.rewardId) {
          await tx.reward.update({ where: { id: contribution.rewardId }, data: { stockRemaining: { increment: 1 } } });
        }
      }
    }
    return;
  }

  if (intent === "TOPUP_NPOINTS") {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: payment.walletId } });
    const walletUpdated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: { increment: payment.creditedPoints } }
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
        idempotencyKey: payment.idempotencyKey
      }
    });
    return;
  }

  if (intent === "BRAND_TOPUP_FUND") {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: payment.walletId } });
    const walletUpdated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { cashBalanceVnd: { increment: payment.requestedAmountVnd } }
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: payment.accountId,
        type: "TOPUP",
        pointsDelta: 0,
        cashDeltaVnd: payment.requestedAmountVnd,
        balanceAfterPoints: walletUpdated.pointsBalance,
        balanceAfterCashVnd: walletUpdated.cashBalanceVnd,
        referenceType: "PAYMENT_TRANSACTION",
        referenceId: payment.id,
        idempotencyKey: payment.idempotencyKey
      }
    });
    return;
  }

  const contribution = await tx.contribution.findFirst({
    where: { paymentTransactionId: payment.id },
    include: { reward: true, campaign: { select: { id: true, brandId: true, creatorId: true } } }
  });
  if (!contribution) throw new AppError("Contribution not found", 404, "CONTRIBUTION_NOT_FOUND");
  if (contribution.status !== "PENDING") return;

  await tx.contribution.update({ where: { id: contribution.id }, data: { status: "SUCCESS" } });
  if (contribution.rewardId) {
    await tx.rewardClaim.create({
      data: {
        rewardId: contribution.rewardId,
        contributionId: contribution.id,
        accountId: contribution.supporterId,
        voucherCode: generateVoucherCode()
      }
    });
    await tx.analyticsEvent.create({
      data: {
        eventName: "voucher_issued",
        userId: contribution.supporterId,
        sessionId: `srv_${contribution.supporterId}`,
        campaignId: contribution.campaignId,
        brandId: contribution.campaign.brandId,
        creatorId: contribution.campaign.creatorId
      }
    });
  }

  await tx.analyticsEvent.create({
    data: {
      eventName: "campaign_contribution_success",
      userId: contribution.supporterId,
      sessionId: `srv_${contribution.supporterId}`,
      campaignId: contribution.campaignId,
      brandId: contribution.campaign.brandId,
      creatorId: contribution.campaign.creatorId,
      metadata: { amountVnd: contribution.amountVnd }
    }
  });
  await tx.campaign.update({
    where: { id: contribution.campaignId },
    data: { fundedAmountVnd: { increment: contribution.amountVnd }, backerCount: { increment: 1 } }
  });
}

export async function handlePayosWebhook(payload: PayosWebhookInput, rawPayload: unknown) {
  const payment = await prisma.paymentTransaction.findUnique({ where: { orderCode: payload.orderCode } });
  if (!payment) throw new AppError("Payment transaction not found", 404, "PAYMENT_NOT_FOUND");
  if (payment.idempotencyKey !== payload.idempotencyKey) {
    throw new AppError("Idempotency key mismatch", 409, "IDEMPOTENCY_KEY_MISMATCH");
  }
  if (payment.requestedAmountVnd !== payload.paidAmountVnd) {
    throw new AppError("Payment amount mismatch", 409, "PAYMENT_AMOUNT_MISMATCH");
  }

  const nextStatus: PaymentTransactionStatus = payload.status === "SUCCESS" ? "SUCCESS" : "FAILED";

  return prisma.$transaction(async (tx) => {
    if (!shouldProcessPaymentWebhook(payment.status)) {
      await flagDuplicateWebhook(payload.orderCode, payload.idempotencyKey);
      return { paymentId: payment.id, status: payment.status, idempotent: true };
    }

    const updated = await tx.paymentTransaction.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: nextStatus, gatewayTransactionId: payload.transactionId, rawPayload: rawPayload as Prisma.JsonObject }
    });

    if (updated.count === 0) {
      const latest = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
      return { paymentId: latest.id, status: latest.status, idempotent: true };
    }

    await finalizePaymentByIntent(tx, payment.id, nextStatus);
    if (nextStatus === "FAILED") {
      await flagMultipleFailedPayments(payment.accountId);
    }

    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "PAYMENT_WEBHOOK_PROCESSED",
        targetType: "PaymentTransaction",
        targetId: payment.id,
        metadata: { webhookStatus: payload.status, finalStatus: nextStatus, transactionId: payload.transactionId }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "PAYMENT_STATUS_CHANGED",
        targetType: "PaymentTransaction",
        targetId: payment.id,
        metadata: { from: "PENDING", to: nextStatus }
      }
    });

    return { paymentId: payment.id, status: nextStatus, idempotent: false };
  });
}

export async function getPaymentByIdForActor(paymentId: string, actor: { id: string; role: string }) {
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: paymentId },
    include: {
      account: { select: { id: true, displayName: true, role: true } },
      contributions: { select: { id: true, campaignId: true, status: true, rewardId: true } }
    }
  });
  if (!payment) throw new AppError("Payment transaction not found", 404, "PAYMENT_NOT_FOUND");
  if (!["ADMIN", "OPS"].includes(actor.role) && payment.accountId !== actor.id) {
    throw new AppError("Forbidden", 403, "AUTH_FORBIDDEN");
  }
  return payment;
}

export async function listAdminPayments(input: AdminPaymentQuery) {
  const where: Prisma.PaymentTransactionWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.accountId) where.accountId = input.accountId;
  if (input.intent) {
    where.rawPayload = {
      path: ["metadata", "intent"],
      equals: input.intent
    };
  }

  const [total, items] = await prisma.$transaction([
    prisma.paymentTransaction.count({ where }),
    prisma.paymentTransaction.findMany({
      where,
      include: {
        account: { select: { id: true, displayName: true, role: true } },
        contributions: { select: { id: true, campaignId: true, status: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit
    })
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}
