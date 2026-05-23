import { z } from "zod";

export const adminPayoutListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminPayoutRejectSchema = z.object({
  reason: z.string().trim().min(3).max(1000)
});

