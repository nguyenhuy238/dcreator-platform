-- P1D: nullable analytics mapping groundwork.
-- No backfill: legacy payouts/payments remain unmapped until explicit references exist.

ALTER TABLE "PaymentTransaction"
ADD COLUMN "intent" TEXT;

ALTER TABLE "PayoutRequest"
ADD COLUMN "creatorMissionId" TEXT,
ADD COLUMN "campaignId" TEXT,
ADD COLUMN "referenceType" TEXT,
ADD COLUMN "referenceId" TEXT;

ALTER TABLE "PayoutRequest"
ADD CONSTRAINT "PayoutRequest_creatorMissionId_fkey"
FOREIGN KEY ("creatorMissionId") REFERENCES "CreatorMission"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayoutRequest"
ADD CONSTRAINT "PayoutRequest_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PaymentTransaction_intent_idx" ON "PaymentTransaction"("intent");
CREATE INDEX "PayoutRequest_creatorMissionId_idx" ON "PayoutRequest"("creatorMissionId");
CREATE INDEX "PayoutRequest_campaignId_idx" ON "PayoutRequest"("campaignId");
CREATE INDEX "PayoutRequest_referenceType_referenceId_idx" ON "PayoutRequest"("referenceType", "referenceId");
