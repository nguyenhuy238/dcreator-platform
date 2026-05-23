import { CampaignStatus, MissionAudience, MissionLifecycleStatus, Role, RoleRequestStatus, RoleRequestType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { approveProof, rejectProof } from "@/lib/services/mission.service";
import {
  approvePublishReportByAdmin,
  approveVideoReviewByAdmin,
  approvePurchaseProofByAdmin,
  confirmDepositAndProductReceivedByAdmin,
  ensureCreatorMissionFromApprovedApplication,
  listCreatorMissionsForAdmin,
  rejectPublishReportByAdmin,
  rejectVideoReviewByAdmin,
  rejectPurchaseProofByAdmin
} from "@/lib/services/creator-mission.service";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { listAdminVouchers } from "@/lib/services/voucher.service";
import { scanFraudRiskSignals } from "@/lib/services/fraud-flag.service";
import { getAdminKpis } from "@/lib/services/analytics.service";

export async function getAdminOverview() {
  const [totalUsers, totalCreators, totalBrands, activeCampaigns, pendingReviews, totalContributions, fraudAlerts] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { role: Role.CREATOR } }),
    prisma.account.count({ where: { role: { in: [Role.BRAND_OWNER, Role.BRAND_STAFF] } } }),
    prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
    prisma.roleRequest.count({ where: { status: RoleRequestStatus.PENDING } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { status: "SUCCESS" } }),
    prisma.riskFlag.count()
  ]);

  return {
    totalUsers,
    totalCreators,
    totalBrands,
    activeCampaigns,
    pendingReviews,
    totalContributions: totalContributions._sum.amountVnd ?? 0,
    fraudAlerts
  };
}

export async function listUsersForAdmin(input: { query?: string; page: number; limit: number }) {
  const where = input.query
    ? {
        OR: [
          { displayName: { contains: input.query, mode: "insensitive" as const } },
          { email: { contains: input.query, mode: "insensitive" as const } }
        ]
      }
    : {};

  const [total, users] = await prisma.$transaction([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        wallet: { select: { pointsBalance: true, cashBalanceVnd: true } }
      }
    })
  ]);

  return { items: users, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) } };
}

export async function lockUserByAdmin(actorId: string, userId: string) {
  const updated = await prisma.account.update({ where: { id: userId }, data: { isActive: false } });
  await writeAuditLog({ actorId, action: "USER_LOCKED", targetType: "Account", targetId: userId });
  return updated;
}

export async function unlockUserByAdmin(actorId: string, userId: string) {
  const updated = await prisma.account.update({ where: { id: userId }, data: { isActive: true } });
  await writeAuditLog({ actorId, action: "USER_UNLOCKED", targetType: "Account", targetId: userId });
  return updated;
}

export async function listRoleRequests(type: RoleRequestType) {
  return prisma.roleRequest.findMany({
    where: { type, status: RoleRequestStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      note: true,
      brandName: true,
      brandWebsite: true,
      createdAt: true,
      account: { select: { id: true, displayName: true, email: true } }
    }
  });
}

export async function approveRoleRequestByAdmin(actorId: string, requestId: string) {
  const request = await prisma.roleRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Role request not found", 404, "REQUEST_NOT_FOUND");
  if (request.status !== RoleRequestStatus.PENDING) throw new AppError("Role request already processed", 409, "REQUEST_PROCESSED");

  const targetRole = request.type === RoleRequestType.CREATOR ? Role.CREATOR : Role.BRAND_OWNER;
  const result = await prisma.$transaction(async (tx) => {
    const req = await tx.roleRequest.update({
      where: { id: requestId },
      data: { status: RoleRequestStatus.APPROVED, reviewedAt: new Date(), reviewedById: actorId }
    });
    await tx.account.update({ where: { id: req.accountId }, data: { role: targetRole } });
    return req;
  });

  await writeAuditLog({ actorId, action: `ROLE_REQUEST_${request.type}_APPROVED`, targetType: "RoleRequest", targetId: requestId });
  return result;
}

export async function rejectRoleRequestByAdmin(actorId: string, requestId: string, reason: string) {
  if (!reason.trim()) throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");
  const request = await prisma.roleRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Role request not found", 404, "REQUEST_NOT_FOUND");
  if (request.status !== RoleRequestStatus.PENDING) throw new AppError("Role request already processed", 409, "REQUEST_PROCESSED");

  const result = await prisma.roleRequest.update({
    where: { id: requestId },
    data: { status: RoleRequestStatus.REJECTED, reviewedAt: new Date(), reviewedById: actorId, note: reason }
  });

  await writeAuditLog({ actorId, action: `ROLE_REQUEST_${request.type}_REJECTED`, targetType: "RoleRequest", targetId: requestId, metadata: { reason } });
  return result;
}

export async function listPendingCampaignReviews() {
  return prisma.campaign.findMany({ where: { status: CampaignStatus.PAUSED }, orderBy: { updatedAt: "asc" } });
}

export async function decideCampaignReview(actorId: string, campaignId: string, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED", reason?: string) {
  if ((decision === "REJECTED" || decision === "CHANGES_REQUESTED") && !reason?.trim()) {
    throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

  const nextStatus = decision === "APPROVED" ? CampaignStatus.ACTIVE : decision === "REJECTED" ? CampaignStatus.ARCHIVED : CampaignStatus.DRAFT;

  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { status: nextStatus } });
  await writeAuditLog({ actorId, action: `CAMPAIGN_REVIEW_${decision}`, targetType: "Campaign", targetId: campaignId, metadata: { reason: reason ?? null } });
  return updated;
}

export async function listPendingProofs() {
  return prisma.missionSubmission.findMany({
    where: { lifecycleStatus: { in: ["PENDING_REVIEW", "REJECTED"] } },
    orderBy: { updatedAt: "asc" },
    include: { mission: { include: { campaign: { select: { id: true, title: true, brandId: true } } } }, account: { select: { id: true, displayName: true } } }
  });
}

export async function decideProofByAdmin(actorId: string, actorRole: Role, submissionId: string, decision: "APPROVED" | "REJECTED" | "OVERRIDE_APPROVE", reason?: string, note?: string) {
  if (decision === "REJECTED" && !reason?.trim()) throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");

  const result =
    decision === "REJECTED"
      ? await rejectProof(submissionId, actorId, actorRole, reason ?? "", note)
      : await approveProof(submissionId, actorId, actorRole, note);

  await writeAuditLog({ actorId, action: `PROOF_${decision}`, targetType: "MissionSubmission", targetId: submissionId, metadata: { reason: reason ?? null, note: note ?? null } });
  return result;
}

export async function getVoucherManagement(input: { code?: string; user?: string; campaign?: string; page: number; limit: number }) {
  return listAdminVouchers(input);
}

export async function getFinanceSnapshot() {
  const [paymentTransactions, walletTransactions, payoutRequests, brandPrepaidFunds] = await Promise.all([
    prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, provider: true, requestedAmountVnd: true, status: true, createdAt: true, accountId: true } }),
    prisma.walletTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, accountId: true, type: true, pointsDelta: true, cashDeltaVnd: true, createdAt: true } }),
    prisma.payoutRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, accountId: true, amountVnd: true, status: true, createdAt: true } }),
    prisma.wallet.findMany({ where: { user: { role: { in: [Role.BRAND_OWNER, Role.BRAND_STAFF] } } }, select: { userId: true, pointsBalance: true, cashBalanceVnd: true, updatedAt: true } })
  ]);

  return { paymentTransactions, walletTransactions, payoutRequests, brandPrepaidFunds };
}

export async function getFraudRiskSnapshot() {
  return scanFraudRiskSignals();
}

export async function getAuditLogs(input: { action?: string; targetType?: string; page: number; limit: number }) {
  const where = {
    ...(input.action ? { action: { contains: input.action, mode: "insensitive" as const } } : {}),
    ...(input.targetType ? { targetType: { contains: input.targetType, mode: "insensitive" as const } } : {})
  };

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (input.page - 1) * input.limit, take: input.limit })
  ]);

  return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) } };
}

export async function getAdminAnalytics() {
  return getAdminKpis();
}

export async function listCreatorCampaignApplicationsForAdmin(status?: MissionLifecycleStatus, query?: string) {
  return prisma.missionSubmission.findMany({
    where: {
      mission: {
        audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
      },
      lifecycleStatus: status ?? { in: ["ACCEPTED", "DOING", "REJECTED"] },
      ...(query
        ? {
            OR: [
              { account: { displayName: { contains: query, mode: "insensitive" } } },
              { account: { email: { contains: query, mode: "insensitive" } } },
              { mission: { title: { contains: query, mode: "insensitive" } } },
              { mission: { campaign: { title: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          creatorProfile: {
            select: {
              mainPlatform: true,
              socialUrl: true,
              followerCount: true
            }
          }
        }
      },
      mission: {
        select: {
          id: true,
          title: true,
          audience: true,
          campaign: { select: { id: true, title: true, slug: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function decideCreatorCampaignApplicationByAdmin(
  actorId: string,
  submissionId: string,
  decision: "APPROVED" | "REJECTED",
  rejectReason?: string,
  note?: string
) {
  const current = await prisma.missionSubmission.findUnique({
    where: { id: submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!current) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (current.lifecycleStatus === "DONE") throw new AppError("Submission already finalized", 409, "SUBMISSION_FINALIZED");

  const updated = await prisma.$transaction(async (tx) => {
    const next = decision === "APPROVED"
      ? await tx.missionSubmission.update({
          where: { id: submissionId },
          data: {
            lifecycleStatus: "DOING",
            note: note ?? current.note,
            rejectReason: null,
            reviewedAt: new Date(),
            reviewedById: actorId
          }
        })
      : await tx.missionSubmission.update({
          where: { id: submissionId },
          data: {
            lifecycleStatus: "REJECTED",
            status: "REJECTED",
            rejectReason: rejectReason ?? "Rejected by admin",
            note: note ?? current.note,
            reviewedAt: new Date(),
            reviewedById: actorId
          }
        });

    if (decision === "APPROVED") {
      await ensureCreatorMissionFromApprovedApplication(tx, {
        missionId: current.missionId,
        campaignId: current.mission.campaignId,
        accountId: current.accountId,
        applicationId: current.id
      });
    }

    return next;
  });

  await writeAuditLog({
    actorId,
    action: `ADMIN_CREATOR_CAMPAIGN_APPLICATION_${decision}`,
    targetType: "MissionSubmission",
    targetId: submissionId,
    metadata: {
      campaignId: current.mission.campaignId,
      missionId: current.missionId,
      rejectReason: rejectReason ?? null,
      note: note ?? null
    }
  });

  return updated;
}

export async function listCreatorMissionWorkflowForAdmin() {
  return listCreatorMissionsForAdmin();
}

export async function decideCreatorMissionWorkflowByAdmin(
  actorId: string,
  creatorMissionId: string,
  action:
    | "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED"
    | "APPROVE_PURCHASE_PROOF"
    | "REJECT_PURCHASE_PROOF"
    | "APPROVE_VIDEO_REVIEW"
    | "REJECT_VIDEO_REVIEW"
    | "APPROVE_PUBLISH_REPORT"
    | "REJECT_PUBLISH_REPORT",
  reason?: string,
  purchaseAmountVnd?: number
) {
  if (action === "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED") {
    return confirmDepositAndProductReceivedByAdmin(actorId, creatorMissionId);
  }
  if (action === "APPROVE_PURCHASE_PROOF") {
    return approvePurchaseProofByAdmin(actorId, creatorMissionId);
  }
  if (action === "REJECT_PURCHASE_PROOF") {
    return rejectPurchaseProofByAdmin(actorId, creatorMissionId, reason);
  }
  if (action === "APPROVE_VIDEO_REVIEW") {
    return approveVideoReviewByAdmin(actorId, creatorMissionId);
  }
  if (action === "REJECT_VIDEO_REVIEW") {
    return rejectVideoReviewByAdmin(actorId, creatorMissionId, reason ?? "Video review rejected");
  }
  if (action === "APPROVE_PUBLISH_REPORT") {
    return approvePublishReportByAdmin(actorId, creatorMissionId, purchaseAmountVnd ?? 0);
  }
  return rejectPublishReportByAdmin(actorId, creatorMissionId, reason ?? "Publish report rejected");
}
