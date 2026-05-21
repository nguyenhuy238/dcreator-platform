import { z } from "zod";

export const campaignStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);
export const campaignTypeSchema = z.enum(["DONATION", "PREORDER", "SPONSORSHIP", "COMMUNITY"]);
export const campaignCategorySchema = z.enum(["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"]);
export const campaignSortSchema = z.enum(["trending", "newest", "ending-soon", "most-funded"]);

export const campaignQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  type: campaignTypeSchema.optional(),
  category: campaignCategorySchema.optional(),
  status: campaignStatusSchema.optional().default("ACTIVE"),
  rewardAvailable: z.coerce.boolean().optional(),
  sort: campaignSortSchema.optional().default("trending"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(24).optional().default(12)
});

export const campaignSlugSchema = z.object({
  slug: z.string().min(3).max(120)
});
