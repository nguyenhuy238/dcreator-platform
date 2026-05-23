-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "reviewSlaHours" INTEGER NOT NULL DEFAULT 24,
    "payoutAutoThresholdVnd" INTEGER NOT NULL DEFAULT 5000000,
    "fraudScoreThreshold" INTEGER NOT NULL DEFAULT 70,
    "requireRejectReason" BOOLEAN NOT NULL DEFAULT true,
    "requireRequestChangesReason" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_scope_key" ON "AdminSetting"("scope");
