import type { MissionAudience, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { flagDuplicateProofUrl, flagProofSpam } from "@/lib/services/fraud-flag.service";
import { ensureWalletByAccountId } from "@/lib/services/wallet.service";

function isPast(date?: Date | null) {
  return Boolean(date && date.getTime() <= Date.now());
}

function ensureSubmissionMutable(status: string) {
  if (status === "DONE") throw new AppError("Proof already approved", 409, "PROOF_ALREADY_APPROVED");
}

async function grantRewardOnce(tx: Prisma.TransactionClient, submissionId: string, accountId: string) {
  const submission = await tx.missionSubmission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { mission: true }
  });
  if (submission.rewardGrantedAt) return submission;

  const wallet = await ensureWalletByAccountId(accountId);
  const latestWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  const pointsDelta = submission.mission.rewardPoints;
  const cashDelta = submission.mission.rewardCommissionVnd;

  const updatedWallet = await tx.wallet.update({
    where: { id: latestWallet.id },
    data: {
      pointsBalance: latestWallet.pointsBalance + pointsDelta,
      cashBalanceVnd: latestWallet.cashBalanceVnd + cashDelta
    }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: updatedWallet.id,
      accountId,
      type: pointsDelta > 0 ? "ADJUSTMENT" : "COMMISSION_CREDIT",
      pointsDelta,
      cashDeltaVnd: cashDelta,
      balanceAfterPoints: updatedWallet.pointsBalance,
      balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
      referenceType: "MISSION_SUBMISSION",
      referenceId: submission.id,
      idempotencyKey: `mission_reward_${submission.id}`
    }
  });

  return tx.missionSubmission.update({
    where: { id: submission.id },
    data: { rewardGrantedAt: new Date() }
  });
}

export async function listOpenMissions() {
  return prisma.mission.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, title: true, slug: true } } }
  });
}

export async function listCampaignMissions(campaignId: string) {
  return prisma.mission.findMany({
    where: { campaignId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, title: true, slug: true } } }
  });
}

export async function getMissionDetail(missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { campaign: { select: { id: true, title: true, slug: true, brandId: true } } }
  });
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");
  return mission;
}

export async function acceptMission(missionId: string, accountId: string, role: Role) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: { campaign: true } });
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");
  if (mission.status !== "OPEN") throw new AppError("Mission not open", 409, "MISSION_NOT_OPEN");
  if (isPast(mission.deadlineAt)) throw new AppError("Mission expired", 409, "MISSION_EXPIRED");

  if (mission.audience === "CREATOR" && role === "USER") {
    throw new AppError("Creator mission requires creator role", 403, "MISSION_CREATOR_ONLY");
  }

  if (mission.audience === "USER" && role !== "USER" && role !== "ADMIN" && role !== "OPS") {
    throw new AppError("Mission is for user audience", 403, "MISSION_USER_ONLY");
  }

  const existing = await prisma.missionSubmission.findUnique({
    where: { missionId_accountId: { missionId, accountId } }
  });

  if (existing && !mission.allowRepeat) {
    throw new AppError("Mission already accepted", 409, "MISSION_ALREADY_ACCEPTED");
  }

  const submission = existing
    ? await prisma.missionSubmission.update({
        where: { id: existing.id },
        data: { lifecycleStatus: "DOING" }
      })
    : await prisma.missionSubmission.create({
        data: {
          missionId,
          accountId,
          lifecycleStatus: "ACCEPTED",
          status: "OPEN"
        }
      });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "MISSION_ACCEPTED",
      targetType: "MissionSubmission",
      targetId: submission.id,
      metadata: { missionId, audience: mission.audience as MissionAudience }
    }
  });

  await prisma.analyticsEvent.create({
    data: {
      eventName: "mission_accept",
      userId: accountId,
      sessionId: `srv_${accountId}`,
      campaignId: mission.campaignId,
      brandId: mission.campaign.brandId,
      creatorId: mission.audience === "CREATOR" ? accountId : null,
      metadata: { audience: mission.audience }
    }
  });

  if (mission.audience === "CREATOR") {
    await prisma.analyticsEvent.create({
      data: {
        eventName: "creator_apply_job",
        userId: accountId,
        sessionId: `srv_${accountId}`,
        campaignId: mission.campaignId,
        brandId: mission.campaign.brandId,
        creatorId: accountId
      }
    });
  }

  return submission;
}

export async function submitMissionProof(
  submissionId: string,
  accountId: string,
  payload: {
    videoUrl?: string;
    imageUrl?: string;
    socialPostUrl?: string;
    screenshotUrl?: string;
    fileUploadUrl?: string;
    proofTextNote?: string;
    note?: string;
  }
) {
  const submission = await prisma.missionSubmission.findUnique({
    where: { id: submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (submission.accountId !== accountId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  ensureSubmissionMutable(submission.lifecycleStatus);
  if (isPast(submission.mission.deadlineAt)) throw new AppError("Submit past deadline", 409, "MISSION_DEADLINE_PASSED");

  const updated = await prisma.missionSubmission.update({
    where: { id: submission.id },
    data: {
      ...payload,
      lifecycleStatus: "PENDING_REVIEW",
      status: "SUBMITTED",
      reviewedById: null,
      reviewedAt: null,
      rejectReason: null
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "MISSION_PROOF_SUBMITTED",
      targetType: "MissionSubmission",
      targetId: updated.id,
      metadata: payload
    }
  });

  await prisma.analyticsEvent.create({
    data: {
      eventName: "mission_submit",
      userId: accountId,
      sessionId: `srv_${accountId}`,
      campaignId: submission.mission.campaignId,
      brandId: submission.mission.campaign.brandId,
      creatorId: accountId
    }
  });

  const proofUrls = [payload.videoUrl, payload.socialPostUrl, payload.imageUrl].filter(Boolean) as string[];
  await Promise.all([
    flagProofSpam(accountId),
    ...proofUrls.map((url) => flagDuplicateProofUrl(accountId, url, updated.id))
  ]);

  return updated;
}

export async function listMyMissions(accountId: string) {
  return prisma.missionSubmission.findMany({
    where: { accountId },
    orderBy: { updatedAt: "desc" },
    include: {
      mission: { include: { campaign: { select: { id: true, title: true, slug: true } } } },
      reviews: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { id: true, displayName: true, role: true } } } }
    }
  });
}

export async function listAdminProofQueue() {
  return prisma.missionSubmission.findMany({
    where: { lifecycleStatus: { in: ["PENDING_REVIEW", "REJECTED"] } },
    orderBy: { updatedAt: "asc" },
    include: { mission: { include: { campaign: true } }, account: { select: { id: true, displayName: true, email: true } }, reviews: true }
  });
}

export async function approveProof(submissionId: string, reviewerId: string, reviewerRole: Role, note?: string) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.missionSubmission.findUnique({
      where: { id: submissionId },
      include: { mission: { include: { campaign: true } }, reviews: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
    if (submission.lifecycleStatus === "DONE") throw new AppError("Already approved", 409, "DOUBLE_APPROVE");
    if (submission.lifecycleStatus !== "PENDING_REVIEW" && submission.lifecycleStatus !== "REJECTED") {
      throw new AppError("Submission not reviewable", 409, "SUBMISSION_NOT_REVIEWABLE");
    }

    const updated = await tx.missionSubmission.update({
      where: { id: submission.id },
      data: {
        lifecycleStatus: "DONE",
        status: "APPROVED",
        approvedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        rejectReason: null
      }
    });

    await tx.proofReview.create({
      data: {
        submissionId: submission.id,
        missionId: submission.missionId,
        reviewerId,
        reviewerRole,
        decision: "APPROVED",
        note
      }
    });

    if (!submission.rewardHold) {
      await grantRewardOnce(tx, submission.id, submission.accountId);
    }

    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "MISSION_PROOF_APPROVED",
        targetType: "MissionSubmission",
        targetId: submission.id,
        metadata: { reviewerRole, note: note ?? null, rewardHold: submission.rewardHold }
      }
    });

    await tx.analyticsEvent.create({
      data: {
        eventName: "proof_approved",
        userId: submission.accountId,
        sessionId: `srv_${submission.accountId}`,
        campaignId: submission.mission.campaignId,
        brandId: submission.mission.campaign.brandId,
        creatorId: submission.accountId
      }
    });

    return updated;
  });
}

export async function rejectProof(
  submissionId: string,
  reviewerId: string,
  reviewerRole: Role,
  rejectReason: string,
  note?: string
) {
  if (!rejectReason) throw new AppError("reject_reason is required", 422, "REJECT_REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const submission = await tx.missionSubmission.findUnique({
      where: { id: submissionId },
      include: { mission: { include: { campaign: true } } }
    });
    if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
    if (submission.lifecycleStatus === "DONE") {
      throw new AppError("Approved proof cannot be rejected", 409, "SUBMISSION_FINALIZED");
    }
    if (submission.lifecycleStatus !== "PENDING_REVIEW" && submission.lifecycleStatus !== "REJECTED") {
      throw new AppError("Submission not reviewable", 409, "SUBMISSION_NOT_REVIEWABLE");
    }

    const updated = await tx.missionSubmission.update({
      where: { id: submission.id },
      data: {
        lifecycleStatus: "REJECTED",
        status: "REJECTED",
        rejectReason,
        reviewedAt: new Date(),
        reviewedById: reviewerId
      }
    });

    await tx.proofReview.create({
      data: {
        submissionId: submission.id,
        missionId: submission.missionId,
        reviewerId,
        reviewerRole,
        decision: "REJECTED",
        rejectReason,
        note
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "MISSION_PROOF_REJECTED",
        targetType: "MissionSubmission",
        targetId: submission.id,
        metadata: { reviewerRole, rejectReason, note: note ?? null }
      }
    });

    await tx.analyticsEvent.create({
      data: {
        eventName: "proof_rejected",
        userId: submission.accountId,
        sessionId: `srv_${submission.accountId}`,
        campaignId: submission.mission.campaignId,
        brandId: submission.mission.campaign.brandId,
        creatorId: submission.accountId,
        metadata: { rejectReason }
      }
    });

    return updated;
  });
}

export async function reviewProofAsBrand(
  submissionId: string,
  reviewerId: string,
  reviewerRole: Role,
  decision: "APPROVED" | "REJECTED",
  rejectReason?: string,
  note?: string
) {
  const submission = await prisma.missionSubmission.findUnique({
    where: { id: submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (submission.mission.audience !== "CREATOR") {
    throw new AppError("Brand review only supports creator missions", 403, "BRAND_REVIEW_NOT_ALLOWED");
  }
  if (submission.mission.campaign.brandId !== reviewerId) {
    throw new AppError("Only mission owner brand can review", 403, "BRAND_FORBIDDEN");
  }

  if (decision === "APPROVED") return approveProof(submissionId, reviewerId, reviewerRole, note);
  return rejectProof(submissionId, reviewerId, reviewerRole, rejectReason ?? "", note);
}
