import { z } from "zod";
import { MISSION_LIFECYCLE_STATUS, SOCIAL_PLATFORM } from "@/lib/constants/enums";

export const adminCampaignApplicationListQuerySchema = z.object({
  campaignId: z.string().trim().min(1).optional(),
  brandId: z.string().trim().min(1).optional(),
  status: z.enum(MISSION_LIFECYCLE_STATUS).optional(),
  platform: z.enum(SOCIAL_PLATFORM).optional(),
  followerMin: z.number().int().min(0).optional(),
  followerMax: z.number().int().min(0).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminCampaignApplicationReasonSchema = z.object({
  reason: z.string().trim().min(5).max(1000)
});
