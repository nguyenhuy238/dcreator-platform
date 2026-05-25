ALTER TABLE "Campaign"
  ADD COLUMN "benefits" TEXT,
  ADD COLUMN "participationRoadmap" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "BrandCampaignRequest"
  ADD COLUMN "benefits" TEXT,
  ADD COLUMN "participationRoadmap" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

