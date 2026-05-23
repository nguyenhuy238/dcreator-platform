-- B1 Brand onboarding: store structured BCC agreement and commercial terms.
ALTER TABLE "BrandApplication"
  ADD COLUMN "revenueSharePercent" INTEGER,
  ADD COLUMN "commissionRatePercent" INTEGER,
  ADD COLUMN "bccAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bccAgreementVersion" TEXT,
  ADD COLUMN "legalResponsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contractFileUrl" TEXT,
  ADD COLUMN "contractSignedAt" TIMESTAMP(3);

ALTER TABLE "Brand"
  ADD COLUMN "revenueSharePercent" INTEGER,
  ADD COLUMN "commissionRatePercent" INTEGER,
  ADD COLUMN "bccAgreementVersion" TEXT,
  ADD COLUMN "legalResponsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contractFileUrl" TEXT,
  ADD COLUMN "contractSignedAt" TIMESTAMP(3);
