import { z } from "zod";
import { CAMPAIGN_STATUS } from "@/lib/constants/enums";

export const adminCampaignListQuerySchema = z.object({
  status: z.enum(CAMPAIGN_STATUS).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminCampaignDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional()
});
