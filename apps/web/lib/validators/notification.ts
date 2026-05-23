import { z } from "zod";
import { NOTIFICATION_CHANNEL } from "@/lib/constants/enums";

const notificationEvents = [
  "USER_CONTRIBUTION_SUCCESS",
  "USER_RECEIVED_VOUCHER",
  "MISSION_ACCEPTED",
  "PROOF_SUBMITTED",
  "PROOF_APPROVED",
  "PROOF_REJECTED",
  "CREATOR_APPLICATION_APPROVED",
  "BRAND_APPLICATION_APPROVED",
  "CAMPAIGN_APPROVED",
  "CAMPAIGN_REJECTED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "PAYOUT_REQUESTED",
  "PAYOUT_APPROVED",
  "PAYOUT_REJECTED"
] as const;

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const sendNotificationSchema = z.object({
  accountId: z.string().min(1),
  event: z.enum(notificationEvents),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(z.enum(NOTIFICATION_CHANNEL)).min(1).max(3).optional()
});
