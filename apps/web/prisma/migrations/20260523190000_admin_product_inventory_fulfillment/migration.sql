-- CreateEnum
CREATE TYPE "ProductReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "InventoryStockStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'FAILED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ProductSubmission" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "unitPriceVnd" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "ProductReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "productSubmissionId" TEXT NOT NULL,
    "batchCode" TEXT,
    "quantityTotal" INTEGER NOT NULL,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityRemaining" INTEGER NOT NULL,
    "stockStatus" "InventoryStockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentOrder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "inventoryBatchId" TEXT,
    "creatorAccountId" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "shippingAddress" TEXT,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FulfillmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSubmission_brandId_reviewStatus_createdAt_idx" ON "ProductSubmission"("brandId", "reviewStatus", "createdAt");
CREATE INDEX "ProductSubmission_campaignId_reviewStatus_createdAt_idx" ON "ProductSubmission"("campaignId", "reviewStatus", "createdAt");
CREATE INDEX "InventoryBatch_productSubmissionId_stockStatus_createdAt_idx" ON "InventoryBatch"("productSubmissionId", "stockStatus", "createdAt");
CREATE INDEX "FulfillmentOrder_status_createdAt_idx" ON "FulfillmentOrder"("status", "createdAt");
CREATE INDEX "FulfillmentOrder_campaignId_status_createdAt_idx" ON "FulfillmentOrder"("campaignId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductSubmission" ADD CONSTRAINT "ProductSubmission_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSubmission" ADD CONSTRAINT "ProductSubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductSubmission" ADD CONSTRAINT "ProductSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_productSubmissionId_fkey" FOREIGN KEY ("productSubmissionId") REFERENCES "ProductSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_creatorAccountId_fkey" FOREIGN KEY ("creatorAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
