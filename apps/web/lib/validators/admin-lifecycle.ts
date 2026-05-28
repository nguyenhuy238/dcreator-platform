import { z } from "zod";

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, "reason tối thiểu 5 ký tự")
});

export const noteSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});

export const riskCreateSchema = z.object({
  targetType: z.string().trim().min(1),
  targetId: z.string().trim().min(1),
  reason: z.string().trim().min(5),
  flagType: z.string().trim().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  note: z.string().trim().optional()
});

export const riskResolveSchema = z.object({
  reason: z.string().trim().min(5),
  note: z.string().trim().optional(),
  action: z.enum(["RESOLVED", "ESCALATED"])
});

export const adjustRewardStockSchema = z.object({
  reason: z.string().trim().min(5),
  stockRemaining: z.number().int().min(0)
});

export const extendCampaignDeadlineSchema = z.object({
  reason: z.string().trim().min(5),
  endsAt: z.coerce.date()
});
