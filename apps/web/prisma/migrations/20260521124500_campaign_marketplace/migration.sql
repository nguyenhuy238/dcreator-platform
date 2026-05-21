DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignType') THEN
    CREATE TYPE "CampaignType" AS ENUM ('DONATION', 'PREORDER', 'SPONSORSHIP', 'COMMUNITY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignCategory') THEN
    CREATE TYPE "CampaignCategory" AS ENUM ('TECH', 'FASHION', 'FOOD', 'BEAUTY', 'LIFESTYLE', 'EDUCATION');
  END IF;
END $$;

ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "creatorId" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "campaignType" "CampaignType" NOT NULL DEFAULT 'COMMUNITY',
  ADD COLUMN IF NOT EXISTS "category" "CampaignCategory" NOT NULL DEFAULT 'LIFESTYLE',
  ADD COLUMN IF NOT EXISTS "targetAmountVnd" INTEGER NOT NULL DEFAULT 10000000,
  ADD COLUMN IF NOT EXISTS "fundedAmountVnd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_creatorId_fkey'
  ) THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_creatorId_fkey"
      FOREIGN KEY ("creatorId") REFERENCES "Account"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Campaign_status_isPublic_createdAt_idx" ON "Campaign"("status", "isPublic", "createdAt");
CREATE INDEX IF NOT EXISTS "Campaign_campaignType_category_idx" ON "Campaign"("campaignType", "category");
