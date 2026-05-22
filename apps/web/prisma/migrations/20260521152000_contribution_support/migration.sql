DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContributionStatus') THEN
    CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContributionPaymentMethod') THEN
    CREATE TYPE "ContributionPaymentMethod" AS ENUM ('N_POINTS', 'PAYOS');
  END IF;
END $$;

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "backerCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Contribution" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "supporterId" TEXT NOT NULL,
  "amountVnd" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contribution_campaignId_fkey') THEN
    ALTER TABLE "Contribution"
      ADD CONSTRAINT "Contribution_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contribution_supporterId_fkey') THEN
    ALTER TABLE "Contribution"
      ADD CONSTRAINT "Contribution_supporterId_fkey"
      FOREIGN KEY ("supporterId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Contribution"
  ADD COLUMN IF NOT EXISTS "rewardId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" "ContributionPaymentMethod" NOT NULL DEFAULT 'N_POINTS',
  ADD COLUMN IF NOT EXISTS "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentTransactionId" TEXT;

CREATE TABLE IF NOT EXISTS "RewardClaim" (
  "id" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "voucherCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Contribution_supporterId_idempotencyKey_key"
  ON "Contribution"("supporterId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardClaim_contributionId_key" ON "RewardClaim"("contributionId");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardClaim_voucherCode_key" ON "RewardClaim"("voucherCode");
CREATE INDEX IF NOT EXISTS "RewardClaim_accountId_createdAt_idx" ON "RewardClaim"("accountId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contribution_rewardId_fkey') THEN
    ALTER TABLE "Contribution"
      ADD CONSTRAINT "Contribution_rewardId_fkey"
      FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contribution_paymentTransactionId_fkey') THEN
    ALTER TABLE "Contribution"
      ADD CONSTRAINT "Contribution_paymentTransactionId_fkey"
      FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RewardClaim_rewardId_fkey') THEN
    ALTER TABLE "RewardClaim"
      ADD CONSTRAINT "RewardClaim_rewardId_fkey"
      FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RewardClaim_contributionId_fkey') THEN
    ALTER TABLE "RewardClaim"
      ADD CONSTRAINT "RewardClaim_contributionId_fkey"
      FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RewardClaim_accountId_fkey') THEN
    ALTER TABLE "RewardClaim"
      ADD CONSTRAINT "RewardClaim_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
