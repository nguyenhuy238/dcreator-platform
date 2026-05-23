-- CreateEnum
CREATE TYPE "ProductReceiveOption" AS ENUM ('DEPOSIT_PRODUCT', 'CREATOR_BUY_FIRST', 'NO_PRODUCT_REQUIRED');

-- CreateEnum
CREATE TYPE "CreatorMissionStatus" AS ENUM ('PRODUCT_PENDING', 'DRAFT_PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('NOT_REQUIRED', 'WAITING_DEPOSIT', 'WAITING_PURCHASE', 'RECEIVED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PURCHASE_SUBMITTED', 'APPROVED', 'PAYOUT_PENDING', 'PAID', 'REJECTED');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "productReceiveOption" "ProductReceiveOption" NOT NULL DEFAULT 'NO_PRODUCT_REQUIRED';

-- CreateTable
CREATE TABLE "CreatorMission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "applicationId" TEXT,
    "status" "CreatorMissionStatus" NOT NULL,
    "productReceiveOption" "ProductReceiveOption" NOT NULL,
    "productStatus" "ProductStatus" NOT NULL,
    "depositStatus" "DepositStatus" NOT NULL,
    "reimbursementStatus" "ReimbursementStatus" NOT NULL,
    "purchaseProofTextNote" TEXT,
    "purchaseProofScreenshotUrl" TEXT,
    "purchaseProofNote" TEXT,
    "purchaseProofSubmittedAt" TIMESTAMP(3),
    "purchaseProofReviewedAt" TIMESTAMP(3),
    "purchaseProofRejectReason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorMission_applicationId_key" ON "CreatorMission"("applicationId");

-- CreateIndex
CREATE INDEX "CreatorMission_accountId_status_createdAt_idx" ON "CreatorMission"("accountId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorMission_campaignId_status_createdAt_idx" ON "CreatorMission"("campaignId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorMission_missionId_accountId_key" ON "CreatorMission"("missionId", "accountId");

-- AddForeignKey
ALTER TABLE "CreatorMission" ADD CONSTRAINT "CreatorMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorMission" ADD CONSTRAINT "CreatorMission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorMission" ADD CONSTRAINT "CreatorMission_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorMission" ADD CONSTRAINT "CreatorMission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MissionSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
