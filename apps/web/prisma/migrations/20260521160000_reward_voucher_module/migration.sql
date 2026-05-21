CREATE TYPE "RewardType" AS ENUM ('PHYSICAL_PRODUCT', 'DIGITAL_VOUCHER', 'EXPERIENCE', 'CREATOR_PERK', 'DISCOUNT_CODE');
CREATE TYPE "VoucherStatus" AS ENUM ('ISSUED', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "VoucherUsageType" AS ENUM ('ONE_TIME', 'MULTI_USE');

ALTER TABLE "Reward"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "rewardType" "RewardType" NOT NULL DEFAULT 'DIGITAL_VOUCHER',
  ADD COLUMN "stockTotal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stockRemaining" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3);

UPDATE "Reward" SET "stockTotal" = "stock", "stockRemaining" = "stock";
ALTER TABLE "Reward" DROP COLUMN "voucherCode";
ALTER TABLE "Reward" DROP COLUMN "stock";

ALTER TABLE "RewardClaim"
  ADD COLUMN "usageType" "VoucherUsageType" NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN "expiryAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3),
  ADD COLUMN "usedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledReason" TEXT;

ALTER TABLE "RewardClaim" DROP COLUMN "status";
ALTER TABLE "RewardClaim" ADD COLUMN "status" "VoucherStatus" NOT NULL DEFAULT 'ISSUED';
