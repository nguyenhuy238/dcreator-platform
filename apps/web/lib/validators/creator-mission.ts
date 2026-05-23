import { z } from "zod";

export const creatorMissionPurchaseProofSchema = z.object({
  proofTextNote: z.string().trim().min(2).max(500),
  screenshotUrl: z.string().trim().url().max(2000).optional(),
  note: z.string().trim().max(500).optional()
});

export const creatorMissionDraftSchema = z.object({
  videoUrl: z.string().trim().url().max(2000),
  note: z.string().trim().max(500).optional()
});

export const creatorMissionPublishReportSchema = z.object({
  socialPostUrl: z.string().trim().url().max(2000),
  adCode: z.string().trim().max(200).optional(),
  purchaseInvoiceUrl: z.string().trim().url().max(2000).optional(),
  ratingImageUrl: z.string().trim().url().max(2000).optional(),
  note: z.string().trim().max(500).optional()
});
