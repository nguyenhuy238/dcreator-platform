import { z } from "zod";

const applicationStatuses = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION"] as const;

export const adminBrandListQuerySchema = z.object({
  status: z.enum(applicationStatuses).optional(),
  query: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest")
});

export const adminBrandDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional(),
  note: z.string().trim().max(1000).optional()
});
