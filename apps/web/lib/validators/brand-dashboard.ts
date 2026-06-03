import { z } from "zod";

const campaignSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang (-), không có khoảng trắng.");

const uploadPathOrHttpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(400)
  .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//.test(value), "File URL không hợp lệ.");

export const brandProfileSchema = z.object({
  brandName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  contactEmail: z.email().trim().toLowerCase().optional().or(z.literal("")),
  logoUrl: z.url().max(400).optional().or(z.literal("")),
  businessInfo: z.string().trim().max(2000).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).default("UNVERIFIED")
});

export const productSchema = z.object({
  id: z.string().trim().min(3).max(64).optional(),
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: uploadPathOrHttpUrlSchema.optional().or(z.literal("")),
  stockQty: z.number().int().min(0),
  voucherStock: z.number().int().min(0),
  campaignEligibility: z.boolean().default(true),
  suggestedPriceVnd: z.number().int().min(0).optional(),
  costPriceVnd: z.number().int().min(0).optional(),
  priceVnd: z.number().int().min(0).optional(),
  pricePoints: z.number().int().min(0).optional(),
  returnPolicy: z.string().trim().max(1200).optional().or(z.literal("")),
  batches: z.array(z.object({
    id: z.string().trim().min(3).max(64).optional(),
    quantity: z.number().int().min(0),
    expiryDate: z.string().trim().max(40).optional().or(z.literal("")),
    fulfillmentType: z.enum(["NONE_WAREHOUSE", "BRAND_FULFILLMENT"]),
    opsStatus: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"]).default("DRAFT"),
    appraisedValueVnd: z.number().int().min(0).optional(),
    viableMarginPercent: z.number().int().min(0).max(100).optional(),
    opsNote: z.string().trim().max(1000).optional().or(z.literal(""))
  })).default([])
});

export const brandOnboardingSchema = z.object({
  legalName: z.string().trim().max(160, { message: "Pháp nhân / tên công ty tối đa 160 ký tự." }).optional().or(z.literal("")),
  industry: z.string().trim().max(120, { message: "Ngành hàng tối đa 120 ký tự." }).optional().or(z.literal("")),
  taxCode: z.string().trim().max(60, { message: "Mã số thuế tối đa 60 ký tự." }).optional().or(z.literal("")),
  businessLicenseUrl: z.string().trim().max(400, { message: "URL giấy phép kinh doanh tối đa 400 ký tự." }).optional().or(z.literal("")),
  productCategories: z.string().trim().max(600, { message: "Danh mục sản phẩm tối đa 600 ký tự." }).optional().or(z.literal("")),
  inventoryDescription: z.string().trim().max(1200, { message: "Mô tả tồn kho tối đa 1200 ký tự." }).optional().or(z.literal("")),
  revenueSharePercent: z.number().int().min(0, { message: "Phần trăm doanh thu phải từ 0 đến 100." }).max(100, { message: "Phần trăm doanh thu phải từ 0 đến 100." }).default(70),
  commissionRatePercent: z.number().int().min(0, { message: "Commission phải từ 0 đến 100." }).max(100, { message: "Commission phải từ 0 đến 100." }).default(10),
  bccAgreementAccepted: z.boolean(),
  bccAgreementVersion: z.string().trim().min(1).max(60).default("BCC-dCreator-v1"),
  bccAgreementTerms: z.string().trim().min(10, { message: "Nội dung hợp đồng BCC phải có ít nhất 10 ký tự." }).max(10000, { message: "Nội dung hợp đồng BCC tối đa 10000 ký tự." }),
  requestAdminReview: z.boolean().optional(),
  legalResponsibilityAccepted: z.boolean(),
  contractFileUrl: z.string().trim().max(400, { message: "Ghi chú hợp đồng / tài liệu bổ sung tối đa 400 ký tự." }).optional().or(z.literal(""))
}).superRefine((value, ctx) => {
  const hasValidBusinessLicenseUrl = (() => {
    if (!value.businessLicenseUrl) return true;
    try {
      const parsed = new URL(value.businessLicenseUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  })();

  if (value.requestAdminReview) {
    if (!value.contractFileUrl) {
      ctx.addIssue({ code: "custom", path: ["contractFileUrl"], message: "Vui lòng tải file hợp đồng / tài liệu bổ sung." });
    }
  }

  if (!value.requestAdminReview && !value.bccAgreementAccepted) {
    ctx.addIssue({ code: "custom", path: ["bccAgreementAccepted"], message: "Bạn phải đồng ý với nội dung hợp đồng BCC." });
  }
  if (!value.requestAdminReview && !value.legalResponsibilityAccepted) {
    ctx.addIssue({ code: "custom", path: ["legalResponsibilityAccepted"], message: "Bạn phải xác nhận chịu trách nhiệm pháp lý." });
  }

  if (!hasValidBusinessLicenseUrl) {
    ctx.addIssue({ code: "custom", path: ["businessLicenseUrl"], message: "URL giấy phép kinh doanh không hợp lệ." });
  }

  if (!value.legalName || value.legalName.trim().length < 2) {
    ctx.addIssue({ code: "custom", path: ["legalName"], message: "Vui lòng nhập Pháp nhân / tên công ty." });
  }
  if (!value.industry || value.industry.trim().length < 2) {
    ctx.addIssue({ code: "custom", path: ["industry"], message: "Vui lòng nhập Ngành hàng." });
  }
  if (!value.taxCode || value.taxCode.trim().length < 3) {
    ctx.addIssue({ code: "custom", path: ["taxCode"], message: "Vui lòng nhập Mã số thuế." });
  }
  if (!value.productCategories || value.productCategories.trim().length < 2) {
    ctx.addIssue({ code: "custom", path: ["productCategories"], message: "Vui lòng nhập Danh mục sản phẩm." });
  }
  if (!value.inventoryDescription || value.inventoryDescription.trim().length < 10) {
    ctx.addIssue({ code: "custom", path: ["inventoryDescription"], message: "Mô tả tồn kho phải ít nhất 10 ký tự." });
  }
});

export const campaignCreateSchema = z.object({
  slug: campaignSlugSchema,
  title: z.string().trim().min(3).max(200),
  brief: z.string().trim().min(10).max(3000),
  category: z.enum(["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"]),
  campaignType: z.enum(["DONATION", "PREORDER", "SPONSORSHIP", "COMMUNITY"]),
  setupSource: z.enum(["JOIN_EXISTING_DCREATOR_CAMP", "BRAND_REQUESTED"]).default("BRAND_REQUESTED"),
  benefits: z.string().trim().min(3).max(2000),
  participationRoadmap: z.array(z.string().trim().min(1).max(300)).min(1),
  imageUrl: uploadPathOrHttpUrlSchema.optional().or(z.literal("")),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional()
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
  }
});

export const campaignBrandFeedbackSchema = z.object({
  feedback: z.string().trim().min(10).max(1200)
});

export const campaignRequestSchema = z.object({
  title: z.string().trim().min(3).max(200),
  imageUrl: uploadPathOrHttpUrlSchema.optional().or(z.literal("")),
  contentFileUrl: uploadPathOrHttpUrlSchema,
});

export const rewardTierSchema = z.object({
  campaignId: z.string().trim().min(3),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  stockTotal: z.number().int().min(0),
  priceVnd: z.number().int().min(0).default(0),
  pricePoints: z.number().int().min(0).default(0)
});

export const campaignMissionCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(3000),
  productName: z.string().trim().max(160).optional().or(z.literal("")),
  productDescription: z.string().trim().max(2000).optional().or(z.literal("")),
  productImageUrl: z.string().trim().max(400).optional().or(z.literal("")),
  productLink: z.string().trim().max(400).optional().or(z.literal("")),
  rewardPoints: z.number().int().min(0).default(0),
  rewardCommissionVnd: z.number().int().min(0).default(0),
  audience: z.enum(["USER", "CREATOR"]).default("CREATOR"),
  productReceiveOption: z.enum(["PRODUCT_REQUIRED", "NO_PRODUCT_REQUIRED"]).default("NO_PRODUCT_REQUIRED"),
  allowRepeat: z.boolean().default(false),
  deadlineAt: z.string().datetime().optional()
}).superRefine((value, ctx) => {
  if (value.productReceiveOption !== "PRODUCT_REQUIRED") return;
  if (!value.productName?.trim()) {
    ctx.addIssue({ code: "custom", path: ["productName"], message: "Vui lòng nhập tên sản phẩm." });
  }
  if (!value.productDescription?.trim()) {
    ctx.addIssue({ code: "custom", path: ["productDescription"], message: "Vui lòng nhập mô tả sản phẩm." });
  }
  if (!value.productLink?.trim()) {
    ctx.addIssue({ code: "custom", path: ["productLink"], message: "Vui lòng nhập link sản phẩm." });
  }
  if (!value.productImageUrl?.trim()) {
    ctx.addIssue({ code: "custom", path: ["productImageUrl"], message: "Vui lòng nhập hình ảnh sản phẩm." });
  }
});

export const creatorApplicationDecisionSchema = z.object({
  submissionId: z.string().trim().min(3),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional()
});

export const proofReviewDecisionSchema = z
  .object({
    submissionId: z.string().trim().min(3),
    decision: z.enum(["APPROVED", "REJECTED", "REVISION"]),
    rejectReason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if ((value.decision === "REJECTED" || value.decision === "REVISION") && !value.rejectReason) {
      ctx.addIssue({ code: "custom", path: ["rejectReason"], message: "rejectReason is required" });
    }
  });

export const budgetLockSchema = z.object({
  campaignId: z.string().trim().min(3),
  amountVnd: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(6).max(120)
});

export const budgetTopupSchema = z.object({
  amountVnd: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(6).max(120)
});

export const productSubmissionSchema = z.object({
  campaignId: z.string().trim().min(3).optional(),
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  unitPriceVnd: z.number().int().min(0).default(0),
  batchCode: z.string().trim().max(80).optional(),
  quantityTotal: z.number().int().positive()
});

export const brandMemberInviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]).default("STAFF"),
  note: z.string().trim().max(500).optional().or(z.literal(""))
});

export const brandMemberRoleUpdateSchema = z.object({
  memberId: z.string().trim().min(3),
  role: z.enum(["OWNER", "MANAGER", "STAFF"])
});

export const brandMemberRemoveSchema = z.object({
  memberId: z.string().trim().min(3)
});

export const brandSubscriptionPurchaseSchema = z.object({
  packageCode: z.enum(["FREE", "UGC_15_VIDEO", "UGC_50_VIDEO"])
});
