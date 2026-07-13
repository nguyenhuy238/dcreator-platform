import { z } from "zod";
import { paginationSchema } from "@/lib/validators/common";

export const adminUserQuerySchema = paginationSchema.extend({
  query: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["USER", "CREATOR", "BRAND_OWNER", "BRAND_STAFF", "ADMIN", "OPS"]).optional(),
  status: z.enum(["active", "locked"]).optional()
});

export const adminRejectSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const adminCampaignDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED", "CANCELLED", "DELETE_REQUEST"]),
  reason: z.string().trim().max(500).optional()
}).superRefine((value, ctx) => {
  if ((value.decision === "REJECTED" || value.decision === "CHANGES_REQUESTED" || value.decision === "CANCELLED" || value.decision === "DELETE_REQUEST") && !value.reason) {
    ctx.addIssue({ code: "custom", path: ["reason"], message: "reason is required" });
  }
});

export const adminCampaignReviewQuerySchema = z.object({
  status: z.enum(["PENDING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  query: z.string().trim().min(1).max(160).optional()
});

export const adminProofDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "OVERRIDE_APPROVE"]),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(500).optional()
}).superRefine((value, ctx) => {
  if (value.decision === "REJECTED" && !value.reason) {
    ctx.addIssue({ code: "custom", path: ["reason"], message: "reason is required" });
  }
});

export const adminAuditQuerySchema = paginationSchema.extend({
  action: z.string().trim().min(1).max(120).optional(),
  targetType: z.string().trim().min(1).max(120).optional()
});

export const adminCreatorCampaignApplicationStatusSchema = z.enum(["ACCEPTED", "DOING", "REJECTED"]);

export const adminCreatorCampaignApplicationQuerySchema = z.object({
  status: adminCreatorCampaignApplicationStatusSchema.optional(),
  query: z.string().trim().min(1).max(120).optional()
});

export const adminCreatorCampaignDecisionSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECTED" && !value.rejectReason) {
      ctx.addIssue({ code: "custom", path: ["rejectReason"], message: "rejectReason is required" });
    }
  });

export const adminCreatorMissionDecisionSchema = z
  .object({
    action: z.enum([
      "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED",
      "MARK_SAMPLE_SHIPPED",
      "APPROVE_PURCHASE_PROOF",
      "REJECT_PURCHASE_PROOF",
      "APPROVE_VIDEO_REVIEW",
      "REJECT_VIDEO_REVIEW",
      "APPROVE_PUBLISH_REPORT",
      "REJECT_PUBLISH_REPORT"
    ]),
    reason: z.string().trim().max(500).optional(),
    purchaseAmountVnd: z.number().int().min(0).max(2_000_000_000).optional()
  })
  .superRefine((value, ctx) => {
    if ((value.action === "REJECT_PURCHASE_PROOF" || value.action === "REJECT_VIDEO_REVIEW" || value.action === "REJECT_PUBLISH_REPORT") && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "reason is required" });
    }
    if (value.action === "APPROVE_PUBLISH_REPORT" && typeof value.purchaseAmountVnd !== "number") {
      ctx.addIssue({ code: "custom", path: ["purchaseAmountVnd"], message: "purchaseAmountVnd is required" });
    }
  });
