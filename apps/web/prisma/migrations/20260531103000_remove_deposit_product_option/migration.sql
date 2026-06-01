-- Remove deprecated ProductReceiveOption: DEPOSIT_PRODUCT
-- 1) Normalize existing data to NO_PRODUCT_REQUIRED
UPDATE "Mission"
SET "productReceiveOption" = 'NO_PRODUCT_REQUIRED'
WHERE "productReceiveOption" = 'DEPOSIT_PRODUCT';

UPDATE "CreatorMission"
SET
  "productReceiveOption" = 'NO_PRODUCT_REQUIRED',
  "productStatus" = 'NOT_REQUIRED',
  "depositStatus" = 'NOT_REQUIRED'
WHERE "productReceiveOption" = 'DEPOSIT_PRODUCT';

-- 2) Recreate enum without DEPOSIT_PRODUCT
ALTER TABLE "Mission" DROP CONSTRAINT IF EXISTS "Mission_product_receive_option_link_check";
ALTER TABLE "Mission" DROP CONSTRAINT IF EXISTS "Mission_creator_audience_receive_option_check";

ALTER TYPE "ProductReceiveOption" RENAME TO "ProductReceiveOption_old";

CREATE TYPE "ProductReceiveOption" AS ENUM ('CREATOR_BUY_FIRST', 'NO_PRODUCT_REQUIRED');

ALTER TABLE "Mission"
  ALTER COLUMN "productReceiveOption" DROP DEFAULT;

ALTER TABLE "CreatorMission"
  ALTER COLUMN "productReceiveOption" DROP DEFAULT;

ALTER TABLE "Mission"
  ALTER COLUMN "productReceiveOption" TYPE "ProductReceiveOption"
  USING ("productReceiveOption"::text::"ProductReceiveOption");

ALTER TABLE "CreatorMission"
  ALTER COLUMN "productReceiveOption" TYPE "ProductReceiveOption"
  USING ("productReceiveOption"::text::"ProductReceiveOption");

ALTER TABLE "Mission"
  ALTER COLUMN "productReceiveOption" SET DEFAULT 'NO_PRODUCT_REQUIRED';

ALTER TABLE "CreatorMission"
  ALTER COLUMN "productReceiveOption" SET DEFAULT 'NO_PRODUCT_REQUIRED';

DROP TYPE "ProductReceiveOption_old";

ALTER TABLE "Mission"
  ADD CONSTRAINT "Mission_product_receive_option_link_check"
  CHECK (
    ("productReceiveOption" <> 'NO_PRODUCT_REQUIRED'::"ProductReceiveOption" OR "productLink" IS NULL)
    AND
    ("productReceiveOption" <> 'CREATOR_BUY_FIRST'::"ProductReceiveOption" OR "productLink" IS NOT NULL)
  );

ALTER TABLE "Mission"
  ADD CONSTRAINT "Mission_creator_audience_receive_option_check"
  CHECK (
    "audience" <> 'CREATOR'::"MissionAudience"
    OR "productReceiveOption" IN ('CREATOR_BUY_FIRST'::"ProductReceiveOption", 'NO_PRODUCT_REQUIRED'::"ProductReceiveOption")
  );
