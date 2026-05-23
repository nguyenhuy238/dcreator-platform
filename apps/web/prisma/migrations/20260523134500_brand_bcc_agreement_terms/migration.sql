-- Add BCC agreement terms storage to brand onboarding.
ALTER TABLE "Brand" ADD COLUMN "bccAgreementTerms" TEXT;
ALTER TABLE "BrandApplication" ADD COLUMN "bccAgreementTerms" TEXT;
