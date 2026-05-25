-- Brand subscription package status + purchase persistence

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BrandSubscriptionPackageCode') THEN
    CREATE TYPE "BrandSubscriptionPackageCode" AS ENUM ('FREE', 'UGC_15_VIDEO', 'UGC_50_VIDEO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BrandSubscription" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "packageCode" "BrandSubscriptionPackageCode" NOT NULL DEFAULT 'FREE',
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BrandSubscription_brandId_key" ON "BrandSubscription"("brandId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BrandSubscription_brandId_fkey') THEN
    ALTER TABLE "BrandSubscription"
      ADD CONSTRAINT "BrandSubscription_brandId_fkey"
      FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
