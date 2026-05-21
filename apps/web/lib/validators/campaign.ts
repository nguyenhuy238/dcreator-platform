import { z } from "zod";

export const campaignStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);

export const campaignQuerySchema = z.object({
  status: campaignStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const campaignSlugSchema = z.object({
  slug: z.string().min(3).max(120)
});