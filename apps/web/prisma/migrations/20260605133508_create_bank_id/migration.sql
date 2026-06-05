/*
  Warnings:

  - You are about to drop the column `isPrimary` on the `CreatorSocialLink` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_movedToAuditById_fkey";

-- DropForeignKey
ALTER TABLE "MissionSubmission" DROP CONSTRAINT "MissionSubmission_rewardHeldById_fkey";

-- DropForeignKey
ALTER TABLE "MissionSubmission" DROP CONSTRAINT "MissionSubmission_rewardReleasedById_fkey";

-- AlterTable
ALTER TABLE "BrandSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'CreatorBankAccount'
  ) THEN
    ALTER TABLE "CreatorBankAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "CreatorMission" ALTER COLUMN "productReceiveOption" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CreatorSocialLink" DROP COLUMN "isPrimary";

-- AlterTable
ALTER TABLE "InternalNote" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NPointTopupRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RiskFlag" ALTER COLUMN "updatedAt" DROP DEFAULT;
