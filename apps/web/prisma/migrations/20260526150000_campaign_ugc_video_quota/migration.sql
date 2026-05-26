-- Persist UGC video quota snapshot per campaign

ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "ugcVideoQuota" INTEGER,
  ADD COLUMN IF NOT EXISTS "ugcVideoApprovedCount" INTEGER NOT NULL DEFAULT 0;