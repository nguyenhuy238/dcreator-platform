import { z } from "zod";

export const campaignQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const paymentRequestSchema = z.object({
  campaignId: z.string().min(1),
  orderCode: z.string().min(1),
  amountVnd: z.number().int().positive(),
  description: z.string().min(3).max(200)
});
