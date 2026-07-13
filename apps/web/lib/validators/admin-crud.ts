import { BrandStatus, Role, SocialPlatform } from "@prisma/client";
import { z } from "zod";

const nullableTrimmed = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional();

export const adminUpdateUserSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(180).optional(),
  phone: nullableTrimmed(32),
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
  reason: z.string().trim().min(3).max(500).optional()
});

export const adminUpdateCreatorSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  bio: nullableTrimmed(2000),
  mainPlatform: z.enum(SocialPlatform).nullable().optional(),
  socialUrl: nullableTrimmed(500),
  handle: nullableTrimmed(120),
  contentCategory: nullableTrimmed(120),
  portfolioUrl: nullableTrimmed(500),
  location: nullableTrimmed(160),
  expectedRate: z.number().int().min(0).max(2_000_000_000).nullable().optional(),
  maxJobsPerMonth: z.number().int().min(0).max(500).nullable().optional(),
  isSuspended: z.boolean().optional(),
  suspendedReason: nullableTrimmed(500),
  reason: z.string().trim().min(3).max(500).optional()
});

export const adminUpdateBrandSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  legalName: nullableTrimmed(200),
  industry: nullableTrimmed(120),
  website: nullableTrimmed(500),
  fanpage: nullableTrimmed(500),
  address: nullableTrimmed(500),
  contactName: z.string().trim().min(2).max(160).optional(),
  contactPhone: z.string().trim().min(6).max(32).optional(),
  contactEmail: z.string().trim().email().max(180).optional(),
  description: nullableTrimmed(2000),
  businessGoal: nullableTrimmed(1000),
  taxCode: nullableTrimmed(80),
  productCategories: nullableTrimmed(500),
  inventoryDescription: nullableTrimmed(1000),
  status: z.enum(BrandStatus).optional(),
  isLocked: z.boolean().optional(),
  lockReason: nullableTrimmed(500),
  reason: z.string().trim().min(3).max(500).optional()
});

export const adminDeleteEntitySchema = z.object({
  confirmation: z.string().trim().min(1).max(240),
  reason: z.string().trim().min(3).max(500),
  mode: z.enum(["DELETE_ENTITY_ONLY", "DELETE_WITH_ACCOUNT", "ANONYMIZE_RETAIN"]).optional()
});
