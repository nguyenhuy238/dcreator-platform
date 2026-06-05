ALTER TABLE "Campaign"
ADD COLUMN "creatorBriefTitle" TEXT,
ADD COLUMN "creatorBriefDescription" TEXT,
ADD COLUMN "productName" TEXT,
ADD COLUMN "productLink" TEXT,
ADD COLUMN "productImageUrl" TEXT,
ADD COLUMN "productDescription" TEXT;

ALTER TABLE "CreatorMission"
ALTER COLUMN "missionId" DROP NOT NULL;
