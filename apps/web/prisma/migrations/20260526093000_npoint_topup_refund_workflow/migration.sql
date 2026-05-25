-- N-Point topup + refund review workflow for Brand/Admin

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NPointTopupRequestStatus') THEN
    CREATE TYPE "NPointTopupRequestStatus" AS ENUM (
      'PENDING_ADMIN_REVIEW',
      'APPROVED',
      'REJECTED',
      'REFUND_INFO_SUBMITTED',
      'REFUND_COMPLETED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "NPointTopupRequest" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "requesterAccountId" TEXT NOT NULL,
  "amountVnd" INTEGER NOT NULL,
  "requestedPoints" INTEGER NOT NULL,
  "transferNote" TEXT NOT NULL,
  "bankTransferProofUrl" TEXT NOT NULL,
  "status" "NPointTopupRequestStatus" NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
  "adminDecisionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "walletTransactionId" TEXT,
  "refundBankName" TEXT,
  "refundAccountName" TEXT,
  "refundAccountNumber" TEXT,
  "refundRequestNote" TEXT,
  "refundSubmittedAt" TIMESTAMP(3),
  "refundProofUrl" TEXT,
  "refundProcessedNote" TEXT,
  "refundProcessedById" TEXT,
  "refundProcessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NPointTopupRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NPointTopupRequest_walletTransactionId_key" ON "NPointTopupRequest"("walletTransactionId");
CREATE INDEX IF NOT EXISTS "NPointTopupRequest_brandId_status_createdAt_idx" ON "NPointTopupRequest"("brandId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "NPointTopupRequest_requesterAccountId_createdAt_idx" ON "NPointTopupRequest"("requesterAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "NPointTopupRequest_status_updatedAt_idx" ON "NPointTopupRequest"("status", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NPointTopupRequest_brandId_fkey') THEN
    ALTER TABLE "NPointTopupRequest"
      ADD CONSTRAINT "NPointTopupRequest_brandId_fkey"
      FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NPointTopupRequest_requesterAccountId_fkey') THEN
    ALTER TABLE "NPointTopupRequest"
      ADD CONSTRAINT "NPointTopupRequest_requesterAccountId_fkey"
      FOREIGN KEY ("requesterAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NPointTopupRequest_reviewedById_fkey') THEN
    ALTER TABLE "NPointTopupRequest"
      ADD CONSTRAINT "NPointTopupRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NPointTopupRequest_refundProcessedById_fkey') THEN
    ALTER TABLE "NPointTopupRequest"
      ADD CONSTRAINT "NPointTopupRequest_refundProcessedById_fkey"
      FOREIGN KEY ("refundProcessedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NPointTopupRequest_walletTransactionId_fkey') THEN
    ALTER TABLE "NPointTopupRequest"
      ADD CONSTRAINT "NPointTopupRequest_walletTransactionId_fkey"
      FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;