-- Add CreatorSocialLink table and allow CreatorProfile to be created before a main platform is approved.
ALTER TABLE "CreatorProfile"
  ALTER COLUMN "mainPlatform" DROP NOT NULL,
  ALTER COLUMN "socialUrl" DROP NOT NULL;

CREATE TABLE "CreatorSocialLink" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "socialUrl" TEXT NOT NULL,
  "followers" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "reviewStatus" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "rejectReason" TEXT,
  "reviewNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorSocialLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorSocialLink_creatorProfileId_platform_socialUrl_key"
  ON "CreatorSocialLink"("creatorProfileId", "platform", "socialUrl");

CREATE INDEX "CreatorSocialLink_creatorProfileId_createdAt_idx"
  ON "CreatorSocialLink"("creatorProfileId", "createdAt");

CREATE INDEX "CreatorSocialLink_active_reviewStatus_createdAt_idx"
  ON "CreatorSocialLink"("active", "reviewStatus", "createdAt");

ALTER TABLE "CreatorSocialLink"
  ADD CONSTRAINT "CreatorSocialLink_creatorProfileId_fkey"
    FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorSocialLink"
  ADD CONSTRAINT "CreatorSocialLink_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
