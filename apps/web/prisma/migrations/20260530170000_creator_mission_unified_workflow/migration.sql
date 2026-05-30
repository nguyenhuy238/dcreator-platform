ALTER TABLE "CreatorMission"
  ADD COLUMN IF NOT EXISTS "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN IF NOT EXISTS "applicationNote" TEXT,
  ADD COLUMN IF NOT EXISTS "applicationRejectReason" TEXT,
  ADD COLUMN IF NOT EXISTS "applicationReviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "applicationReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "submissionLifecycleStatus" "MissionLifecycleStatus" NOT NULL DEFAULT 'ACCEPTED',
  ADD COLUMN IF NOT EXISTS "submissionStatus" "MissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN IF NOT EXISTS "submissionVideoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionSocialPostUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionScreenshotUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFileUploadUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionProofTextNote" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionRejectReason" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionPurchaseBillImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionProductReviewScreenshotUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionPurchaseProofNote" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionPurchaseConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionPublicVideoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionAdCode" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFinalProofNote" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionFinalSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionRewardGrantedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionReviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionReviewedAt" TIMESTAMP(3);

UPDATE "CreatorMission" cm
SET
  "missionApplicationId" = COALESCE(cm."missionApplicationId", ma."id"),
  "applicationStatus" = ma."status",
  "applicationNote" = ma."note",
  "applicationRejectReason" = ma."rejectReason",
  "applicationReviewedById" = ma."reviewedById",
  "applicationReviewedAt" = ma."reviewedAt",
  "appliedAt" = COALESCE(ma."createdAt", cm."appliedAt")
FROM "MissionApplication" ma
WHERE ma."missionId" = cm."missionId"
  AND ma."accountId" = cm."accountId";

UPDATE "CreatorMission" cm
SET
  "submissionId" = COALESCE(cm."submissionId", ms."id"),
  "submissionLifecycleStatus" = ms."lifecycleStatus",
  "submissionStatus" = ms."status",
  "submissionVideoUrl" = ms."videoUrl",
  "submissionImageUrl" = ms."imageUrl",
  "submissionSocialPostUrl" = ms."socialPostUrl",
  "submissionScreenshotUrl" = ms."screenshotUrl",
  "submissionFileUploadUrl" = ms."fileUploadUrl",
  "submissionProofTextNote" = ms."proofTextNote",
  "submissionNote" = ms."note",
  "submissionRejectReason" = ms."rejectReason",
  "submissionPurchaseBillImageUrl" = ms."purchaseBillImageUrl",
  "submissionProductReviewScreenshotUrl" = ms."productReviewScreenshotUrl",
  "submissionPurchaseProofNote" = ms."purchaseProofNote",
  "submissionPurchaseConfirmedAt" = ms."purchaseConfirmedAt",
  "submissionPublicVideoUrl" = ms."publicVideoUrl",
  "submissionAdCode" = ms."adCode",
  "submissionFinalProofNote" = ms."finalProofNote",
  "submissionFinalSubmittedAt" = ms."finalSubmittedAt",
  "submissionApprovedAt" = ms."approvedAt",
  "submissionRewardGrantedAt" = ms."rewardGrantedAt",
  "submissionReviewedById" = ms."reviewedById",
  "submissionReviewedAt" = ms."reviewedAt"
FROM "MissionSubmission" ms
WHERE (cm."submissionId" IS NOT NULL AND ms."id" = cm."submissionId")
   OR (ms."missionId" = cm."missionId" AND ms."accountId" = cm."accountId");

CREATE INDEX IF NOT EXISTS "CreatorMission_applicationStatus_appliedAt_idx"
  ON "CreatorMission"("applicationStatus", "appliedAt");

CREATE INDEX IF NOT EXISTS "CreatorMission_submissionStatus_updatedAt_idx"
  ON "CreatorMission"("submissionStatus", "updatedAt");
