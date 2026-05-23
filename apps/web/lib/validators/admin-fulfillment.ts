import { z } from "zod";

export const adminFulfillmentListQuerySchema = z.object({
  status: z.enum(["pending", "preparing", "shipped", "delivered", "failed", "cancelled"]).optional(),
  campaignId: z.string().trim().min(1).optional(),
  creatorId: z.string().trim().min(1).optional(),
  brandId: z.string().trim().min(1).optional(),
  query: z.string().trim().max(200).optional()
});

export const adminFulfillmentUpdateSchema = z.object({
  status: z.enum(["pending", "preparing", "shipped", "delivered", "failed", "cancelled"]),
  trackingCode: z.string().trim().max(120).optional(),
  opsNote: z.string().trim().max(2000).optional(),
  fulfillmentMethod: z.enum(["CREATOR_SELF_BUY_REFUND", "CREATOR_DEPOSIT", "BRAND_WAREHOUSE_SHIP"]).optional(),
  paymentStatus: z.enum(["NONE", "DEPOSIT_PENDING", "DEPOSIT_PAID", "REFUND_PENDING", "REFUNDED"]).optional(),
  failureReason: z.string().trim().max(1000).optional()
});

export const adminCreateFulfillmentSchema = z.object({
  campaignId: z.string().trim().min(1),
  creatorAccountId: z.string().trim().min(1),
  inventoryBatchId: z.string().trim().min(1),
  recipientName: z.string().trim().max(150).optional(),
  recipientPhone: z.string().trim().max(50).optional(),
  shippingAddress: z.string().trim().max(500).optional(),
  fulfillmentMethod: z.enum(["CREATOR_SELF_BUY_REFUND", "CREATOR_DEPOSIT", "BRAND_WAREHOUSE_SHIP"]),
  paymentStatus: z.enum(["NONE", "DEPOSIT_PENDING", "DEPOSIT_PAID", "REFUND_PENDING", "REFUNDED"]).optional(),
  opsNote: z.string().trim().max(2000).optional()
});

