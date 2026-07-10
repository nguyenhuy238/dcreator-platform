// @ts-nocheck
import { type Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createAuditLog } from "@/lib/services/audit-log.service";
import { createNotificationForAdminOps } from "@/lib/services/notification.service";

function requireDangerReason(reason: string | undefined) {
  if (!reason || reason.trim().length < 5) {
    throw new AppError("reason is required", 422, "REASON_REQUIRED");
  }
  return reason.trim();
}

async function resolveCreatorAccountId(inputId: string) {
  const application = await prisma.creatorApplication.findUnique({ where: { id: inputId }, select: { accountId: true } });
  return application?.accountId ?? inputId;
}

async function resolveBrandId(inputId: string) {
  const app = await prisma.brandApplication.findUnique({ where: { id: inputId }, select: { id: true, accountId: true } });
  if (app) {
    const brand = await prisma.brand.findFirst({ where: { ownerAccountId: app.accountId }, select: { id: true } });
    if (!brand) throw new AppError("Brand not found for application", 404, "BRAND_NOT_FOUND");
    return brand.id;
  }
  return inputId;
}

export async function suspendCreatorByAdmin(actorId: string, actorRole: Role, creatorRefId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const accountId = await resolveCreatorAccountId(creatorRefId);
  const profile = await prisma.creatorProfile.findUnique({ where: { accountId } });
  if (!profile) throw new AppError("Creator profile not found", 404, "CREATOR_NOT_FOUND");

  const updated = await prisma.creatorProfile.update({
    where: { accountId },
    data: {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedReason: finalReason
    }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_CREATOR_SUSPENDED",
    targetType: "CreatorProfile",
    targetId: updated.id,
    oldStatus: profile.isSuspended ? "SUSPENDED" : "ACTIVE",
    newStatus: "SUSPENDED",
    reason: finalReason
  });

  return updated;
}

export async function unsuspendCreatorByAdmin(actorId: string, actorRole: Role, creatorRefId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const accountId = await resolveCreatorAccountId(creatorRefId);
  const profile = await prisma.creatorProfile.findUnique({ where: { accountId } });
  if (!profile) throw new AppError("Creator profile not found", 404, "CREATOR_NOT_FOUND");

  const updated = await prisma.creatorProfile.update({
    where: { accountId },
    data: {
      isSuspended: false,
      unsuspendedAt: new Date(),
      unsuspendedReason: finalReason
    }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_CREATOR_UNSUSPENDED",
    targetType: "CreatorProfile",
    targetId: updated.id,
    oldStatus: profile.isSuspended ? "SUSPENDED" : "ACTIVE",
    newStatus: "ACTIVE",
    reason: finalReason
  });

  return updated;
}

export async function lockBrandByAdmin(actorId: string, actorRole: Role, brandRefId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const brandId = await resolveBrandId(brandRefId);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new AppError("Brand not found", 404, "BRAND_NOT_FOUND");

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data: {
      isLocked: true,
      status: "LOCKED",
      lockedAt: new Date(),
      lockReason: finalReason
    }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_BRAND_LOCKED",
    targetType: "Brand",
    targetId: updated.id,
    oldStatus: brand.status,
    newStatus: "LOCKED",
    reason: finalReason
  });

  return updated;
}

export async function unlockBrandByAdmin(actorId: string, actorRole: Role, brandRefId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const brandId = await resolveBrandId(brandRefId);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new AppError("Brand not found", 404, "BRAND_NOT_FOUND");

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data: {
      isLocked: false,
      status: "ACTIVE",
      unlockedAt: new Date(),
      unlockReason: finalReason
    }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_BRAND_UNLOCKED",
    targetType: "Brand",
    targetId: updated.id,
    oldStatus: brand.status,
    newStatus: "ACTIVE",
    reason: finalReason
  });

  return updated;
}

export async function pauseAllBrandCampaignsByAdmin(actorId: string, actorRole: Role, brandRefId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const brandId = await resolveBrandId(brandRefId);
  const result = await prisma.campaign.updateMany({
    where: { brandId, status: "ACTIVE" as never },
    data: { status: "PAUSED" as never, pausedReason: finalReason }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_BRAND_CAMPAIGNS_PAUSED",
    targetType: "Brand",
    targetId: brandId,
    oldStatus: "ACTIVE",
    newStatus: "PAUSED",
    reason: finalReason,
    metadata: { pausedCampaigns: result.count }
  });

  return result;
}

export async function resumeCampaignByAdmin(actorId: string, actorRole: Role, campaignId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const current = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!current) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "ACTIVE" as never, resumedReason: finalReason }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_CAMPAIGN_RESUMED",
    targetType: "Campaign",
    targetId: campaignId,
    oldStatus: current.status,
    newStatus: updated.status,
    reason: finalReason
  });

  return updated;
}

export async function markCampaignCompletedByAdmin(actorId: string, actorRole: Role, campaignId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const current = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!current) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { status: "COMPLETED" as never } });
  await createAuditLog({ actorId, actorRole, action: "ADMIN_CAMPAIGN_MARK_COMPLETED", targetType: "Campaign", targetId: campaignId, oldStatus: current.status, newStatus: updated.status, reason: finalReason });
  return updated;
}

export async function moveCampaignToAuditByAdmin(actorId: string, actorRole: Role, campaignId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { movedToAuditAt: new Date(), movedToAuditById: actorId } });
  await createAuditLog({ actorId, actorRole, action: "ADMIN_CAMPAIGN_MOVED_TO_AUDIT", targetType: "Campaign", targetId: campaignId, reason: finalReason, newStatus: updated.status });
  return updated;
}

export async function forceCloseCampaignByAdmin(actorId: string, actorRole: Role, campaignId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const current = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!current) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "ARCHIVED" as never, forceClosedAt: new Date(), forceCloseReason: finalReason }
  });

  await createAuditLog({ actorId, actorRole, action: "ADMIN_CAMPAIGN_FORCE_CLOSED", targetType: "Campaign", targetId: campaignId, oldStatus: current.status, newStatus: updated.status, reason: finalReason });
  return updated;
}

export async function extendCampaignDeadlineByAdmin(actorId: string, actorRole: Role, campaignId: string, endsAt: Date, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const current = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!current) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { endsAt } });
  await createAuditLog({ actorId, actorRole, action: "ADMIN_CAMPAIGN_DEADLINE_EXTENDED", targetType: "Campaign", targetId: campaignId, reason: finalReason, oldStatus: current.endsAt?.toISOString() ?? null, newStatus: endsAt.toISOString() });
  return updated;
}

export async function disableRewardByAdmin(actorId: string, actorRole: Role, rewardId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) throw new AppError("Reward not found", 404, "REWARD_NOT_FOUND");
  const updated = await prisma.reward.update({ where: { id: rewardId }, data: { isActive: false } });
  await createAuditLog({ actorId, actorRole, action: "ADMIN_REWARD_DISABLED", targetType: "Reward", targetId: rewardId, oldStatus: reward.isActive ? "ACTIVE" : "DISABLED", newStatus: "DISABLED", reason: finalReason });
  return updated;
}

export async function adjustRewardStockByAdmin(actorId: string, actorRole: Role, rewardId: string, stockRemaining: number, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) throw new AppError("Reward not found", 404, "REWARD_NOT_FOUND");
  const updated = await prisma.reward.update({ where: { id: rewardId }, data: { stockRemaining } });
  await createAuditLog({ actorId, actorRole, action: "ADMIN_REWARD_STOCK_ADJUSTED", targetType: "Reward", targetId: rewardId, oldStatus: String(reward.stockRemaining), newStatus: String(updated.stockRemaining), reason: finalReason });
  return updated;
}

export async function holdProofRewardByAdmin(actorId: string, actorRole: Role, submissionId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  const submission = await prisma.missionSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");

  const updated = await prisma.missionSubmission.update({
    where: { id: submissionId },
    data: { rewardHold: true, rewardHoldReason: finalReason, rewardHeldAt: new Date(), rewardHeldById: actorId }
  });

  await createAuditLog({ actorId, actorRole, action: "ADMIN_PROOF_REWARD_HELD", targetType: "MissionSubmission", targetId: submissionId, oldStatus: submission.rewardHold ? "HELD" : "OPEN", newStatus: "HELD", reason: finalReason });
  return updated;
}

export async function releaseProofRewardByAdmin(actorId: string, actorRole: Role, submissionId: string, reason?: string) {
  const finalReason = requireDangerReason(reason);
  return prisma.$transaction(async (tx) => {
    const submission = await tx.missionSubmission.findUnique({ where: { id: submissionId }, include: { mission: true } });
    if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");

    let walletApplied = false;
    if (submission.lifecycleStatus === "DONE" && !submission.rewardGrantedAt) {
      const wallet = await tx.wallet.findUnique({ where: { userId: submission.accountId } });
      if (!wallet) throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pointsBalance: wallet.pointsBalance + submission.mission.rewardPoints,
          cashBalanceVnd: wallet.cashBalanceVnd + submission.mission.rewardCommissionVnd
        }
      });
      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          accountId: submission.accountId,
          type: submission.mission.rewardPoints > 0 ? "ADJUSTMENT" : "COMMISSION_CREDIT",
          pointsDelta: submission.mission.rewardPoints,
          cashDeltaVnd: submission.mission.rewardCommissionVnd,
          balanceAfterPoints: updatedWallet.pointsBalance,
          balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
          referenceType: "MISSION_SUBMISSION",
          referenceId: submission.id,
          idempotencyKey: `mission_reward_${submission.id}`
        }
      });
      walletApplied = true;
    }

    const updated = await tx.missionSubmission.update({
      where: { id: submissionId },
      data: {
        rewardHold: false,
        rewardReleasedAt: new Date(),
        rewardReleasedById: actorId,
        rewardHoldReason: null,
        ...(submission.lifecycleStatus === "DONE" && !submission.rewardGrantedAt ? { rewardGrantedAt: new Date() } : {})
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: "ADMIN_PROOF_REWARD_RELEASED",
        targetType: "MissionSubmission",
        targetId: submissionId,
        oldStatus: submission.rewardHold ? "HELD" : "OPEN",
        newStatus: "OPEN",
        reason: finalReason,
        metadata: { walletApplied }
      }
    });

    return updated;
  });
}

export async function createRiskFlagByAdmin(actorId: string, actorRole: Role, input: {
  targetType: string;
  targetId: string;
  reason: string;
  flagType?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
  note?: string;
  accountId?: string | null;
}) {
  const finalReason = requireDangerReason(input.reason);
  const created = await prisma.riskFlag.create({
    data: {
      accountId: input.accountId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: finalReason,
      flagType: input.flagType,
      severity: input.severity ?? "MEDIUM",
      status: "OPEN",
      note: input.note
    }
  });

  await createAuditLog({ actorId, actorRole, action: "ADMIN_RISK_FLAG_CREATED", targetType: input.targetType, targetId: input.targetId, reason: finalReason, newStatus: "OPEN", metadata: { riskFlagId: created.id } });
  await createNotificationForAdminOps({
    event: "PROOF_SUBMITTED",
    title: "Fraud/risk flag mới",
    content: `Có risk flag mới cho ${input.targetType} ${input.targetId}.`,
    metadata: {
      riskFlagId: created.id,
      targetType: input.targetType,
      targetId: input.targetId,
      severity: created.severity
    },
    excludeAccountId: actorId
  });
  return created;
}

export async function resolveRiskFlagByAdmin(actorId: string, actorRole: Role, riskFlagId: string, input: { reason?: string; note?: string; action: "RESOLVED" | "ESCALATED" }) {
  const finalReason = requireDangerReason(input.reason);
  const current = await prisma.riskFlag.findUnique({ where: { id: riskFlagId } });
  if (!current) throw new AppError("Risk flag not found", 404, "RISK_FLAG_NOT_FOUND");

  const updated = await prisma.riskFlag.update({
    where: { id: riskFlagId },
    data: {
      status: input.action,
      note: input.note ?? current.note,
      resolvedAt: new Date(),
      resolvedById: actorId
    }
  });

  await createAuditLog({ actorId, actorRole, action: input.action === "ESCALATED" ? "ADMIN_RISK_FLAG_ESCALATED" : "ADMIN_RISK_FLAG_RESOLVED", targetType: current.targetType, targetId: current.targetId, reason: finalReason, oldStatus: current.status, newStatus: updated.status, metadata: { riskFlagId } });
  if (input.action === "ESCALATED") {
    await createNotificationForAdminOps({
      event: "PROOF_SUBMITTED",
      title: "Fraud/risk escalation",
      content: `Risk flag ${riskFlagId} đã được escalate để OPS/Admin xử lý.`,
      metadata: {
        riskFlagId,
        targetType: current.targetType,
        targetId: current.targetId,
        status: updated.status
      },
      excludeAccountId: actorId
    });
  }
  return updated;
}

export async function addInternalNoteByAdmin(actorId: string, actorRole: Role, input: { targetType: string; targetId: string; content: string }) {
  const trimmed = input.content.trim();
  if (trimmed.length < 1) throw new AppError("content is required", 422, "CONTENT_REQUIRED");

  const note = await prisma.internalNote.create({
    data: {
      actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      content: trimmed
    }
  });

  await createAuditLog({
    actorId,
    actorRole,
    action: "ADMIN_INTERNAL_NOTE_ADDED",
    targetType: input.targetType,
    targetId: input.targetId,
    reason: "internal_note_added",
    metadata: { noteId: note.id }
  });

  return note;
}

export async function listInternalNotesByTarget(targetType: string, targetId: string) {
  return prisma.internalNote.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, displayName: true, email: true } } }
  });
}

export async function listRiskFlags(input?: { status?: "OPEN" | "RESOLVED" | "ESCALATED"; targetType?: string }) {
  const where: Prisma.RiskFlagWhereInput = {};
  if (input?.status) where.status = input.status;
  if (input?.targetType) where.targetType = input.targetType;
  return prisma.riskFlag.findMany({ where, orderBy: { createdAt: "desc" } });
}
