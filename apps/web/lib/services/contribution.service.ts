import { randomUUID } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import type { ContributionResultDTO } from "@/lib/dto/contribution";
import { AppError } from "@/lib/errors";
import {
  contributionCreateSchema,
  contributionPayosWebhookSchema
} from "@/lib/validators/contribution";
import { assertNonNegativeBalance } from "./wallet.service";

type CreateContributionInput = z.infer<typeof contributionCreateSchema>;
type ContributionWebhookPayload = z.infer<typeof contributionPayosWebhookSchema>;


function toPaymentUrl(orderCode: string) {
  return `${process.env.PAYOS_CHECKOUT_BASE_URL ?? "https://pay.payos.vn/web"}/${orderCode}`;
}

function generateVoucherCode() {
  return `VCH-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function ensureWalletInTx(
  tx: { wallet: { upsert: typeof prisma.wallet.upsert } },
  accountId: string
) {
  return tx.wallet.upsert({
    where: { userId: accountId },
    create: { userId: accountId },
    update: {}
  });
}

function verifySignature(rawBody: string, signature: string) {
  const secret = process.env.PAYOS_WEBHOOK_SECRET ?? "";
  if (!secret) throw new AppError("Missing webhook secret", 500, "PAYMENT_CONFIG_INVALID");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyContributionWebhookSignature(rawBody: string, signature: string) {
  return verifySignature(rawBody, signature);
}

export async function createCampaignContribution(
  campaignId: string,
  supporterId: string,
  input: CreateContributionInput
): Promise<ContributionResultDTO> {
  const supporter = await prisma.account.findUnique({
    where: { id: supporterId },
    select: { id: true, isActive: true, riskFlags: { select: { id: true, score: true } } }
  });

  if (!supporter || !supporter.isActive) throw new AppError("Account is locked", 403, "ACCOUNT_LOCKED");
  if (supporter.riskFlags.some((flag) => flag.score > 0)) {
    throw new AppError("Account is flagged", 403, "ACCOUNT_FLAGGED");
  }

  const existing = await prisma.contribution.findFirst({
    where: { supporterId, idempotencyKey: input.idempotencyKey },
    include: { rewardClaim: true, reward: { select: { title: true } } }
  });
  if (existing) {
    return {
      contributionId: existing.id,
      status: existing.status,
      paymentUrl:
        existing.paymentMethod === "PAYOS" && existing.paymentTransactionId
          ? toPaymentUrl((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: existing.paymentTransactionId } })).orderCode)
          : null,
      voucher: existing.rewardClaim
        ? { code: existing.rewardClaim.voucherCode, rewardTitle: existing.reward?.title ?? "Reward" }
        : null
    };
  }

  if (input.paymentMethod === "N_POINTS") {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, status: true, fundedAmountVnd: true, backerCount: true, brandId: true, creatorId: true }
      });
      if (!campaign || campaign.status !== "ACTIVE") {
        throw new AppError("Campaign is not active", 409, "CAMPAIGN_INACTIVE");
      }

      const rewardUpdate = await tx.reward.updateMany({
        where: { id: input.rewardId, campaignId, isActive: true, stockRemaining: { gt: 0 } },
        data: { stockRemaining: { decrement: 1 } }
      });
      if (rewardUpdate.count === 0) {
        throw new AppError("Reward is out of stock", 409, "REWARD_OUT_OF_STOCK");
      }

      const reward = await tx.reward.findUniqueOrThrow({ where: { id: input.rewardId } });
      const wallet = await ensureWalletInTx(tx, supporterId);
      const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const nextPoints = currentWallet.pointsBalance - reward.pointsCost;
      assertNonNegativeBalance(nextPoints, currentWallet.cashBalanceVnd);
      const walletUpdated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { pointsBalance: nextPoints }
      });

      const contribution = await tx.contribution.create({
        data: {
          campaignId,
          supporterId,
          rewardId: reward.id,
          paymentMethod: "N_POINTS",
          status: "SUCCESS",
          idempotencyKey: input.idempotencyKey,
          amountVnd: input.amount
        }
      });

      const claim = await tx.rewardClaim.create({
        data: {
          rewardId: reward.id,
          contributionId: contribution.id,
          accountId: supporterId,
          voucherCode: generateVoucherCode()
        }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          accountId: supporterId,
          type: "SUPPORT",
          pointsDelta: -reward.pointsCost,
          cashDeltaVnd: 0,
          balanceAfterPoints: walletUpdated.pointsBalance,
          balanceAfterCashVnd: walletUpdated.cashBalanceVnd,
          referenceType: "CONTRIBUTION",
          referenceId: contribution.id,
          idempotencyKey: input.idempotencyKey
        }
      });

      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          fundedAmountVnd: { increment: input.amount },
          backerCount: { increment: 1 }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: supporterId,
          action: "CONTRIBUTION_SUCCESS",
          targetType: "Campaign",
          targetId: campaignId,
          metadata: { contributionId: contribution.id, paymentMethod: "N_POINTS", rewardId: reward.id }
        }
      });

      await tx.analyticsEvent.createMany({
        data: [
          {
            eventName: "campaign_support_started",
            userId: supporterId,
            sessionId: `srv_${supporterId}`,
            campaignId,
            brandId: campaign.brandId,
            creatorId: campaign.creatorId,
            metadata: { amountVnd: input.amount, paymentMethod: "N_POINTS" }
          },
          {
            eventName: "reward_selected",
            userId: supporterId,
            sessionId: `srv_${supporterId}`,
            campaignId,
            brandId: campaign.brandId,
            creatorId: campaign.creatorId,
            metadata: { rewardId: reward.id }
          }
        ]
      });

      await tx.analyticsEvent.create({
        data: {
          eventName: "campaign_contribution_success",
          userId: supporterId,
          sessionId: `srv_${supporterId}`,
          campaignId,
          brandId: campaign.brandId,
          creatorId: campaign.creatorId,
          metadata: { amountVnd: input.amount }
        }
      });

      await tx.analyticsEvent.create({
        data: {
          eventName: "voucher_issued",
          userId: supporterId,
          sessionId: `srv_${supporterId}`,
          campaignId,
          brandId: campaign.brandId,
          creatorId: campaign.creatorId
        }
      });

      return {
        contributionId: contribution.id,
        status: "SUCCESS",
        paymentUrl: null,
        voucher: { code: claim.voucherCode, rewardTitle: reward.title }
      } satisfies ContributionResultDTO;
    });
  }

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true, brandId: true, creatorId: true }
    });
    if (!campaign || campaign.status !== "ACTIVE") {
      throw new AppError("Campaign is not active", 409, "CAMPAIGN_INACTIVE");
    }

    const rewardUpdate = await tx.reward.updateMany({
      where: { id: input.rewardId, campaignId, isActive: true, stockRemaining: { gt: 0 } },
      data: { stockRemaining: { decrement: 1 } }
    });
    if (rewardUpdate.count === 0) {
      throw new AppError("Reward is out of stock", 409, "REWARD_OUT_OF_STOCK");
    }

    const wallet = await ensureWalletInTx(tx, supporterId);
    const paymentTx = await tx.paymentTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: supporterId,
        provider: "PAYOS",
        idempotencyKey: input.idempotencyKey,
        orderCode: `SP${Date.now()}${Math.floor(Math.random() * 1000)}`,
        requestedAmountVnd: input.amount,
        creditedPoints: 0,
        status: "PENDING"
      }
    });

    const contribution = await tx.contribution.create({
      data: {
        campaignId,
        supporterId,
        rewardId: input.rewardId,
        paymentMethod: "PAYOS",
        status: "PENDING",
        idempotencyKey: input.idempotencyKey,
        paymentTransactionId: paymentTx.id,
        amountVnd: input.amount
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: supporterId,
        action: "CONTRIBUTION_PENDING",
        targetType: "Campaign",
        targetId: campaignId,
        metadata: { contributionId: contribution.id, paymentMethod: "PAYOS", rewardId: input.rewardId }
      }
    });

    await tx.analyticsEvent.createMany({
      data: [
        {
          eventName: "campaign_support_started",
          userId: supporterId,
          sessionId: `srv_${supporterId}`,
          campaignId,
          brandId: campaign.brandId,
          creatorId: campaign.creatorId,
          metadata: { amountVnd: input.amount, paymentMethod: "PAYOS" }
        },
        {
          eventName: "reward_selected",
          userId: supporterId,
          sessionId: `srv_${supporterId}`,
          campaignId,
          brandId: campaign.brandId,
          creatorId: campaign.creatorId,
          metadata: { rewardId: input.rewardId }
        }
      ]
    });

    return {
      contributionId: contribution.id,
      status: "PENDING",
      paymentUrl: toPaymentUrl(paymentTx.orderCode),
      voucher: null
    } satisfies ContributionResultDTO;
  });
}

export async function handleContributionPayosWebhook(payload: ContributionWebhookPayload, rawPayload: unknown) {
  const paymentTx = await prisma.paymentTransaction.findUnique({ where: { orderCode: payload.orderCode } });
  if (!paymentTx) throw new AppError("Payment transaction not found", 404, "PAYMENT_NOT_FOUND");
  if (paymentTx.idempotencyKey !== payload.idempotencyKey) {
    throw new AppError("Idempotency key mismatch", 409, "IDEMPOTENCY_KEY_MISMATCH");
  }
  if (paymentTx.requestedAmountVnd !== payload.paidAmountVnd) {
    throw new AppError("Payment amount mismatch", 409, "PAYMENT_AMOUNT_MISMATCH");
  }

  return prisma.$transaction(async (tx) => {
    const contribution = await tx.contribution.findFirst({
      where: { paymentTransactionId: paymentTx.id },
      include: { reward: true }
    });
    if (!contribution) throw new AppError("Contribution not found", 404, "CONTRIBUTION_NOT_FOUND");

    if (contribution.status !== "PENDING") {
      return { contributionId: contribution.id, status: contribution.status, idempotent: true };
    }

    if (payload.status === "FAILED") {
      await tx.paymentTransaction.update({
        where: { id: paymentTx.id },
        data: { status: "FAILED", gatewayTransactionId: payload.transactionId, rawPayload: rawPayload as object }
      });
      await tx.contribution.update({
        where: { id: contribution.id },
        data: { status: "FAILED" }
      });
      if (contribution.rewardId) {
        await tx.reward.update({ where: { id: contribution.rewardId }, data: { stockRemaining: { increment: 1 } } });
      }
      await tx.analyticsEvent.create({
        data: {
          eventName: "payment_failed",
          userId: contribution.supporterId,
          sessionId: `srv_${contribution.supporterId}`,
          campaignId: contribution.campaignId
        }
      });
      return { contributionId: contribution.id, status: "FAILED", idempotent: false };
    }

    await tx.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: { status: "SUCCESS", gatewayTransactionId: payload.transactionId, rawPayload: rawPayload as object }
    });
    await tx.contribution.update({ where: { id: contribution.id }, data: { status: "SUCCESS" } });

    const claim = await tx.rewardClaim.create({
      data: {
        rewardId: contribution.rewardId!,
        contributionId: contribution.id,
        accountId: contribution.supporterId,
        voucherCode: generateVoucherCode()
      }
    });

    await tx.campaign.update({
      where: { id: contribution.campaignId },
      data: { fundedAmountVnd: { increment: contribution.amountVnd }, backerCount: { increment: 1 } }
    });

    await tx.auditLog.create({
      data: {
        actorId: contribution.supporterId,
        action: "CONTRIBUTION_WEBHOOK_SUCCESS",
        targetType: "Campaign",
        targetId: contribution.campaignId,
        metadata: { contributionId: contribution.id, rewardClaimId: claim.id }
      }
    });

    await tx.analyticsEvent.createMany({
      data: [
        {
          eventName: "payment_success",
          userId: contribution.supporterId,
          sessionId: `srv_${contribution.supporterId}`,
          campaignId: contribution.campaignId
        },
        {
          eventName: "campaign_contribution_success",
          userId: contribution.supporterId,
          sessionId: `srv_${contribution.supporterId}`,
          campaignId: contribution.campaignId,
          metadata: { amountVnd: contribution.amountVnd }
        },
        {
          eventName: "voucher_issued",
          userId: contribution.supporterId,
          sessionId: `srv_${contribution.supporterId}`,
          campaignId: contribution.campaignId
        }
      ]
    });

    return { contributionId: contribution.id, status: "SUCCESS", idempotent: false, voucherCode: claim.voucherCode };
  });
}
