CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "ContributionPaymentMethod" AS ENUM ('N_POINTS', 'PAYOS');

ALTER TABLE "Campaign" ADD COLUMN "backerCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Contribution"
  ADD COLUMN "rewardId" TEXT,
  ADD COLUMN "paymentMethod" "ContributionPaymentMethod" NOT NULL DEFAULT 'N_POINTS',
  ADD COLUMN "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "paymentTransactionId" TEXT;

CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "voucherCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contribution_supporterId_idempotencyKey_key" ON "Contribution"("supporterId", "idempotencyKey");
CREATE UNIQUE INDEX "RewardClaim_contributionId_key" ON "RewardClaim"("contributionId");
CREATE UNIQUE INDEX "RewardClaim_voucherCode_key" ON "RewardClaim"("voucherCode");
CREATE INDEX "RewardClaim_accountId_createdAt_idx" ON "RewardClaim"("accountId", "createdAt");

ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
