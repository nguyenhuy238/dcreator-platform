import { z } from "zod";

export const analyticsEventNameSchema = z.enum([
  "campaign_view",
  "campaign_cta_click",
  "campaign_support_started",
  "campaign_contribution_success",
  "reward_selected",
  "voucher_issued",
  "voucher_redeemed",
  "mission_accept",
  "mission_submit",
  "proof_approved",
  "proof_rejected",
  "creator_apply_job",
  "brand_create_campaign",
  "payment_success",
  "payment_failed"
]);

export const analyticsEventSchema = z.object({
  eventName: analyticsEventNameSchema,
  sessionId: z.string().trim().min(8).max(120),
  campaignId: z.string().trim().min(3).max(64).optional(),
  brandId: z.string().trim().min(3).max(64).optional(),
  creatorId: z.string().trim().min(3).max(64).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
