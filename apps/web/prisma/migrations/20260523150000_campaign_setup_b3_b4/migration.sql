-- B3/B4 campaign setup, feasibility review and Brand approval.

CREATE TYPE "CampaignSetupSource" AS ENUM ('JOIN_EXISTING_DCREATOR_CAMP', 'BRAND_REQUESTED');

CREATE TYPE "CampaignFeasibilityStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'NEEDS_ADJUSTMENT', 'REJECTED');

CREATE TYPE "BrandCampaignApprovalStatus" AS ENUM ('DRAFT', 'WAITING_DCREATOR_REVIEW', 'WAITING_BRAND_APPROVAL', 'APPROVED', 'CHANGE_REQUESTED');

ALTER TABLE "Campaign"
  ADD COLUMN "setupSource" "CampaignSetupSource" NOT NULL DEFAULT 'BRAND_REQUESTED',
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "priorityChannels" TEXT,
  ADD COLUMN "missionTypes" TEXT,
  ADD COLUMN "creatorCommissionPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "userCommissionPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bonusBudgetVnd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "feasibilityStatus" "CampaignFeasibilityStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "feasibilityNote" TEXT,
  ADD COLUMN "brandApprovalStatus" "BrandCampaignApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "brandFeedback" TEXT;

CREATE INDEX "Campaign_feasibilityStatus_idx" ON "Campaign"("feasibilityStatus");
CREATE INDEX "Campaign_brandApprovalStatus_idx" ON "Campaign"("brandApprovalStatus");
