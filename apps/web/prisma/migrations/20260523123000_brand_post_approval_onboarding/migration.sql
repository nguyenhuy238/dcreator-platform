-- Post-approval Brand onboarding details completed from Brand Dashboard.
ALTER TABLE "Brand"
  ADD COLUMN "productCategories" TEXT,
  ADD COLUMN "inventoryDescription" TEXT;
