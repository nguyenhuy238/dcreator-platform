DO $$ BEGIN
  ALTER TYPE "BrandMemberRole" ADD VALUE IF NOT EXISTS 'MANAGER';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BrandMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "BrandMember"
  ADD COLUMN IF NOT EXISTS "status" "BrandMemberStatus" NOT NULL DEFAULT 'ACTIVE';

DROP INDEX IF EXISTS "BrandMember_accountId_role_idx";
CREATE INDEX IF NOT EXISTS "BrandMember_accountId_role_status_idx" ON "BrandMember"("accountId", "role", "status");

INSERT INTO "BrandMember" ("id", "brandId", "accountId", "role", "status", "createdAt", "updatedAt")
SELECT CONCAT('bm_', md5(random()::text || clock_timestamp()::text || b."id")), b."id", b."ownerAccountId", 'OWNER'::"BrandMemberRole", 'ACTIVE'::"BrandMemberStatus", NOW(), NOW()
FROM "Brand" b
LEFT JOIN "BrandMember" bm
  ON bm."brandId" = b."id" AND bm."accountId" = b."ownerAccountId"
WHERE bm."id" IS NULL;
