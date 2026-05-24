-- CreateTable
CREATE TABLE "AccountSettings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "notifyReviewStatusEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyVoucherMissionEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSettings_accountId_key" ON "AccountSettings"("accountId");

-- CreateIndex
CREATE INDEX "AccountSettings_accountId_updatedAt_idx" ON "AccountSettings"("accountId", "updatedAt");

-- AddForeignKey
ALTER TABLE "AccountSettings" ADD CONSTRAINT "AccountSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
