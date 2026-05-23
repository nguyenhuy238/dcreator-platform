import { z } from "zod";
import { paginationSchema } from "./common.ts";

export const voucherRedeemSchema = z.object({
  redemptionNote: z.string().trim().max(200).optional()
});

export const voucherAdminCancelSchema = z.object({
  reason: z.string().trim().min(3).max(200)
});

export const voucherAdminQuerySchema = paginationSchema.extend({
  code: z.string().trim().min(2).max(120).optional(),
  user: z.string().trim().min(2).max(120).optional(),
  campaign: z.string().trim().min(2).max(120).optional()
});
