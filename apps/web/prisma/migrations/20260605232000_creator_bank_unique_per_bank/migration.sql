DROP INDEX "CreatorBankAccount_accountId_accountNumber_key";

CREATE UNIQUE INDEX "CreatorBankAccount_accountId_bankCode_accountNumber_key"
ON "CreatorBankAccount"("accountId", "bankCode", "accountNumber");
