ALTER TABLE "Wallet"
ADD COLUMN "pendingPayoutVnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "withdrawnPayoutVnd" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CreatorBankAccount" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountHolderName" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreatorBankAccount_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PayoutRequest"
ADD COLUMN "creatorBankAccountId" TEXT,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "bankAccountName" TEXT,
ADD COLUMN "bankAccountNumber" TEXT;

INSERT INTO "CreatorBankAccount" (
  "id",
  "accountId",
  "bankName",
  "accountNumber",
  "accountHolderName",
  "isDefault",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_bank_' || md5(pr."accountId" || ':' || COALESCE(cp."bankName", 'Chua cau hinh') || ':' || COALESCE(cp."bankAccountNumber", pr."accountId")),
  pr."accountId",
  COALESCE(NULLIF(cp."bankName", ''), 'Chưa cấu hình'),
  COALESCE(NULLIF(cp."bankAccountNumber", ''), pr."accountId"),
  COALESCE(NULLIF(cp."bankAccountName", ''), 'Chưa cấu hình'),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PayoutRequest" pr
LEFT JOIN "CreatorProfile" cp ON cp."accountId" = pr."accountId"
GROUP BY pr."accountId", cp."bankName", cp."bankAccountNumber", cp."bankAccountName";

UPDATE "PayoutRequest" pr
SET
  "creatorBankAccountId" = cba."id",
  "bankName" = cba."bankName",
  "bankAccountName" = cba."accountHolderName",
  "bankAccountNumber" = cba."accountNumber"
FROM "CreatorBankAccount" cba
WHERE cba."accountId" = pr."accountId"
  AND pr."creatorBankAccountId" IS NULL;

UPDATE "Wallet" w
SET
  "pendingPayoutVnd" = COALESCE(pending_totals."amount", 0),
  "withdrawnPayoutVnd" = COALESCE(paid_totals."amount", 0)
FROM (
  SELECT "walletId", SUM("amountVnd")::INTEGER AS "amount"
  FROM "PayoutRequest"
  WHERE "status" IN ('PENDING', 'APPROVED')
  GROUP BY "walletId"
) pending_totals
FULL JOIN (
  SELECT "walletId", SUM("amountVnd")::INTEGER AS "amount"
  FROM "PayoutRequest"
  WHERE "status" = 'PAID'
  GROUP BY "walletId"
) paid_totals
ON paid_totals."walletId" = pending_totals."walletId"
WHERE w."id" = COALESCE(pending_totals."walletId", paid_totals."walletId");

ALTER TABLE "PayoutRequest"
ALTER COLUMN "creatorBankAccountId" SET NOT NULL,
ALTER COLUMN "bankName" SET NOT NULL,
ALTER COLUMN "bankAccountName" SET NOT NULL,
ALTER COLUMN "bankAccountNumber" SET NOT NULL;

CREATE UNIQUE INDEX "CreatorBankAccount_accountId_accountNumber_key" ON "CreatorBankAccount"("accountId", "accountNumber");
CREATE INDEX "CreatorBankAccount_accountId_isDefault_idx" ON "CreatorBankAccount"("accountId", "isDefault");
CREATE INDEX "CreatorBankAccount_accountId_createdAt_idx" ON "CreatorBankAccount"("accountId", "createdAt");
CREATE INDEX "PayoutRequest_creatorBankAccountId_createdAt_idx" ON "PayoutRequest"("creatorBankAccountId", "createdAt");

ALTER TABLE "CreatorBankAccount"
ADD CONSTRAINT "CreatorBankAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutRequest"
ADD CONSTRAINT "PayoutRequest_creatorBankAccountId_fkey" FOREIGN KEY ("creatorBankAccountId") REFERENCES "CreatorBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
