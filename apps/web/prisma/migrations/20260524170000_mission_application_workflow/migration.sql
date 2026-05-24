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

CREATE UNIQUE INDEX IF NOT EXISTS "MissionApplication_missionId_accountId_key"
  ON "MissionApplication"("missionId", "accountId");
CREATE INDEX IF NOT EXISTS "MissionApplication_accountId_status_createdAt_idx"
  ON "MissionApplication"("accountId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MissionApplication_campaignId_status_createdAt_idx"
  ON "MissionApplication"("campaignId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MissionApplication_status_createdAt_idx"
  ON "MissionApplication"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_missionId_fkey'
  ) THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_missionId_fkey"
      FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_campaignId_fkey'
  ) THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_accountId_fkey'
  ) THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MissionApplication_reviewedById_fkey'
  ) THEN
    ALTER TABLE "MissionApplication"
      ADD CONSTRAINT "MissionApplication_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "MissionSubmission"
  ADD COLUMN IF NOT EXISTS "purchaseBillImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "productReviewScreenshotUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseProofNote" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicVideoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "adCode" TEXT,
  ADD COLUMN IF NOT EXISTS "finalProofNote" TEXT,
  ADD COLUMN IF NOT EXISTS "finalSubmittedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CreatorMission'
      AND column_name = 'applicationId'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CreatorMission'
      AND column_name = 'submissionId'
  ) THEN
    ALTER TABLE "CreatorMission" RENAME COLUMN "applicationId" TO "submissionId";
  END IF;
END $$;

ALTER TABLE "CreatorMission"
  ADD COLUMN IF NOT EXISTS "missionApplicationId" TEXT,
  ADD COLUMN IF NOT EXISTS "reimbursementAmountVnd" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorMission_submissionId_key"
  ON "CreatorMission"("submissionId");
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorMission_missionApplicationId_key"
  ON "CreatorMission"("missionApplicationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_submissionId_fkey'
  ) THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "MissionSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreatorMission_missionApplicationId_fkey'
  ) THEN
    ALTER TABLE "CreatorMission"
      ADD CONSTRAINT "CreatorMission_missionApplicationId_fkey"
      FOREIGN KEY ("missionApplicationId") REFERENCES "MissionApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
