-- Manual migration for Notification module (standalone).
-- Apply with your DB migration workflow.

DO $$ BEGIN
  CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationEvent" AS ENUM (
    'USER_CONTRIBUTION_SUCCESS',
    'USER_RECEIVED_VOUCHER',
    'MISSION_ACCEPTED',
    'PROOF_SUBMITTED',
    'PROOF_APPROVED',
    'PROOF_REJECTED',
    'CREATOR_APPLICATION_APPROVED',
    'BRAND_APPLICATION_APPROVED',
    'CAMPAIGN_APPROVED',
    'CAMPAIGN_REJECTED',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'PAYOUT_REQUESTED',
    'PAYOUT_APPROVED',
    'PAYOUT_REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "NotificationChannel" RENAME VALUE 'SMS' TO 'PUSH';

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "event" "NotificationEvent" DEFAULT 'MISSION_ACCEPTED',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Notification"
SET "deliveryStatus" =
  CASE
    WHEN "status"::text = 'SENT' THEN 'SENT'::"NotificationDeliveryStatus"
    WHEN "status"::text = 'FAILED' THEN 'FAILED'::"NotificationDeliveryStatus"
    ELSE 'QUEUED'::"NotificationDeliveryStatus"
  END,
  "isRead" = CASE WHEN "status"::text = 'READ' THEN true ELSE false END,
  "readAt" = CASE WHEN "status"::text = 'READ' THEN COALESCE("sentAt", "createdAt") ELSE null END
WHERE "status" IS NOT NULL;

ALTER TABLE "Notification"
  ALTER COLUMN "event" SET NOT NULL;

DROP INDEX IF EXISTS "Notification_accountId_createdAt_idx";
CREATE INDEX IF NOT EXISTS "Notification_accountId_createdAt_idx" ON "Notification"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_accountId_isRead_createdAt_idx" ON "Notification"("accountId", "isRead", "createdAt");
