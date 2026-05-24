import { z } from "zod";
import { CAMPAIGN_STATUS } from "@/lib/constants/enums";
import { campaignCreateSchema } from "@/lib/validators/brand-dashboard";

export const adminCampaignListQuerySchema = z.object({
  status: z.enum(CAMPAIGN_STATUS).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminCampaignDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional()
});

export const adminCampaignCreateSchema = campaignCreateSchema.extend({
  brandAccountId: z.string().trim().min(3).max(128),
  publishNow: z.boolean().optional().default(false)
});
