ALTER TABLE "AdminSetting"
  ADD COLUMN IF NOT EXISTS "creatorDepositQrImageUrl" TEXT NOT NULL DEFAULT '/qr-dcreator.jpg',
  ADD COLUMN IF NOT EXISTS "creatorDepositAccountName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "creatorDepositAccountNumber" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "creatorDepositBankName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "creatorDepositTransferPrefix" TEXT NOT NULL DEFAULT 'DCR';
