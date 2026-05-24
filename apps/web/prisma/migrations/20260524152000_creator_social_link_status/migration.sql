DO $$
BEGIN
  CREATE TYPE "CreatorSocialLinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CreatorSocialLink"
  ADD COLUMN IF NOT EXISTS "status" "CreatorSocialLinkStatus";

UPDATE "CreatorSocialLink"
SET "status" = CASE
  WHEN "active" = true OR "reviewStatus" = 'APPROVED' THEN 'APPROVED'::"CreatorSocialLinkStatus"
  WHEN "reviewStatus" = 'REJECTED' THEN 'REJECTED'::"CreatorSocialLinkStatus"
  ELSE 'PENDING'::"CreatorSocialLinkStatus"
END
WHERE "status" IS NULL;

ALTER TABLE "CreatorSocialLink"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP INDEX IF EXISTS "CreatorSocialLink_active_reviewStatus_createdAt_idx";
CREATE INDEX IF NOT EXISTS "CreatorSocialLink_status_createdAt_idx"
  ON "CreatorSocialLink"("status", "createdAt");

ALTER TABLE "CreatorSocialLink"
  DROP COLUMN IF EXISTS "active",
  DROP COLUMN IF EXISTS "reviewStatus";
