import { z } from "zod";

const absoluteUrlOrLocalPathSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return false;
    if (value.startsWith("/")) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "URL biên lai không hợp lệ");

export const brandNPointTopupCreateSchema = z.object({
  amountVnd: z.number().int().min(10_000).max(2_000_000_000),
  transferNote: z.string().trim().min(6).max(280),
  bankTransferProofUrl: absoluteUrlOrLocalPathSchema
});

export const brandNPointRefundInfoSchema = z.object({
  refundBankName: z.string().trim().min(2).max(120),
  refundAccountName: z.string().trim().min(2).max(160),
  refundAccountNumber: z.string().trim().min(6).max(40),
  refundRequestNote: z.string().trim().max(500).optional()
});

export const adminNPointTopupStatusQuerySchema = z.object({
  status: z
    .enum(["PENDING_ADMIN_REVIEW", "APPROVED", "REJECTED", "REFUND_INFO_SUBMITTED", "REFUND_COMPLETED"])
    .optional()
});

export const adminNPointTopupApproveSchema = z.object({
  note: z.string().trim().max(500).optional()
});

export const adminNPointTopupRejectSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const adminNPointRefundCompleteSchema = z.object({
  refundProofUrl: absoluteUrlOrLocalPathSchema,
  refundProcessedNote: z.string().trim().max(500).optional()
});
