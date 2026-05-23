import { z } from "zod";

export const adminSupportListQuerySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.enum(["CONTENT", "REVENUE", "PAYOUT", "CAMPAIGN", "APPLICATION", "FULFILLMENT", "ACCOUNT", "OTHER"]).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminSupportUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeAccountId: z.string().trim().min(1).nullable().optional(),
  responseSummary: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional()
});

export const adminSupportReplySchema = z.object({
  message: z.string().trim().min(2).max(4000),
  isInternal: z.boolean().optional()
});

