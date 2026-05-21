import { prisma } from "@/lib/db";

export const AUDIT_ACTIONS = {
  ADMIN_CAMPAIGN_APPROVED: "CAMPAIGN_REVIEW_APPROVED",
  ADMIN_CAMPAIGN_REJECTED: "CAMPAIGN_REVIEW_REJECTED",
  ADMIN_CREATOR_APPROVED: "ROLE_REQUEST_CREATOR_APPROVED",
  ADMIN_CREATOR_REJECTED: "ROLE_REQUEST_CREATOR_REJECTED",
  ADMIN_BRAND_APPROVED: "ROLE_REQUEST_BRAND_APPROVED",
  ADMIN_BRAND_REJECTED: "ROLE_REQUEST_BRAND_REJECTED",
  BRAND_PROOF_APPROVED: "MISSION_PROOF_APPROVED",
  BRAND_PROOF_REJECTED: "MISSION_PROOF_REJECTED",
  WALLET_BALANCE_CHANGED: "WALLET_BALANCE_CHANGED",
  PAYMENT_STATUS_CHANGED: "PAYMENT_STATUS_CHANGED",
  VOUCHER_CANCELLED: "VOUCHER_CANCELLED",
  VOUCHER_REDEEMED: "VOUCHER_REDEEMED",
  PAYOUT_APPROVED: "PAYOUT_APPROVED",
  PAYOUT_REJECTED: "PAYOUT_REJECTED",
  USER_LOCKED: "USER_LOCKED",
  USER_UNLOCKED: "USER_UNLOCKED"
} as const;

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata as object | undefined
    }
  });
}
