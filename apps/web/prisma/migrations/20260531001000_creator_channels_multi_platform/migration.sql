DO $$ BEGIN
  ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS 'SHOPEE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CreatorChannelVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "CreatorSocialLink"
  ADD COLUMN IF NOT EXISTS "handle" TEXT,
  ADD COLUMN IF NOT EXISTS "engagementRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verificationStatus" "CreatorChannelVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorSocialLink_creatorProfileId_platform_handle_key"
  ON "CreatorSocialLink"("creatorProfileId", "platform", "handle");

CREATE INDEX IF NOT EXISTS "CreatorSocialLink_creatorProfileId_isPrimary_idx"
  ON "CreatorSocialLink"("creatorProfileId", "isPrimary");

UPDATE "CreatorSocialLink"
SET "verificationStatus" = CASE
  WHEN "status" = 'APPROVED' THEN 'VERIFIED'::"CreatorChannelVerificationStatus"
  WHEN "status" = 'PENDING' THEN 'PENDING'::"CreatorChannelVerificationStatus"
  WHEN "status" = 'REJECTED' THEN 'REJECTED'::"CreatorChannelVerificationStatus"
  ELSE 'UNVERIFIED'::"CreatorChannelVerificationStatus"
END
WHERE "verificationStatus" = 'UNVERIFIED';

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "creatorProfileId" ORDER BY "createdAt" ASC) AS rn
  FROM "CreatorSocialLink"
)
UPDATE "CreatorSocialLink" c
SET "isPrimary" = true
FROM ranked r
WHERE c."id" = r."id" AND r.rn = 1;
