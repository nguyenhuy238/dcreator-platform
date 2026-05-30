import { z } from "zod";
import { paginationSchema } from "./common";

export const payosCreatePaymentSchema = z.object({
  intent: z.enum(["TOPUP_NPOINTS", "CONTRIBUTION", "BRAND_TOPUP_FUND"]),
  amountVnd: z.number().int().min(1000).max(1000000000),
  idempotencyKey: z.string().min(8).max(120),
  campaignId: z.string().cuid().optional(),
  rewardId: z.string().cuid().optional(),
  currentBrandId: z.string().cuid().optional(),
  note: z.string().trim().max(300).optional()
});

export const payosWebhookSchema = z.object({
  provider: z.literal("PAYOS").optional().default("PAYOS"),
  orderCode: z.string().min(3).max(80),
  transactionId: z.string().min(3).max(120),
  status: z.enum(["SUCCESS", "FAILED", "CANCELLED"]),
  paidAmountVnd: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(120),
  paidAt: z.string().datetime().optional()
});

export const adminPaymentQuerySchema = paginationSchema.extend({
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
  intent: z.enum(["TOPUP_NPOINTS", "CONTRIBUTION", "BRAND_TOPUP_FUND"]).optional(),
  accountId: z.string().cuid().optional()
});
