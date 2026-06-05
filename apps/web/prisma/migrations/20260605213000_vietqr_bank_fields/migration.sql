ALTER TABLE "CreatorBankAccount"
ADD COLUMN "bankCode" TEXT,
ADD COLUMN "bankBin" TEXT;

ALTER TABLE "PayoutRequest"
ADD COLUMN "bankCode" TEXT,
ADD COLUMN "bankBin" TEXT;
