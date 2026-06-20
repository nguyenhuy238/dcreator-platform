-- Rename Brand subscription package codes to match updated UGC package quotas.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BrandSubscriptionPackageCode'
      AND e.enumlabel = 'UGC_15_VIDEO'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BrandSubscriptionPackageCode'
      AND e.enumlabel = 'UGC_20_VIDEO'
  ) THEN
    ALTER TYPE "BrandSubscriptionPackageCode" RENAME VALUE 'UGC_15_VIDEO' TO 'UGC_20_VIDEO';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BrandSubscriptionPackageCode'
      AND e.enumlabel = 'UGC_50_VIDEO'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BrandSubscriptionPackageCode'
      AND e.enumlabel = 'UGC_60_VIDEO'
  ) THEN
    ALTER TYPE "BrandSubscriptionPackageCode" RENAME VALUE 'UGC_50_VIDEO' TO 'UGC_60_VIDEO';
  END IF;
END $$;
