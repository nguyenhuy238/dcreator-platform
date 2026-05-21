import { z } from "zod";

export const brandProfileSchema = z.object({
  brandName: z.string().trim().min(2).max(160),
  logoUrl: z.url().max(400).optional().or(z.literal("")),
  businessInfo: z.string().trim().max(2000).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).default("UNVERIFIED")
});

export const productSchema = z.object({
  id: z.string().trim().min(3).max(64).optional(),
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  stockQty: z.number().int().min(0),
  voucherStock: z.number().int().min(0),
  campaignEligibility: z.boolean().default(true),
  priceVnd: z.number().int().min(0).optional(),
  pricePoints: z.number().int().min(0).optional()
});

export const campaignCreateSchema = z.object({
  slug: z.string().trim().min(3).max(120),
  title: z.string().trim().min(3).max(200),
  brief: z.string().trim().min(10).max(3000),
  budgetVnd: z.number().int().positive(),
  targetAmountVnd: z.number().int().positive().optional(),
  category: z.enum(["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"]),
  campaignType: z.enum(["DONATION", "PREORDER", "SPONSORSHIP", "COMMUNITY"]),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional()
});

export const rewardTierSchema = z.object({
  campaignId: z.string().trim().min(3),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  stockTotal: z.number().int().min(0),
  priceVnd: z.number().int().min(0).default(0),
  pricePoints: z.number().int().min(0).default(0)
});

export const creatorApplicationDecisionSchema = z.object({
  submissionId: z.string().trim().min(3),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional()
});

export const proofReviewDecisionSchema = z
  .object({
    submissionId: z.string().trim().min(3),
    decision: z.enum(["APPROVED", "REJECTED", "REVISION"]),
    rejectReason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if ((value.decision === "REJECTED" || value.decision === "REVISION") && !value.rejectReason) {
      ctx.addIssue({ code: "custom", path: ["rejectReason"], message: "rejectReason is required" });
    }
  });

export const budgetLockSchema = z.object({
  campaignId: z.string().trim().min(3),
  amountVnd: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(6).max(120)
});

export const budgetTopupSchema = z.object({
  amountVnd: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(6).max(120)
});
