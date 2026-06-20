ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'WAITING_TRANSFER';

ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'CREATOR_DEPOSIT_HOLD';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'CREATOR_DEPOSIT_ADMIN_CONFIRMED';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'CREATOR_DEPOSIT_REFUND';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SampleShippingStatus') THEN
    CREATE TYPE "SampleShippingStatus" AS ENUM ('NOT_REQUIRED', 'WAITING_DEPOSIT', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED');
  END IF;
END $$;

ALTER TABLE "CreatorMission"
  ADD COLUMN IF NOT EXISTS "creatorDepositAmountVnd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositHeldAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "depositRefundedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "depositTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingRecipientName" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingProvince" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingDistrict" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingWard" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingNote" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingInfoSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sampleShippingStatus" "SampleShippingStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS "sampleShippedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sampleReceivedAt" TIMESTAMP(3);

UPDATE "CreatorMission" cm
SET
  "creatorDepositAmountVnd" = c."creatorDepositAmountVnd",
  "sampleShippingStatus" = CASE
    WHEN c."fulfillmentMode" = 'BRAND_SHIP' AND c."creatorDepositRequired" = true AND cm."depositStatus" = 'HELD' THEN 'READY_TO_SHIP'::"SampleShippingStatus"
    WHEN c."fulfillmentMode" = 'BRAND_SHIP' AND c."creatorDepositRequired" = true THEN 'WAITING_DEPOSIT'::"SampleShippingStatus"
    ELSE 'NOT_REQUIRED'::"SampleShippingStatus"
  END
FROM "Campaign" c
WHERE cm."campaignId" = c."id"
  AND cm."creatorDepositAmountVnd" = 0;

CREATE INDEX IF NOT EXISTS "CreatorMission_depositStatus_sampleShippingStatus_idx"
  ON "CreatorMission"("depositStatus", "sampleShippingStatus");
