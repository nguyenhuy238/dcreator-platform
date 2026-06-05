import { z } from "zod";
import { CAMPAIGN_STATUS } from "@/lib/constants/enums";

export const adminCampaignListQuerySchema = z.object({
  status: z.enum(CAMPAIGN_STATUS).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminCampaignDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional()
});

export const adminCampaignCreateSchema = z.object({
  brandAccountId: z.string().trim().min(3).max(128),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang (-), không có khoảng trắng."),
  title: z.string().trim().min(3).max(200),
  brief: z.string().trim().max(3000).nullable().optional(),
  category: z.enum(["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"]),
  campaignType: z.enum(["DONATION", "PREORDER", "SPONSORSHIP", "COMMUNITY"]),
  setupSource: z.enum(["JOIN_EXISTING_DCREATOR_CAMP", "BRAND_REQUESTED"]).default("BRAND_REQUESTED"),
  participationRoadmap: z.array(z.string().trim().min(1).max(300)).min(1),
  benefits: z.string().trim().min(3).max(2000),
  imageUrl: z
    .string()
    .trim()
    .max(400)
    .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//.test(value), "File URL không hợp lệ.")
    .optional()
    .or(z.literal("")),
  ugcVideoQuota: z.number().int().min(1).max(100000),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  mission: z.object({
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
  }).superRefine((mission, ctx) => {
    if (mission.productReceiveOption !== "PRODUCT_REQUIRED") return;
    if (!mission.productName?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productName"], message: "Vui lòng nhập tên sản phẩm." });
    }
    if (!mission.productDescription?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productDescription"], message: "Vui lòng nhập mô tả sản phẩm." });
    }
    if (!mission.productLink?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productLink"], message: "Vui lòng nhập link sản phẩm." });
    }
    if (!mission.productImageUrl?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productImageUrl"], message: "Vui lòng nhập hình ảnh sản phẩm." });
    }
  }).optional(),
  publishNow: z.boolean().optional().default(true)
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
  }
});

export const adminCampaignUpdateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang (-), không có khoảng trắng.")
    .optional(),
  title: z.string().trim().min(3).max(200).optional(),
  brief: z.string().trim().max(3000).nullable().optional(),
  category: z.enum(["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"]).optional(),
  campaignType: z.enum(["DONATION", "PREORDER", "SPONSORSHIP", "COMMUNITY"]).optional(),
  setupSource: z.enum(["JOIN_EXISTING_DCREATOR_CAMP", "BRAND_REQUESTED"]).optional(),
  benefits: z.string().trim().min(3).max(2000).nullable().optional(),
  participationRoadmap: z.array(z.string().trim().min(1).max(300)).min(1).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  budgetVnd: z.number().int().positive().optional(),
  targetAmountVnd: z.number().int().positive().optional(),
  ugcVideoQuota: z.number().int().min(1).max(100000).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(400)
    .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//.test(value), "File URL không hợp lệ.")
    .optional()
    .or(z.literal("")),
  mission: z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(3000),
    productName: z.string().trim().max(160).optional().or(z.literal("")),
    productDescription: z.string().trim().max(2000).optional().or(z.literal("")),
    productImageUrl: z.string().trim().max(400).optional().or(z.literal("")),
    productLink: z.string().trim().max(400).optional().or(z.literal("")),
    rewardPoints: z.number().int().min(0).default(0),
    rewardCommissionVnd: z.number().int().min(0).default(0),
    productReceiveOption: z.enum(["PRODUCT_REQUIRED", "NO_PRODUCT_REQUIRED"]).default("PRODUCT_REQUIRED"),
    allowRepeat: z.boolean().default(false)
  }).superRefine((mission, ctx) => {
    if (mission.productReceiveOption !== "PRODUCT_REQUIRED") return;
    if (!mission.productName?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productName"], message: "Vui lòng nhập tên sản phẩm." });
    }
    if (!mission.productDescription?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productDescription"], message: "Vui lòng nhập mô tả sản phẩm." });
    }
    if (!mission.productLink?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productLink"], message: "Vui lòng nhập link sản phẩm." });
    }
    if (!mission.productImageUrl?.trim()) {
      ctx.addIssue({ code: "custom", path: ["productImageUrl"], message: "Vui lòng nhập hình ảnh sản phẩm." });
    }
  }).optional(),
  reason: z.string().trim().min(5).max(1000).optional()
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
  }
  if (value.participationRoadmap && value.participationRoadmap.filter((step) => step.trim().length > 0).length === 0) {
    ctx.addIssue({ code: "custom", path: ["participationRoadmap"], message: "Vui lòng nhập ít nhất 1 bước lộ trình tham gia." });
  }
});
