import { MissionLifecycleStatus, SocialPlatform } from "@prisma/client";
import { z } from "zod";

export const adminCampaignApplicationListQuerySchema = z.object({
  campaignId: z.string().trim().min(1).optional(),
  brandId: z.string().trim().min(1).optional(),
  status: z.nativeEnum(MissionLifecycleStatus).optional(),
  platform: z.nativeEnum(SocialPlatform).optional(),
  followerMin: z.number().int().min(0).optional(),
  followerMax: z.number().int().min(0).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminCampaignApplicationReasonSchema = z.object({
  reason: z.string().trim().min(5).max(1000)
});
