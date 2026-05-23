-- Brand campaign request flow: Brand requests, Admin creates/publishes campaign.

CREATE TYPE "BrandCampaignRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

CREATE TABLE "BrandCampaignRequest" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "requestedSlug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "setupSource" "CampaignSetupSource" NOT NULL DEFAULT 'BRAND_REQUESTED',
  "objective" TEXT,
  "priorityChannels" TEXT,
  "missionTypes" TEXT,
  "creatorCommissionPercent" INTEGER NOT NULL DEFAULT 0,
  "userCommissionPercent" INTEGER NOT NULL DEFAULT 0,
  "bonusBudgetVnd" INTEGER NOT NULL DEFAULT 0,
  "budgetVnd" INTEGER NOT NULL,
  "targetAmountVnd" INTEGER NOT NULL DEFAULT 10000000,
  "campaignType" "CampaignType" NOT NULL DEFAULT 'COMMUNITY',
  "category" "CampaignCategory" NOT NULL DEFAULT 'LIFESTYLE',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "status" "BrandCampaignRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "adminNote" TEXT,
  "brandFeedback" TEXT,
  "createdCampaignId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrandCampaignRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandCampaignRequest_brandId_createdAt_idx" ON "BrandCampaignRequest"("brandId", "createdAt");
CREATE INDEX "BrandCampaignRequest_status_createdAt_idx" ON "BrandCampaignRequest"("status", "createdAt");
CREATE INDEX "BrandCampaignRequest_createdCampaignId_idx" ON "BrandCampaignRequest"("createdCampaignId");

ALTER TABLE "BrandCampaignRequest"
  ADD CONSTRAINT "BrandCampaignRequest_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandCampaignRequest"
  ADD CONSTRAINT "BrandCampaignRequest_createdCampaignId_fkey"
  FOREIGN KEY ("createdCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrandCampaignRequest"
  ADD CONSTRAINT "BrandCampaignRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
