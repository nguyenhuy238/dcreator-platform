ALTER TABLE "Campaign"
  ADD COLUMN "requiredHashtags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
