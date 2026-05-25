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
  brief: z.string().trim().min(10).max(3000),
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
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  publishNow: z.boolean().optional().default(false)
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
  }
});
