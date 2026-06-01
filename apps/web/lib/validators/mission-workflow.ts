import { z } from "zod";

const uploadPathOrHttpUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//.test(value), "File URL không hợp lệ.");

export const creatorMissionApplicationCreateSchema = z.object({
  missionId: z.string().trim().min(3),
  note: z.string().trim().max(500).optional()
});

export const creatorMissionPurchaseProofSubmitSchema = z.object({
  purchaseBillImageUrl: uploadPathOrHttpUrlSchema,
  productReviewScreenshotUrl: uploadPathOrHttpUrlSchema,
  purchaseProofNote: z.string().trim().max(500).optional()
});

export const creatorMissionVideoSubmitSchema = z.object({
  videoUrl: z.string().trim().url().max(2000),
  note: z.string().trim().max(500).optional()
});

export const creatorMissionTranscriptSubmitSchema = z.object({
  transcript: z.string().trim().min(10).max(5000)
});

export const creatorMissionPublishSubmitSchema = z
  .object({
    publicVideoUrl: z.string().trim().url().max(2000).optional(),
    socialPostUrl: z.string().trim().url().max(2000).optional(),
    adCode: z.string().trim().max(200).optional(),
    screenshotUrl: uploadPathOrHttpUrlSchema.optional(),
    finalProofNote: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.publicVideoUrl && !value.socialPostUrl) {
      ctx.addIssue({
        code: "custom",
        message: "publicVideoUrl or socialPostUrl is required",
        path: ["publicVideoUrl"]
      });
    }
  });

export const missionApplicationAdminQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION"]).optional(),
  campaignId: z.string().trim().min(3).optional(),
  campaign: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const missionApplicationRejectSchema = z.object({
  rejectReason: z.string().trim().min(3).max(500)
});

export const missionVideoReviewAdminQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  campaignId: z.string().trim().min(3).optional(),
  campaign: z.string().trim().min(1).max(120).optional(),
  videoReviewStatus: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const missionVideoReviewRejectSchema = z.object({
  feedback: z.string().trim().min(3).max(500)
});

export const missionTranscriptReviewAdminQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  campaignId: z.string().trim().min(3).optional(),
  campaign: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const missionTranscriptReviewRejectSchema = z.object({
  feedback: z.string().trim().min(3).max(500)
});

export const missionFinalReviewAdminQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  campaignId: z.string().trim().min(3).optional(),
  campaign: z.string().trim().min(1).max(120).optional(),
  productReceiveOption: z.enum(["PRODUCT_REQUIRED", "NO_PRODUCT_REQUIRED"]).optional(),
  publishStatus: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const missionFinalReviewApproveSchema = z.object({
  reimbursementAmountVnd: z.number().int().min(0).max(2_000_000_000).optional()
});

export const missionFinalReviewRejectSchema = z.object({
  feedback: z.string().trim().min(3).max(500)
});

export const missionHistoryQuerySchema = z.object({
  accountId: z.string().trim().min(3).optional(),
  query: z.string().trim().min(1).max(120).optional(),
  campaign: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["PRODUCT_PENDING", "DRAFT_PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  videoReviewStatus: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]).optional(),
  publishStatus: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]).optional(),
  productReceiveOption: z.enum(["PRODUCT_REQUIRED", "NO_PRODUCT_REQUIRED"]).optional(),
  productStatus: z.enum(["NOT_REQUIRED", "WAITING_DEPOSIT", "WAITING_PURCHASE", "RECEIVED"]).optional(),
  reimbursementStatus: z.enum(["NOT_REQUIRED", "PENDING", "PURCHASE_SUBMITTED", "APPROVED", "PAYOUT_PENDING", "PAID", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});
