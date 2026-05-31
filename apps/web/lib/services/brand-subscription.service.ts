import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  BRAND_SUBSCRIPTION_PACKAGE_MAP,
  BRAND_SUBSCRIPTION_PACKAGE_RANK,
  BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA,
  BRAND_SUBSCRIPTION_PACKAGES,
  type BrandSubscriptionPackageCode
} from "@/lib/constants/brand-subscription";
import { ensureWalletByAccountId } from "@/lib/services/wallet.service";
import type { Prisma } from "@prisma/client";

type BrandContext = { id: string; name: string; ownerAccountId: string };
type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type PackageStatus = "ACTIVE" | "AVAILABLE" | "LOCKED";

async function resolveBrandContext(db: PrismaClientLike, accountId: string, currentBrandId?: string | null): Promise<BrandContext> {
  const membership = await db.brandMember.findFirst({
    where: { accountId, ...(currentBrandId ? { brandId: currentBrandId } : {}) },
    include: { brand: { select: { id: true, name: true, ownerAccountId: true } } },
    orderBy: { createdAt: "desc" }
  });
  if (membership) return membership.brand;

  if (currentBrandId) {
    throw new AppError("Bạn không có quyền truy cập Brand này", 403, "BRAND_FORBIDDEN");
  }
  throw new AppError("Bạn chưa được gắn vào Nhãn hàng nào", 403, "BRAND_ACCESS_NOT_CONFIGURED");
}

function toPackageStatus(currentPackageCode: BrandSubscriptionPackageCode, packageCode: BrandSubscriptionPackageCode): PackageStatus {
  if (packageCode === currentPackageCode) return "ACTIVE";
  if (BRAND_SUBSCRIPTION_PACKAGE_RANK[packageCode] > BRAND_SUBSCRIPTION_PACKAGE_RANK[currentPackageCode]) return "AVAILABLE";
  return "LOCKED";
}

function canPurchasePackage(input: {
  currentPackageCode: BrandSubscriptionPackageCode;
  packageCode: BrandSubscriptionPackageCode;
  pricePoints: number;
}) {
  return (
    input.pricePoints > 0 &&
    toPackageStatus(input.currentPackageCode, input.packageCode) === "AVAILABLE"
  );
}

export async function getBrandSubscriptionState(accountId: string, currentBrandId?: string | null) {
  const brand = await resolveBrandContext(prisma, accountId, currentBrandId);
  const [wallet, subscription, videoUsage] = await Promise.all([
    ensureWalletByAccountId(brand.ownerAccountId),
    prisma.brandSubscription.upsert({
      where: { brandId: brand.id },
      create: { brandId: brand.id, packageCode: "FREE", activatedAt: new Date() },
      update: {}
    }),
    prisma.campaign.aggregate({
      where: { brandId: brand.ownerAccountId },
      _sum: { ugcVideoApprovedCount: true }
    })
  ]);

  const currentPackageCode = subscription.packageCode as BrandSubscriptionPackageCode;
  const videoQuota = BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA[currentPackageCode] ?? 0;
  const videoUsed = Math.max(0, videoUsage._sum.ugcVideoApprovedCount ?? 0);

  return {
    brand,
    walletPoints: wallet.pointsBalance,
    currentPackageCode,
    videoQuota,
    videoUsed,
    videoRemaining: Math.max(0, videoQuota - videoUsed),
    isVideoQuotaReached: videoQuota > 0 && videoUsed >= videoQuota,
    updatedAt: subscription.updatedAt,
    packages: BRAND_SUBSCRIPTION_PACKAGES.map((pkg) => ({
      ...pkg,
      videoQuota: BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA[pkg.code] ?? 0,
      status: toPackageStatus(currentPackageCode, pkg.code),
      canPurchase: canPurchasePackage({ currentPackageCode, packageCode: pkg.code, pricePoints: pkg.pricePoints })
    }))
  };
}

export async function purchaseBrandSubscription(accountId: string, packageCode: BrandSubscriptionPackageCode, currentBrandId?: string | null) {
  const selectedPackage = BRAND_SUBSCRIPTION_PACKAGE_MAP[packageCode];
  if (!selectedPackage) {
    throw new AppError("Gói không hợp lệ", 422, "BRAND_SUBSCRIPTION_PACKAGE_INVALID");
  }
  if (selectedPackage.pricePoints <= 0) {
    throw new AppError("Gói Free không cần mua", 409, "BRAND_SUBSCRIPTION_FREE_NOT_PURCHASABLE");
  }

  const result = await prisma.$transaction(async (tx) => {
    const brand = await resolveBrandContext(tx, accountId, currentBrandId);
    const subscription = await tx.brandSubscription.upsert({
      where: { brandId: brand.id },
      create: { brandId: brand.id, packageCode: "FREE", activatedAt: new Date() },
      update: {}
    });

    const currentPackageCode = subscription.packageCode as BrandSubscriptionPackageCode;
    if (currentPackageCode === packageCode) {
      throw new AppError("Brand đang sử dụng gói này", 409, "BRAND_SUBSCRIPTION_ALREADY_ACTIVE");
    }

    const currentRank = BRAND_SUBSCRIPTION_PACKAGE_RANK[currentPackageCode];
    const targetRank = BRAND_SUBSCRIPTION_PACKAGE_RANK[packageCode];
    if (targetRank <= currentRank) {
      throw new AppError("Không thể mua lại gói thấp hơn gói hiện tại", 409, "BRAND_SUBSCRIPTION_DOWNGRADE_NOT_ALLOWED");
    }


    const wallet = await tx.wallet.upsert({
      where: { userId: brand.ownerAccountId },
      create: { userId: brand.ownerAccountId },
      update: {}
    });

    if (wallet.pointsBalance < selectedPackage.pricePoints) {
      throw new AppError("Không đủ N-Point để nâng cấp gói", 409, "INSUFFICIENT_NPOINT_BALANCE");
    }

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: wallet.pointsBalance - selectedPackage.pricePoints }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: brand.ownerAccountId,
        type: "ADJUSTMENT",
        pointsDelta: -selectedPackage.pricePoints,
        cashDeltaVnd: 0,
        balanceAfterPoints: updatedWallet.pointsBalance,
        balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
        referenceType: "BRAND_SUBSCRIPTION",
        referenceId: `${brand.id}:${packageCode}`,
        idempotencyKey: `brand-subscription-${brand.id}-${packageCode}-${Date.now()}`
      }
    });

    const updatedSubscription = await tx.brandSubscription.update({
      where: { brandId: brand.id },
      data: {
        packageCode,
        activatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: accountId,
        action: "BRAND_SUBSCRIPTION_PURCHASED",
        targetType: "BrandSubscription",
        targetId: updatedSubscription.id,
        oldStatus: currentPackageCode,
        newStatus: packageCode,
        metadata: {
          brandId: brand.id,
          packageCode,
          spentPoints: selectedPackage.pricePoints,
          walletPointsAfter: updatedWallet.pointsBalance
        }
      }
    });

    return {
      brand,
      walletPoints: updatedWallet.pointsBalance,
      currentPackageCode: updatedSubscription.packageCode as BrandSubscriptionPackageCode,
      updatedAt: updatedSubscription.updatedAt
    };
  });

  const videoUsage = await prisma.campaign.aggregate({
    where: { brandId: result.brand.ownerAccountId },
    _sum: { ugcVideoApprovedCount: true }
  });
  const videoQuota = BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA[result.currentPackageCode] ?? 0;
  const videoUsed = Math.max(0, videoUsage._sum.ugcVideoApprovedCount ?? 0);

  return {
    ...result,
    videoQuota,
    videoUsed,
    videoRemaining: Math.max(0, videoQuota - videoUsed),
    isVideoQuotaReached: videoQuota > 0 && videoUsed >= videoQuota,
    packages: BRAND_SUBSCRIPTION_PACKAGES.map((pkg) => ({
      ...pkg,
      videoQuota: BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA[pkg.code] ?? 0,
      status: toPackageStatus(result.currentPackageCode, pkg.code),
      canPurchase: canPurchasePackage({ currentPackageCode: result.currentPackageCode, packageCode: pkg.code, pricePoints: pkg.pricePoints })
    }))
  };
}
