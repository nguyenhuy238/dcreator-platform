-- Improve /api/campaigns list performance for common filters/sorts.
CREATE INDEX IF NOT EXISTS "Campaign_isPublic_status_updatedAt_idx"
  ON "Campaign"("isPublic", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "Campaign_isPublic_status_createdAt_idx"
  ON "Campaign"("isPublic", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Campaign_isPublic_status_endsAt_idx"
  ON "Campaign"("isPublic", "status", "endsAt");

CREATE INDEX IF NOT EXISTS "Campaign_isPublic_status_fundedAmountVnd_idx"
  ON "Campaign"("isPublic", "status", "fundedAmountVnd");

CREATE INDEX IF NOT EXISTS "Campaign_isPublic_status_backerCount_idx"
  ON "Campaign"("isPublic", "status", "backerCount");
