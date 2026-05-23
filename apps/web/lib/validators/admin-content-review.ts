import { z } from "zod";

export const adminContentReviewListQuerySchema = z.object({
  campaignId: z.string().trim().min(1).optional(),
  creatorId: z.string().trim().min(1).optional(),
  brandId: z.string().trim().min(1).optional(),
  status: z
    .enum([
      "SUBMITTED",
      "ADMIN_REVIEWING",
      "ADMIN_APPROVED",
      "ADMIN_REJECTED",
      "CHANGES_REQUESTED",
      "BRAND_REVIEWING",
      "BRAND_APPROVED",
      "READY_TO_PUBLISH",
      "PUBLISHED"
    ])
    .optional(),
  platform: z.enum(["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK", "OTHER"]).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminContentDecisionSchema = z.object({
  feedback: z.string().trim().min(2).max(2000),
  markReadyToPublish: z.boolean().optional()
});

