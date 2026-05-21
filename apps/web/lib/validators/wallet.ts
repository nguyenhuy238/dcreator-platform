import { z } from "zod";
import { paginationSchema } from "./common";

export const walletTransactionQuerySchema = paginationSchema;

export const topupCreatePaymentSchema = z.object({
  amountVnd: z.number().int().min(1000).max(100000000),
  idempotencyKey: z.string().min(8).max(120)
});

export const topupConfirmSchema = z.object({
  provider: z.literal("PAYOS"),
  orderCode: z.string().min(3).max(80),
  transactionId: z.string().min(3).max(120),
  status: z.enum(["SUCCESS", "FAILED"]),
  paidAmountVnd: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(120),
  paidAt: z.string().datetime().optional()
});

export const payoutRequestSchema = z.object({
  amountVnd: z.number().int().min(1000),
  note: z.string().trim().max(300).optional(),
  idempotencyKey: z.string().min(8).max(120)
});
