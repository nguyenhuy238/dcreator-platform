-- Extend enums
ALTER TYPE "BrandStatus" ADD VALUE IF NOT EXISTS 'LOCKED';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "RiskFlagStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED');

-- CreatorProfile lifecycle
ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "unsuspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "unsuspendedReason" TEXT;

-- Brand lifecycle
ALTER TABLE "Brand"
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockReason" TEXT,
  ADD COLUMN IF NOT EXISTS "unlockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "unlockReason" TEXT;

-- Campaign lifecycle
ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "movedToAuditAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "movedToAuditById" TEXT,
  ADD COLUMN IF NOT EXISTS "pausedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "resumedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "forceClosedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "forceCloseReason" TEXT;

-- Proof reward hold lifecycle
ALTER TABLE "MissionSubmission"
  ADD COLUMN IF NOT EXISTS "rewardHold" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rewardHoldReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rewardHeldAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rewardHeldById" TEXT,
  ADD COLUMN IF NOT EXISTS "rewardReleasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rewardReleasedById" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeStatus" TEXT;

-- Risk flag lifecycle
ALTER TABLE "RiskFlag"
  ADD COLUMN IF NOT EXISTS "flagType" TEXT,
  ADD COLUMN IF NOT EXISTS "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "status" "RiskFlagStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Internal notes
CREATE TABLE IF NOT EXISTS "InternalNote" (
  "id" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InternalNote_targetType_targetId_createdAt_idx" ON "InternalNote"("targetType", "targetId", "createdAt");
CREATE INDEX IF NOT EXISTS "InternalNote_actorId_createdAt_idx" ON "InternalNote"("actorId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InternalNote_actorId_fkey'
  ) THEN
    ALTER TABLE "InternalNote"
      ADD CONSTRAINT "InternalNote_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- FK helpers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_movedToAuditById_fkey') THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_movedToAuditById_fkey"
      FOREIGN KEY ("movedToAuditById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionSubmission_rewardHeldById_fkey') THEN
    ALTER TABLE "MissionSubmission"
      ADD CONSTRAINT "MissionSubmission_rewardHeldById_fkey"
      FOREIGN KEY ("rewardHeldById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MissionSubmission_rewardReleasedById_fkey') THEN
    ALTER TABLE "MissionSubmission"
      ADD CONSTRAINT "MissionSubmission_rewardReleasedById_fkey"
      FOREIGN KEY ("rewardReleasedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RiskFlag_resolvedById_fkey') THEN
    ALTER TABLE "RiskFlag"
      ADD CONSTRAINT "RiskFlag_resolvedById_fkey"
      FOREIGN KEY ("resolvedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
