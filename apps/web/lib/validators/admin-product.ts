import { z } from "zod";
import { PRODUCT_REVIEW_STATUS } from "@/lib/constants/enums";

export const adminProductListQuerySchema = z.object({
  status: z.enum(PRODUCT_REVIEW_STATUS).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminProductDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(1000).optional(),
  note: z.string().trim().max(2000).optional(),
  proposedCommissionPercent: z.number().min(0).max(100).optional(),
  proposedMarginPercent: z.number().min(0).max(100).optional(),
  campaignEligible: z.boolean().optional()
});
