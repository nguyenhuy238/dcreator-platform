import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";

export const adminBrandListQuerySchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  query: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest")
});

export const adminBrandDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000).optional(),
  note: z.string().trim().max(1000).optional()
});
