CREATE TYPE "CampaignFulfillmentMode" AS ENUM ('BRAND_SHIP', 'CREATOR_ORDER');

ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'REQUIRED';
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'HELD';
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'FORFEITED';

ALTER TABLE "Campaign"
  ADD COLUMN "fulfillmentMode" "CampaignFulfillmentMode" NOT NULL DEFAULT 'BRAND_SHIP',
  ADD COLUMN "creatorDepositRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Campaign"
  ADD CONSTRAINT "Campaign_creator_deposit_fulfillment_check"
  CHECK (
    "fulfillmentMode" = 'BRAND_SHIP'::"CampaignFulfillmentMode"
    OR "creatorDepositRequired" = false
  );
