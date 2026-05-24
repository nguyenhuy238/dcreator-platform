import { z } from "zod";

const applicationStatus = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_REVISION: "NEEDS_REVISION"
} as const;
const socialPlatforms = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK", "OTHER"] as const;

const optionalUrl = z.url().trim().max(400).optional().or(z.literal(""));

export const creatorApplicationSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  avatarUrl: optionalUrl,
  bio: z.string().trim().max(2000).optional(),
  mainPlatform: z.enum(socialPlatforms),
  socialUrl: z.url().trim().max(400),
  handle: z.string().trim().max(120).optional(),
  followerCount: z.number().int().min(0).optional(),
  contentCategory: z.string().trim().max(120).optional(),
  portfolioUrl: optionalUrl,
  location: z.string().trim().max(120).optional(),
  expectedRate: z.number().int().min(0).optional(),
  maxJobsPerMonth: z.number().int().min(0).optional(),
  realName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  identityNumber: z.string().trim().max(40).optional(),
  identityFrontUrl: optionalUrl,
  identityBackUrl: optionalUrl,
  selfieUrl: optionalUrl,
  bankAccountName: z.string().trim().max(120).optional(),
  bankAccountNumber: z.string().trim().max(60).optional(),
  bankName: z.string().trim().max(120).optional(),
  taxCode: z.string().trim().max(60).optional()
});

export const brandApplicationSchema = z.object({
  brandName: z.string().trim().min(2).max(160),
  logoUrl: optionalUrl,
  legalName: z.string().trim().max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  website: optionalUrl,
  fanpage: optionalUrl,
  address: z.string().trim().max(240).optional(),
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(6).max(40),
  contactEmail: z.email().trim().toLowerCase(),
  description: z.string().trim().max(2000).optional(),
  businessGoal: z.string().trim().max(1200).optional(),
  taxCode: z.string().trim().max(60).optional(),
  businessLicenseUrl: z.string().trim().max(400).optional().or(z.literal("")),
  representativeName: z.string().trim().max(120).optional(),
  representativePhone: z.string().trim().max(40).optional(),
  representativeEmail: z.email().trim().toLowerCase().optional(),
  representativeIdentityNumber: z.string().trim().max(60).optional(),
  bankAccountName: z.string().trim().max(120).optional(),
  bankAccountNumber: z.string().trim().max(60).optional(),
  bankName: z.string().trim().max(120).optional(),
  productCategories: z.string().trim().max(600).optional(),
  inventoryDescription: z.string().trim().max(1200).optional(),
  expectedCampaignBudget: z.number().int().min(0).optional(),
  expectedCreatorCount: z.number().int().min(0).optional(),
  revenueSharePercent: z.number().int().min(0).max(100).optional(),
  commissionRatePercent: z.number().int().min(0).max(100).optional(),
  bccAgreementAccepted: z.boolean().optional(),
  bccAgreementVersion: z.string().trim().max(60).optional(),
  legalResponsibilityAccepted: z.boolean().optional(),
  contractFileUrl: z.string().trim().max(400).optional().or(z.literal("")),
  contractSignedAt: z.string().datetime().optional()
});

export const rejectApplicationSchema = z.object({
  rejectReason: z.string().trim().min(10).max(1000)
});

export const reviewApplicationSchema = z.object({
  status: z.enum([applicationStatus.APPROVED, applicationStatus.REJECTED, applicationStatus.NEEDS_REVISION]),
  rejectReason: z.string().trim().max(1000).optional(),
  reviewNote: z.string().trim().max(1000).optional()
}).superRefine((value, ctx) => {
  if ((value.status === applicationStatus.REJECTED || value.status === applicationStatus.NEEDS_REVISION) && !value.rejectReason) {
    ctx.addIssue({ code: "custom", path: ["rejectReason"], message: "rejectReason is required" });
  }
});

export type CreatorApplicationInput = z.infer<typeof creatorApplicationSchema>;
export type BrandApplicationInput = z.infer<typeof brandApplicationSchema>;
