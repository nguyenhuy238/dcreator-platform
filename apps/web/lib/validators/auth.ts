import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(64),
  displayName: z.string().min(2).max(80)
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(64)
});

export const creatorRoleRequestSchema = z.object({
  note: z.string().trim().max(500).optional()
});

export const brandRoleRequestSchema = z.object({
  brandName: z.string().trim().min(2).max(120),
  brandWebsite: z.url().trim().max(200).optional(),
  note: z.string().trim().max(500).optional()
});

export const adminApproveRoleSchema = z.object({
  requestId: z.string().min(5)
});
