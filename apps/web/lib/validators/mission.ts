import { z } from "zod";

export const submitProofSchema = z
  .object({
    videoUrl: z.url().max(400).optional(),
    imageUrl: z.url().max(400).optional(),
    socialPostUrl: z.url().max(400).optional(),
    screenshotUrl: z.url().max(400).optional(),
    fileUploadUrl: z.url().max(400).optional(),
    proofTextNote: z.string().trim().max(2000).optional(),
    note: z.string().trim().max(500).optional()
  })
  .refine(
    (value) =>
      Boolean(
        value.videoUrl ||
          value.imageUrl ||
          value.socialPostUrl ||
          value.screenshotUrl ||
          value.fileUploadUrl ||
          value.proofTextNote
      ),
    { message: "At least one proof field is required" }
  );

export const adminProofApproveSchema = z.object({
  note: z.string().trim().max(500).optional()
});

export const adminProofRejectSchema = z.object({
  rejectReason: z.string().trim().min(3).max(500),
  note: z.string().trim().max(500).optional()
});

export const brandProofReviewSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECTED" && !value.rejectReason) {
      ctx.addIssue({ code: "custom", message: "rejectReason is required for REJECTED decision" });
    }
  });
