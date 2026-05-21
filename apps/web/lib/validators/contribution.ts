import { z } from "zod";

export const contributionCreateSchema = z.object({
  rewardId: z.string().cuid(),
  paymentMethod: z.enum(["N_POINTS", "PAYOS"]),
  amount: z.number().int().min(1000),
  idempotencyKey: z.string().min(8).max(120)
});

export const contributionPayosWebhookSchema = z.object({
  orderCode: z.string().min(3).max(80),
  transactionId: z.string().min(3).max(120),
  status: z.enum(["SUCCESS", "FAILED"]),
  paidAmountVnd: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(120)
});
