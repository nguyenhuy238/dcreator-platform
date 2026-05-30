import { z } from "zod";

const applicationStatuses = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION"] as const;
const creatorSocialLinkStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
const socialPlatforms = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK", "SHOPEE", "OTHER"] as const;

export const adminCreatorListQuerySchema = z.object({
  status: z.enum(applicationStatuses).optional(),
  query: z.string().trim().max(200).optional(),
  platform: z.enum(socialPlatforms).optional(),
  contentCategory: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest")
});

export const adminCreatorSocialLinkListQuerySchema = z.object({
  status: z.enum(creatorSocialLinkStatuses).optional(),
  query: z.string().trim().max(200).optional(),
  platform: z.enum(socialPlatforms).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest")
});

export const adminCreatorDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional(),
  note: z.string().trim().max(1000).optional()
});
