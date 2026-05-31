-- Remove primary/secondary channel concept; all channels are peers.
ALTER TABLE "CreatorSocialLink"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "CreatorSocialLink"
SET "isActive" = COALESCE("isPrimary", true)
WHERE "isActive" IS DISTINCT FROM COALESCE("isPrimary", true);

DROP INDEX IF EXISTS "CreatorSocialLink_creatorProfileId_isPrimary_idx";
CREATE INDEX IF NOT EXISTS "CreatorSocialLink_creatorProfileId_isActive_idx"
  ON "CreatorSocialLink"("creatorProfileId", "isActive");
