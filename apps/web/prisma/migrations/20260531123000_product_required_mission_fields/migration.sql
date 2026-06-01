-- Rename product receive option and extend Mission product info fields
ALTER TABLE "Mission" DROP CONSTRAINT IF EXISTS "Mission_product_receive_option_link_check";
ALTER TABLE "Mission" DROP CONSTRAINT IF EXISTS "Mission_creator_audience_receive_option_check";

ALTER TYPE "ProductReceiveOption" RENAME TO "ProductReceiveOption_old";
CREATE TYPE "ProductReceiveOption" AS ENUM ('PRODUCT_REQUIRED', 'NO_PRODUCT_REQUIRED');

ALTER TABLE "Mission"
  ALTER COLUMN "productReceiveOption" DROP DEFAULT;
ALTER TABLE "CreatorMission"
  ALTER COLUMN "productReceiveOption" DROP DEFAULT;

ALTER TABLE "Mission"
  ALTER COLUMN "productReceiveOption" TYPE "ProductReceiveOption"
  USING (
    CASE
      WHEN "productReceiveOption"::text = 'CREATOR_BUY_FIRST' THEN 'PRODUCT_REQUIRED'
      ELSE 'NO_PRODUCT_REQUIRED'
    END::"ProductReceiveOption"
  );

ALTER TABLE "CreatorMission"
  ALTER COLUMN "productReceiveOption" TYPE "ProductReceiveOption"
  USING (
    CASE
      WHEN "productReceiveOption"::text = 'CREATOR_BUY_FIRST' THEN 'PRODUCT_REQUIRED'
      ELSE 'NO_PRODUCT_REQUIRED'
    END::"ProductReceiveOption"
  );

ALTER TABLE "Mission"
  ALTER COLUMN "productReceiveOption" SET DEFAULT 'NO_PRODUCT_REQUIRED';
ALTER TABLE "CreatorMission"
  ALTER COLUMN "productReceiveOption" SET DEFAULT 'NO_PRODUCT_REQUIRED';

DROP TYPE "ProductReceiveOption_old";

ALTER TABLE "Mission"
  ADD COLUMN IF NOT EXISTS "productName" TEXT,
  ADD COLUMN IF NOT EXISTS "productDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "productImageUrl" TEXT;

ALTER TABLE "Mission"
  ADD CONSTRAINT "Mission_product_required_fields_check"
  CHECK (
    (
      "productReceiveOption" = 'NO_PRODUCT_REQUIRED'::"ProductReceiveOption"
      AND "productName" IS NULL
      AND "productDescription" IS NULL
      AND "productImageUrl" IS NULL
      AND "productLink" IS NULL
    )
    OR
    (
      "productReceiveOption" = 'PRODUCT_REQUIRED'::"ProductReceiveOption"
      AND "productLink" IS NOT NULL
    )
  );
