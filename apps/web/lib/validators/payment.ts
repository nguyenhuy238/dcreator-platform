import { z } from "zod";

export const paymentRequestSchema = z.object({
  campaignId: z.string().min(1),
  orderCode: z.string().min(1),
  amountVnd: z.number().int().positive(),
  description: z.string().min(3).max(200)
});