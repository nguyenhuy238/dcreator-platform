-- Hotfix Supabase schema drift causing /api/me/mission 500
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductReceiveOption') THEN
    CREATE TYPE "ProductReceiveOption" AS ENUM ('DEPOSIT_PRODUCT', 'CREATOR_BUY_FIRST', 'NO_PRODUCT_REQUIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreatorMissionStatus') THEN
    CREATE TYPE "CreatorMissionStatus" AS ENUM ('PRODUCT_PENDING', 'DRAFT_PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('NOT_REQUIRED', 'WAITING_DEPOSIT', 'WAITING_PURCHASE', 'RECEIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DepositStatus') THEN
    CREATE TYPE "DepositStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReimbursementStatus') THEN
    CREATE TYPE "ReimbursementStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PURCHASE_SUBMITTED', 'APPROVED', 'PAYOUT_PENDING', 'PAID', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreatorMissionVideoReviewStatus') THEN
    CREATE TYPE "CreatorMissionVideoReviewStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreatorMissionPublishStatus') THEN
    CREATE TYPE "CreatorMissionPublishStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'MISSION_APPLICATION_APPROVED';
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'MISSION_APPLICATION_REJECTED';
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'CREATOR_MISSION_VIDEO_APPROVED';
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'CREATOR_MISSION_VIDEO_REJECTED';
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'CREATOR_MISSION_FINAL_APPROVED';
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'CREATOR_MISSION_FINAL_REJECTED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Mission"
  ADD COLUMN IF NOT EXISTS "productReceiveOption" "ProductReceiveOption" NOT NULL DEFAULT 'NO_PRODUCT_REQUIRED',
  ADD COLUMN IF NOT EXISTS "productLink" TEXT;

CREATE TABLE IF NOT EXISTS "MissionApplication" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "note" TEXT,
  "rejectReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MissionApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreatorMission" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "submissionId" TEXT,
  "missionApplicationId" TEXT,
  "status" "CreatorMissionStatus" NOT NULL,
  "productReceiveOption" "ProductReceiveOption" NOT NULL,
  "productStatus" "ProductStatus" NOT NULL,
  "depositStatus" "DepositStatus" NOT NULL,
  "reimbursementStatus" "ReimbursementStatus" NOT NULL,
  "purchaseProofTextNote" TEXT,
  "purchaseProofScreenshotUrl" TEXT,
  "purchaseProofNote" TEXT,
  "purchaseProofSubmittedAt" TIMESTAMP(3),
  "purchaseProofReviewedAt" TIMESTAMP(3),
  "purchaseProofRejectReason" TEXT,
  "productPurchasedConfirmedAt" TIMESTAMP(3),
  "videoReviewStatus" "CreatorMissionVideoReviewStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "videoReviewFeedback" TEXT,
  "videoSubmittedAt" TIMESTAMP(3),
  "videoReviewedAt" TIMESTAMP(3),
  "publishStatus" "CreatorMissionPublishStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "publishFeedback" TEXT,
  "publishSubmittedAt" TIMESTAMP(3),
  "publishReviewedAt" TIMESTAMP(3),
  "publishPurchaseAmountVnd" INTEGER,
  "reimbursementAmountVnd" INTEGER,
  "rewardCreditedAt" TIMESTAMP(3),
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorMission_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CreatorMission' AND column_name = 'applicationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CreatorMission' AND column_name = 'submissionId'
  ) THEN
    ALTER TABLE "CreatorMission" RENAME COLUMN "applicationId" TO "submissionId";
  END IF;
END $$;

ALTER TABLE "CreatorMission"
  ADD COLUMN IF NOT EXISTS "missionApplicationId" TEXT,
  ADD COLUMN IF NOT EXISTS "productPurchasedConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "videoReviewStatus" "CreatorMissionVideoReviewStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "videoReviewFeedback" TEXT,
  ADD COLUMN IF NOT EXISTS "videoSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "videoReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishStatus" "CreatorMissionPublishStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "publishFeedback" TEXT,
  ADD COLUMN IF NOT EXISTS "publishSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishPurchaseAmountVnd" INTEGER,
  ADD COLUMN IF NOT EXISTS "reimbursementAmountVnd" INTEGER,
  ADD COLUMN IF NOT EXISTS "rewardCreditedAt" TIMESTAMP(3);

ALTER TABLE "MissionSubmission"
  ADD COLUMN IF NOT EXISTS "purchaseBillImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "productReviewScreenshotUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseProofNote" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicVideoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "adCode" TEXT,
  ADD COLUMN IF NOT EXISTS "finalProofNote" TEXT,
  ADD COLUMN IF NOT EXISTS "finalSubmittedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "MissionApplication_missionId_accountId_key" ON "MissionApplication"("missionId", "accountId");
CREATE INDEX IF NOT EXISTS "MissionApplication_accountId_status_createdAt_idx" ON "MissionApplication"("accountId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MissionApplication_campaignId_status_createdAt_idx" ON "MissionApplication"("campaignId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MissionApplication_status_createdAt_idx" ON "MissionApplication"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorMission_submissionId_key" ON "CreatorMission"("submissionId");
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorMission_missionApplicationId_key" ON "CreatorMission"("missionApplicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorMission_missionId_accountId_key" ON "CreatorMission"("missionId", "accountId");
CREATE INDEX IF NOT EXISTS "CreatorMission_accountId_status_createdAt_idx" ON "CreatorMission"("accountId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "CreatorMission_campaignId_status_createdAt_idx" ON "CreatorMission"("campaignId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_missionId_fkey') THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_missionId_fkey"
      FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_campaignId_fkey') THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_accountId_fkey') THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_reviewedById_fkey') THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_missionId_fkey') THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_missionId_fkey"
      FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_campaignId_fkey') THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_accountId_fkey') THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_submissionId_fkey') THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "MissionSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_missionApplicationId_fkey') THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_missionApplicationId_fkey"
      FOREIGN KEY ("missionApplicationId") REFERENCES "MissionApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
