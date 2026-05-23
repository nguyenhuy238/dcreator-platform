import { ProductReviewStatus } from "@prisma/client";
import { z } from "zod";

export const adminProductListQuerySchema = z.object({
  status: z.nativeEnum(ProductReviewStatus).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminProductDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(1000).optional(),
  note: z.string().trim().max(2000).optional(),
  proposedCommissionPercent: z.number().min(0).max(100).optional(),
  proposedMarginPercent: z.number().min(0).max(100).optional(),
  campaignEligible: z.boolean().optional()
});
