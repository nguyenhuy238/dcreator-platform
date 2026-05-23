import { CampaignStatus } from "@prisma/client";
import { z } from "zod";

export const adminCampaignListQuerySchema = z.object({
  status: z.nativeEnum(CampaignStatus).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminCampaignDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional()
});
