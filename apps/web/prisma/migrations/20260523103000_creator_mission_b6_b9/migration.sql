-- CreateEnum
CREATE TYPE "CreatorMissionVideoReviewStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreatorMissionPublishStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Mission"
ADD COLUMN "productLink" TEXT;

-- Enforce mission product link policy for creator product options.
ALTER TABLE "Mission"
ADD CONSTRAINT "Mission_product_receive_option_link_check"
CHECK (
  ("productReceiveOption" <> 'NO_PRODUCT_REQUIRED'::"ProductReceiveOption" OR "productLink" IS NULL)
  AND
  ("productReceiveOption" <> 'CREATOR_BUY_FIRST'::"ProductReceiveOption" OR "productLink" IS NOT NULL)
) NOT VALID;

-- For creator mission flow, only BUY_FIRST or NO_PRODUCT_REQUIRED is allowed.
ALTER TABLE "Mission"
ADD CONSTRAINT "Mission_creator_audience_receive_option_check"
CHECK (
  "audience" <> 'CREATOR'::"MissionAudience"
  OR "productReceiveOption" IN ('CREATOR_BUY_FIRST'::"ProductReceiveOption", 'NO_PRODUCT_REQUIRED'::"ProductReceiveOption")
) NOT VALID;

-- AlterTable
ALTER TABLE "CreatorMission"
ADD COLUMN "productPurchasedConfirmedAt" TIMESTAMP(3),
ADD COLUMN "videoReviewStatus" "CreatorMissionVideoReviewStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN "videoReviewFeedback" TEXT,
ADD COLUMN "videoSubmittedAt" TIMESTAMP(3),
ADD COLUMN "videoReviewedAt" TIMESTAMP(3),
ADD COLUMN "publishStatus" "CreatorMissionPublishStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN "publishFeedback" TEXT,
ADD COLUMN "publishSubmittedAt" TIMESTAMP(3),
ADD COLUMN "publishReviewedAt" TIMESTAMP(3),
ADD COLUMN "publishPurchaseAmountVnd" INTEGER,
ADD COLUMN "rewardCreditedAt" TIMESTAMP(3);
