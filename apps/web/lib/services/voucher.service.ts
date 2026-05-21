import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getMyVouchers(accountId: string) {
  return prisma.rewardClaim.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: {
      reward: {
        select: {
          id: true,
          title: true,
          description: true,
          rewardType: true,
          campaign: { select: { id: true, title: true, slug: true } }
        }
      }
    }
  });
}

export async function getVoucherByCodeForUser(code: string, accountId: string) {
  const voucher = await prisma.rewardClaim.findUnique({
    where: { voucherCode: code },
    include: {
      reward: { include: { campaign: { select: { id: true, title: true, slug: true } } } }
    }
  });
  if (!voucher) throw new AppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
  if (voucher.accountId !== accountId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  return voucher;
}

export async function redeemVoucher(code: string, accountId: string, redemptionNote?: string) {
  return prisma.$transaction(async (tx) => {
    const voucher = await tx.rewardClaim.findUnique({
      where: { voucherCode: code },
      include: { reward: { include: { campaign: true } } }
    });
    if (!voucher) throw new AppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    if (voucher.accountId !== accountId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (voucher.status === "USED") throw new AppError("Voucher already used", 409, "VOUCHER_ALREADY_USED");
    if (voucher.status === "CANCELLED") throw new AppError("Voucher cancelled", 409, "VOUCHER_CANCELLED");
    if (voucher.expiryAt && voucher.expiryAt.getTime() <= Date.now()) {
      await tx.rewardClaim.update({ where: { id: voucher.id }, data: { status: "EXPIRED" } });
      throw new AppError("Voucher expired", 409, "VOUCHER_EXPIRED");
    }
    if (voucher.usageType === "ONE_TIME" && voucher.usedAt) {
      throw new AppError("Voucher already used", 409, "VOUCHER_ALREADY_USED");
    }

    const updated = await tx.rewardClaim.update({
      where: { id: voucher.id },
      data: {
        status: "USED",
        activatedAt: voucher.activatedAt ?? new Date(),
        usedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: accountId,
        action: "VOUCHER_REDEEMED",
        targetType: "RewardClaim",
        targetId: voucher.id,
        metadata: { voucherCode: code, redemptionNote: redemptionNote ?? null }
      }
    });

    await tx.analyticsEvent.create({
      data: {
        eventName: "voucher_redeemed",
        userId: accountId,
        sessionId: `srv_${accountId}`,
        campaignId: voucher.reward.campaign.id,
        brandId: voucher.reward.campaign.brandId
      }
    });

    return updated;
  });
}

export async function cancelVoucherByAdmin(voucherId: string, actorId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const voucher = await tx.rewardClaim.findUnique({ where: { id: voucherId } });
    if (!voucher) throw new AppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    if (voucher.status === "USED") throw new AppError("Cannot cancel used voucher", 409, "VOUCHER_USED");

    const updated = await tx.rewardClaim.update({
      where: { id: voucherId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: reason
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "VOUCHER_CANCELLED",
        targetType: "RewardClaim",
        targetId: voucherId,
        metadata: { reason }
      }
    });

    return updated;
  });
}

export async function listAdminVouchers(input: {
  code?: string;
  user?: string;
  campaign?: string;
  page: number;
  limit: number;
}) {
  const where = {
    ...(input.code
      ? { voucherCode: { contains: input.code, mode: "insensitive" as const } }
      : {}),
    ...(input.user
      ? { account: { displayName: { contains: input.user, mode: "insensitive" as const } } }
      : {}),
    ...(input.campaign
      ? { reward: { campaign: { title: { contains: input.campaign, mode: "insensitive" as const } } } }
      : {})
  };

  const [total, items, logs] = await prisma.$transaction([
    prisma.rewardClaim.count({ where }),
    prisma.rewardClaim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: {
        account: { select: { id: true, displayName: true, email: true } },
        reward: { include: { campaign: { select: { id: true, title: true } } } }
      }
    }),
    prisma.auditLog.findMany({
      where: { targetType: "RewardClaim", action: { startsWith: "VOUCHER_" } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  return {
    items,
    logs,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}
