-- CreateEnum
CREATE TYPE "AnalyticsEventName" AS ENUM (
  'campaign_view',
  'campaign_cta_click',
  'campaign_support_started',
  'campaign_contribution_success',
  'reward_selected',
  'voucher_issued',
  'voucher_redeemed',
  'mission_accept',
  'mission_submit',
  'proof_approved',
  'proof_rejected',
  'creator_apply_job',
  'brand_create_campaign',
  'payment_success',
  'payment_failed'
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "eventName" "AnalyticsEventName" NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT NOT NULL,
  "campaignId" TEXT,
  "brandId" TEXT,
  "creatorId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");
CREATE INDEX "AnalyticsEvent_campaignId_createdAt_idx" ON "AnalyticsEvent"("campaignId", "createdAt");
CREATE INDEX "AnalyticsEvent_brandId_createdAt_idx" ON "AnalyticsEvent"("brandId", "createdAt");
CREATE INDEX "AnalyticsEvent_creatorId_createdAt_idx" ON "AnalyticsEvent"("creatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
