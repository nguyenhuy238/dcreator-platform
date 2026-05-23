-- B2 Brand product and inventory batch storage.

CREATE TYPE "FulfillmentType" AS ENUM ('NONE_WAREHOUSE', 'BRAND_FULFILLMENT');

CREATE TYPE "OpsReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "BrandProduct" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "stockQty" INTEGER NOT NULL DEFAULT 0,
  "voucherStock" INTEGER NOT NULL DEFAULT 0,
  "campaignEligibility" BOOLEAN NOT NULL DEFAULT true,
  "suggestedPriceVnd" INTEGER NOT NULL DEFAULT 0,
  "costPriceVnd" INTEGER NOT NULL DEFAULT 0,
  "priceVnd" INTEGER NOT NULL DEFAULT 0,
  "pricePoints" INTEGER NOT NULL DEFAULT 0,
  "returnPolicy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrandProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandInventoryBatch" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "expiryDate" TIMESTAMP(3),
  "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'BRAND_FULFILLMENT',
  "opsStatus" "OpsReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "appraisedValueVnd" INTEGER NOT NULL DEFAULT 0,
  "viableMarginPercent" INTEGER NOT NULL DEFAULT 0,
  "opsNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrandInventoryBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandProduct_brandId_sku_key" ON "BrandProduct"("brandId", "sku");
CREATE INDEX "BrandProduct_brandId_createdAt_idx" ON "BrandProduct"("brandId", "createdAt");
CREATE INDEX "BrandProduct_campaignEligibility_idx" ON "BrandProduct"("campaignEligibility");
CREATE INDEX "BrandInventoryBatch_productId_createdAt_idx" ON "BrandInventoryBatch"("productId", "createdAt");
CREATE INDEX "BrandInventoryBatch_opsStatus_idx" ON "BrandInventoryBatch"("opsStatus");

ALTER TABLE "BrandProduct"
  ADD CONSTRAINT "BrandProduct_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandInventoryBatch"
  ADD CONSTRAINT "BrandInventoryBatch_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "BrandProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
