import {
  ApplicationStatus,
  CreatorMissionPublishStatus,
  CreatorMissionVideoReviewStatus,
  DepositStatus,
  NotificationEvent,
  Prisma,
  ProductReceiveOption,
  ProductStatus,
  ReimbursementStatus
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createNotification } from "@/lib/services/notification.service";
import { saveTextUpload } from "@/lib/storage/upload";

type DbClient = Prisma.TransactionClient | typeof prisma;
type Sort = "newest" | "oldest";

const creatorMissionInclude = {
  mission: {
    select: {
      id: true,
      title: true,
      description: true,
      productLink: true,
      rewardPoints: true,
      rewardCommissionVnd: true,
      productReceiveOption: true,
      deadlineAt: true
    }
  },
  campaign: { select: { id: true, title: true, slug: true, brandId: true } },
  account: {
    select: {
      id: true,
      displayName: true,
      email: true,
      creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } }
    }
  },
  submission: {
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      lifecycleStatus: true,
      status: true,
      videoUrl: true,
      socialPostUrl: true,
      screenshotUrl: true,
      fileUploadUrl: true,
      proofTextNote: true,
      note: true,
      rejectReason: true,
      purchaseBillImageUrl: true,
      productReviewScreenshotUrl: true,
      purchaseProofNote: true,
      purchaseConfirmedAt: true,
      publicVideoUrl: true,
      adCode: true,
      finalProofNote: true,
      finalSubmittedAt: true,
      reviewedAt: true,
      approvedAt: true,
      rewardGrantedAt: true
    }
  },
  missionApplication: {
    select: { id: true, status: true, note: true, rejectReason: true, reviewedAt: true, createdAt: true }
  }
} satisfies Prisma.CreatorMissionInclude;

type CreatorMissionEntity = Prisma.CreatorMissionGetPayload<{ include: typeof creatorMissionInclude }>;

function dt(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function now() {
  return new Date();
}

function normalizeTranscriptHtml(raw: string) {
  const withoutScripts = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");

  const normalizedBlocks = withoutScripts
    .replace(/<(\/?)div\b/gi, "<$1p")
    .replace(/<(\/?)h1\b/gi, "<$1h3")
    .replace(/<(\/?)h2\b/gi, "<$1h3");

  const withoutEvents = normalizedBlocks
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");

  const withoutJsHref = withoutEvents.replace(
    /\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
    ""
  );

  return withoutJsHref.replace(
    /<\/?([a-z0-9-]+)(\s[^>]*?)?>/gi,
    (match, tagName: string) => {
      const tag = tagName.toLowerCase();
      const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "blockquote"]);
      return allowed.has(tag) ? match : "";
    }
  );
}

function transcriptHtmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h3|h4|blockquote)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toPagination(page?: number, limit?: number) {
  const safePage = Number.isFinite(page) && (page ?? 0) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(limit) && (limit ?? 0) > 0 ? Math.min(Number(limit), 100) : 20;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

function toCreatorMissionState(option: ProductReceiveOption) {
  if (option === "NO_PRODUCT_REQUIRED") {
    return {
      status: "IN_PROGRESS" as const,
      productStatus: "NOT_REQUIRED" as ProductStatus,
      depositStatus: "NOT_REQUIRED" as DepositStatus,
      reimbursementStatus: "NOT_REQUIRED" as ReimbursementStatus,
      startedAt: now()
    };
  }

  if (option === "CREATOR_BUY_FIRST") {
    return {
      status: "PRODUCT_PENDING" as const,
      productStatus: "WAITING_PURCHASE" as ProductStatus,
      depositStatus: "NOT_REQUIRED" as DepositStatus,
      reimbursementStatus: "PENDING" as ReimbursementStatus,
      startedAt: null
    };
  }

  return {
    status: "PRODUCT_PENDING" as const,
    productStatus: "WAITING_DEPOSIT" as ProductStatus,
    depositStatus: "PENDING" as DepositStatus,
    reimbursementStatus: "NOT_REQUIRED" as ReimbursementStatus,
    startedAt: null
  };
}

function mapMission(item: CreatorMissionEntity) {
  return {
    id: item.id,
    missionId: item.missionId,
    campaignId: item.campaignId,
    accountId: item.accountId,
    submissionId: item.submissionId,
    missionApplicationId: item.missionApplicationId,
    status: item.status,
    productReceiveOption: item.productReceiveOption,
    productStatus: item.productStatus,
    depositStatus: item.depositStatus,
    reimbursementStatus: item.reimbursementStatus,
    reimbursementAmountVnd: item.reimbursementAmountVnd,
    purchaseProofTextNote: item.purchaseProofTextNote,
    purchaseProofScreenshotUrl: item.purchaseProofScreenshotUrl,
    purchaseProofNote: item.purchaseProofNote,
    purchaseProofSubmittedAt: dt(item.purchaseProofSubmittedAt),
    purchaseProofReviewedAt: dt(item.purchaseProofReviewedAt),
    purchaseProofRejectReason: item.purchaseProofRejectReason,
    productPurchasedConfirmedAt: dt(item.productPurchasedConfirmedAt),
    videoReviewStatus: item.videoReviewStatus,
    videoReviewFeedback: item.videoReviewFeedback,
    videoSubmittedAt: dt(item.videoSubmittedAt),
    videoReviewedAt: dt(item.videoReviewedAt),
    publishStatus: item.publishStatus,
    publishFeedback: item.publishFeedback,
    publishSubmittedAt: dt(item.publishSubmittedAt),
    publishReviewedAt: dt(item.publishReviewedAt),
    publishPurchaseAmountVnd: item.publishPurchaseAmountVnd,
    rewardCreditedAt: dt(item.rewardCreditedAt),
    assignedAt: item.assignedAt.toISOString(),
    startedAt: dt(item.startedAt),
    completedAt: dt(item.completedAt),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    mission: { ...item.mission, deadlineAt: dt(item.mission.deadlineAt) },
    campaign: item.campaign,
    account: item.account,
    submission: item.submission
      ? {
          ...item.submission,
          purchaseConfirmedAt: dt(item.submission.purchaseConfirmedAt),
          finalSubmittedAt: dt(item.submission.finalSubmittedAt),
          reviewedAt: dt(item.submission.reviewedAt),
          approvedAt: dt(item.submission.approvedAt),
          rewardGrantedAt: dt(item.submission.rewardGrantedAt)
        }
      : null,
    missionApplication: item.missionApplication
      ? { ...item.missionApplication, reviewedAt: dt(item.missionApplication.reviewedAt), createdAt: item.missionApplication.createdAt.toISOString() }
      : null
  };
}

async function getMissionById(id: string) {
  return prisma.creatorMission.findUnique({ where: { id }, include: creatorMissionInclude });
}

async function getMissionByIdForAccount(id: string, accountId: string) {
  const mission = await getMissionById(id);
  if (!mission) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (mission.accountId !== accountId) throw new AppError("Forbidden", 403, "CREATOR_MISSION_FORBIDDEN");
  return mission;
}

async function ensureSubmission(tx: Prisma.TransactionClient, missionId: string, accountId: string, note?: string | null) {
  const existing = await tx.missionSubmission.findUnique({
    where: { missionId_accountId: { missionId, accountId } }
  });
  if (existing) return existing;
  return tx.missionSubmission.create({
    data: {
      missionId,
      accountId,
      lifecycleStatus: "ACCEPTED",
      status: "OPEN",
      note: note ?? null
    }
  });
}

async function notifyCreator(accountId: string, event: NotificationEvent, title: string, content: string, metadata: Record<string, unknown>) {
  await createNotification({ accountId, event, title, content, metadata });
}

async function creditPointsOnce(
  tx: Prisma.TransactionClient,
  accountId: string,
  pointsDelta: number,
  referenceType: string,
  referenceId: string,
  idempotencyKey: string
) {
  if (pointsDelta <= 0) return;
  const wallet = await tx.wallet.upsert({
    where: { userId: accountId },
    create: { userId: accountId },
    update: {}
  });
  const existing = await tx.walletTransaction.findUnique({
    where: { walletId_idempotencyKey: { walletId: wallet.id, idempotencyKey } }
  });
  if (existing) return;
  const current = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { pointsBalance: current.pointsBalance + pointsDelta }
  });
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      accountId,
      type: "ADJUSTMENT",
      pointsDelta,
      cashDeltaVnd: 0,
      balanceAfterPoints: updated.pointsBalance,
      balanceAfterCashVnd: updated.cashBalanceVnd,
      referenceType,
      referenceId,
      idempotencyKey
    }
  });
}

async function syncCreatorMissions(accountId: string) {
  const approvedApps = await prisma.missionApplication.findMany({
    where: { accountId, status: "APPROVED" },
    select: { id: true, missionId: true, campaignId: true, note: true }
  });

  for (const app of approvedApps) {
    await prisma.$transaction(async (tx) => {
      const submission = await ensureSubmission(tx, app.missionId, accountId, app.note);
      await ensureCreatorMissionFromApprovedApplication(tx, {
        missionId: app.missionId,
        campaignId: app.campaignId,
        accountId,
        missionApplicationId: app.id,
        submissionId: submission.id
      });
    });
  }
}

export function getCreatorMissionGuidanceByOption(option: ProductReceiveOption) {
  if (option === "DEPOSIT_PRODUCT") return "Ban can dat coc va nhan san pham truoc khi quay video.";
  if (option === "CREATOR_BUY_FIRST") return "Ban tu mua san pham, gui bill + anh danh gia, sau do nop video va link public.";
  return "Nhiem vu khong yeu cau san pham, co the nop video ngay.";
}

export async function ensureCreatorMissionFromApprovedApplication(
  db: DbClient,
  input: {
    missionId: string;
    campaignId: string;
    accountId: string;
    applicationId?: string;
    missionApplicationId?: string;
    submissionId?: string;
  }
) {
  const mission = await db.mission.findUnique({
    where: { id: input.missionId },
    select: { id: true, productReceiveOption: true }
  });
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");

  const existing = await db.creatorMission.findUnique({
    where: { missionId_accountId: { missionId: input.missionId, accountId: input.accountId } }
  });

  if (existing) {
    return db.creatorMission.update({
      where: { id: existing.id },
      data: {
        submissionId: existing.submissionId ?? input.submissionId ?? input.applicationId ?? null,
        missionApplicationId: existing.missionApplicationId ?? input.missionApplicationId ?? null
      }
    });
  }

  const initial = toCreatorMissionState(mission.productReceiveOption);
  return db.creatorMission.create({
    data: {
      missionId: input.missionId,
      campaignId: input.campaignId,
      accountId: input.accountId,
      submissionId: input.submissionId ?? input.applicationId ?? null,
      missionApplicationId: input.missionApplicationId ?? null,
      status: initial.status,
      productReceiveOption: mission.productReceiveOption,
      productStatus: initial.productStatus,
      depositStatus: initial.depositStatus,
      reimbursementStatus: initial.reimbursementStatus,
      assignedAt: now(),
      startedAt: initial.startedAt,
      videoReviewStatus: "NOT_SUBMITTED",
      publishStatus: "NOT_SUBMITTED"
    }
  });
}

export async function getMyCreatorMissions(accountId: string) {
  await syncCreatorMissions(accountId);
  const rows = await prisma.creatorMission.findMany({
    where: { accountId },
    include: creatorMissionInclude,
    orderBy: { updatedAt: "desc" }
  });
  return rows.map(mapMission);
}

export async function listCreatorMissionsForAdmin() {
  const rows = await prisma.creatorMission.findMany({
    include: creatorMissionInclude,
    orderBy: { updatedAt: "desc" }
  });
  return rows.map(mapMission);
}

export async function confirmDepositPaid(creatorMissionId: string, accountId: string) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "DEPOSIT_PRODUCT") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: { status: "IN_PROGRESS", productStatus: "RECEIVED", depositStatus: "PAID", startedAt: current.startedAt ?? now() },
    include: creatorMissionInclude
  });
  return mapMission(updated);
}

export async function submitPurchaseProof(creatorMissionId: string, accountId: string, payload: { proofTextNote: string; screenshotUrl?: string; note?: string }) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  if (!current.submissionId) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        purchaseBillImageUrl: payload.screenshotUrl ?? null,
        purchaseProofNote: payload.proofTextNote,
        note: payload.note ?? null,
        purchaseConfirmedAt: now()
      }
    });
    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        purchaseProofTextNote: payload.proofTextNote,
        purchaseProofScreenshotUrl: payload.screenshotUrl ?? null,
        purchaseProofNote: payload.note ?? null,
        purchaseProofSubmittedAt: now(),
        productStatus: "RECEIVED",
        reimbursementStatus: "PENDING",
        status: "IN_PROGRESS",
        startedAt: current.startedAt ?? now()
      }
    });
  });
  const updated = await getMissionById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapMission(updated);
}

export async function submitDraft(creatorMissionId: string, accountId: string, payload: { videoUrl: string; note?: string }) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (!current.submissionId) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.status === "DRAFT_PENDING") {
    throw new AppError("Transcript must be approved first", 409, "CREATOR_MISSION_TRANSCRIPT_NOT_APPROVED");
  }
  if (current.productReceiveOption === "CREATOR_BUY_FIRST" && current.productStatus !== "RECEIVED") {
    throw new AppError("Purchase proof is required before video submission", 409, "PURCHASE_PROOF_REQUIRED");
  }
  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        videoUrl: payload.videoUrl,
        note: payload.note ?? null,
        status: "SUBMITTED",
        lifecycleStatus: "SUBMITTED",
        rejectReason: null,
        reviewedById: null,
        reviewedAt: null,
        approvedAt: null
      }
    });
    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        videoReviewStatus: "PENDING",
        videoReviewFeedback: null,
        videoSubmittedAt: now(),
        publishStatus: "NOT_SUBMITTED",
        publishFeedback: null
      }
    });
  });
  const updated = await getMissionById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return { creatorMission: mapMission(updated), submissionId: updated.submissionId, submissionLifecycleStatus: updated.submission?.lifecycleStatus ?? null };
}

export async function confirmDepositAndProductReceivedByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "DEPOSIT_PRODUCT") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      status: "IN_PROGRESS",
      productStatus: "RECEIVED",
      depositStatus: "PAID",
      purchaseProofReviewedAt: now(),
      purchaseProofRejectReason: null,
      startedAt: current.startedAt ?? now()
    },
    include: creatorMissionInclude
  });
  await notifyCreator(updated.accountId, "MISSION_APPLICATION_APPROVED", "Da xac nhan nhan san pham", "Admin da xac nhan buoc san pham.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function approvePurchaseProofByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      status: "IN_PROGRESS",
      productStatus: "RECEIVED",
      reimbursementStatus: "APPROVED",
      purchaseProofReviewedAt: now(),
      purchaseProofRejectReason: null,
      startedAt: current.startedAt ?? now()
    },
    include: creatorMissionInclude
  });
  await notifyCreator(updated.accountId, "MISSION_APPLICATION_APPROVED", "Da duyet bang chung mua hang", "Ban co the nop video review.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function rejectPurchaseProofByAdmin(actorId: string, creatorMissionId: string, reason?: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const feedback = reason?.trim() || "Purchase proof rejected";
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      status: "PRODUCT_PENDING",
      productStatus: "WAITING_PURCHASE",
      reimbursementStatus: "REJECTED",
      purchaseProofReviewedAt: now(),
      purchaseProofRejectReason: feedback
    },
    include: creatorMissionInclude
  });
  await notifyCreator(updated.accountId, "MISSION_APPLICATION_REJECTED", "Bang chung mua hang bi tu choi", feedback, { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function confirmProductPurchased(creatorMissionId: string, accountId: string) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      status: "IN_PROGRESS",
      productStatus: "RECEIVED",
      reimbursementStatus: "PENDING",
      productPurchasedConfirmedAt: now(),
      startedAt: current.startedAt ?? now()
    },
    include: creatorMissionInclude
  });
  return mapMission(updated);
}

export async function submitPublishReport(
  creatorMissionId: string,
  accountId: string,
  payload: { socialPostUrl: string; adCode?: string; purchaseInvoiceUrl?: string; ratingImageUrl?: string; note?: string }
) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.videoReviewStatus !== "APPROVED") throw new AppError("Video must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  if (!current.submissionId) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        socialPostUrl: payload.socialPostUrl,
        publicVideoUrl: payload.socialPostUrl,
        adCode: payload.adCode ?? null,
        proofTextNote: payload.adCode ?? null,
        screenshotUrl: payload.purchaseInvoiceUrl ?? null,
        productReviewScreenshotUrl: payload.ratingImageUrl ?? null,
        finalProofNote: payload.note ?? null,
        finalSubmittedAt: now(),
        status: "SUBMITTED",
        lifecycleStatus: "SUBMITTED",
        rejectReason: null,
        reviewedById: null,
        reviewedAt: null
      }
    });
    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: { publishStatus: "PENDING", publishFeedback: null, publishSubmittedAt: now(), publishReviewedAt: null }
    });
  });
  const updated = await getMissionById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapMission(updated);
}

export async function approveVideoReviewByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current || !current.submissionId) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.videoReviewStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: { status: "APPROVED", lifecycleStatus: "APPROVED", rejectReason: null, reviewedById: actorId, reviewedAt: now(), approvedAt: now() }
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: { status: "IN_PROGRESS", videoReviewStatus: "APPROVED", videoReviewFeedback: null, videoReviewedAt: now(), publishStatus: "NOT_SUBMITTED", publishFeedback: null },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_MISSION_VIDEO_APPROVED", "Video duoc duyet", "Ban co the nop link social public.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function rejectVideoReviewByAdmin(actorId: string, creatorMissionId: string, reason: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current || !current.submissionId) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.videoReviewStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const feedback = reason.trim();
  if (!feedback) throw new AppError("reason is required", 422, "REJECT_REASON_REQUIRED");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: { status: "REJECTED", lifecycleStatus: "REJECTED", rejectReason: feedback, reviewedById: actorId, reviewedAt: now(), approvedAt: null }
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        videoReviewStatus: "REJECTED",
        videoReviewFeedback: feedback,
        videoReviewedAt: now(),
        publishStatus: "NOT_SUBMITTED",
        publishFeedback: null,
        publishSubmittedAt: null,
        publishReviewedAt: null
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_MISSION_VIDEO_REJECTED", "Video bi tu choi", feedback, { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function approvePublishReportByAdmin(actorId: string, creatorMissionId: string, purchaseAmountVnd: number) {
  const current = await getMissionById(creatorMissionId);
  if (!current || !current.submissionId) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus === "APPROVED" && current.status === "COMPLETED") return mapMission(current);
  if (current.publishStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  if (current.videoReviewStatus !== "APPROVED") throw new AppError("Video must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  if (current.productReceiveOption === "CREATOR_BUY_FIRST" && purchaseAmountVnd <= 0) {
    throw new AppError("Reimbursement amount is required", 422, "REIMBURSEMENT_AMOUNT_REQUIRED");
  }
  const reimbursementVnd = current.productReceiveOption === "CREATOR_BUY_FIRST" ? Math.floor(purchaseAmountVnd) : 0;
  const reimbursementPoints = reimbursementVnd > 0 ? Math.floor(reimbursementVnd / 100) : 0;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: { status: "APPROVED", lifecycleStatus: "DONE", rejectReason: null, reviewedById: actorId, reviewedAt: now(), approvedAt: now(), rewardGrantedAt: now() }
    });

    await creditPointsOnce(tx, current.accountId, current.mission.rewardPoints, "CREATOR_MISSION_REWARD", creatorMissionId, `creator_mission_reward_${creatorMissionId}`);
    if (reimbursementPoints > 0) {
      await creditPointsOnce(tx, current.accountId, reimbursementPoints, "PRODUCT_REIMBURSEMENT", creatorMissionId, `creator_mission_reimbursement_${creatorMissionId}`);
    }

    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "COMPLETED",
        publishStatus: "APPROVED",
        publishFeedback: null,
        publishReviewedAt: now(),
        completedAt: current.completedAt ?? now(),
        rewardCreditedAt: current.rewardCreditedAt ?? now(),
        publishPurchaseAmountVnd: reimbursementVnd > 0 ? reimbursementVnd : current.publishPurchaseAmountVnd,
        reimbursementAmountVnd: reimbursementVnd > 0 ? reimbursementVnd : current.reimbursementAmountVnd,
        reimbursementStatus: current.productReceiveOption === "CREATOR_BUY_FIRST" ? "PAID" : current.reimbursementStatus
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_MISSION_FINAL_APPROVED", "Nhiem vu da hoan thanh", "Nhiem vu da duoc duyet va cong diem.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function rejectPublishReportByAdmin(actorId: string, creatorMissionId: string, reason: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current || !current.submissionId) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const feedback = reason.trim();
  if (!feedback) throw new AppError("reason is required", 422, "REJECT_REASON_REQUIRED");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({ where: { id: current.submissionId! }, data: { rejectReason: feedback, reviewedById: actorId, reviewedAt: now() } });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: { status: "IN_PROGRESS", publishStatus: "REJECTED", publishFeedback: feedback, publishReviewedAt: now() },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_MISSION_FINAL_REJECTED", "Buoc hoan thanh bi tu choi", feedback, { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function listCreatorMissionApplicationsByAccount(accountId: string) {
  return prisma.missionApplication.findMany({
    where: { accountId },
    include: {
      mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true, productLink: true } },
      campaign: { select: { id: true, title: true, slug: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getCreatorMissionDetail(accountId: string, creatorMissionId: string) {
  return mapMission(await getMissionByIdForAccount(creatorMissionId, accountId));
}

export async function submitCreatorMissionPurchaseProof(
  accountId: string,
  creatorMissionId: string,
  payload: { purchaseBillImageUrl: string; productReviewScreenshotUrl: string; purchaseProofNote?: string }
) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (!current.submissionId) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        purchaseBillImageUrl: payload.purchaseBillImageUrl,
        productReviewScreenshotUrl: payload.productReviewScreenshotUrl,
        purchaseProofNote: payload.purchaseProofNote ?? null,
        purchaseConfirmedAt: now()
      }
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        purchaseProofSubmittedAt: now(),
        productStatus: "RECEIVED",
        status: "IN_PROGRESS",
        reimbursementStatus: "PENDING",
        startedAt: current.startedAt ?? now()
      },
      include: creatorMissionInclude
    });
  });
  return mapMission(updated);
}

export async function submitCreatorMissionVideo(accountId: string, creatorMissionId: string, payload: { videoUrl: string; note?: string }) {
  return submitDraft(creatorMissionId, accountId, payload);
}

export async function submitCreatorMissionTranscript(accountId: string, creatorMissionId: string, transcript: string) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (!current.submissionId) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.status === "COMPLETED") throw new AppError("Mission already completed", 409, "CREATOR_MISSION_ALREADY_COMPLETED");
  if (current.videoReviewStatus === "PENDING" || current.videoReviewStatus === "APPROVED") {
    throw new AppError("Video review already started", 409, "CREATOR_MISSION_VIDEO_ALREADY_STARTED");
  }
  if (current.productReceiveOption === "CREATOR_BUY_FIRST" && current.productStatus !== "RECEIVED") {
    throw new AppError("Purchase proof is required before transcript submission", 409, "PURCHASE_PROOF_REQUIRED");
  }

  const sanitizedHtml = normalizeTranscriptHtml(transcript.trim());
  const plainText = transcriptHtmlToPlainText(sanitizedHtml);
  if (!plainText) throw new AppError("Transcript is required", 422, "TRANSCRIPT_REQUIRED");
  const transcriptFileUrl = await saveTextUpload({
    content: plainText,
    folder: "creator-transcript",
    suffix: `mission-transcript-${creatorMissionId}`,
    ext: "txt"
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        proofTextNote: sanitizedHtml,
        fileUploadUrl: transcriptFileUrl,
        status: "SUBMITTED",
        lifecycleStatus: "SUBMITTED",
        rejectReason: null,
        reviewedById: null,
        reviewedAt: null,
        approvedAt: null
      }
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "DRAFT_PENDING",
        videoReviewStatus: "NOT_SUBMITTED",
        videoReviewFeedback: null,
        videoSubmittedAt: null,
        videoReviewedAt: null
      },
      include: creatorMissionInclude
    });
  });

  return mapMission(updated);
}

export async function submitCreatorMissionPublish(
  accountId: string,
  creatorMissionId: string,
  payload: { publicVideoUrl?: string; socialPostUrl?: string; adCode?: string; screenshotUrl?: string; finalProofNote?: string }
) {
  const url = payload.publicVideoUrl ?? payload.socialPostUrl;
  if (!url?.trim()) throw new AppError("publicVideoUrl or socialPostUrl is required", 422, "SOCIAL_POST_URL_REQUIRED");
  return submitPublishReport(creatorMissionId, accountId, {
    socialPostUrl: url.trim(),
    adCode: payload.adCode,
    purchaseInvoiceUrl: payload.screenshotUrl,
    note: payload.finalProofNote
  });
}

export async function createMissionApplicationForCreator(accountId: string, payload: { missionId: string; note?: string }) {
  const profile = await prisma.creatorProfile.findUnique({ where: { accountId }, select: { id: true, mainPlatform: true } });
  if (!profile || !profile.mainPlatform) {
    throw new AppError("Ban can hoan thien ho so Creator va chon nen tang chinh truoc khi xin lam nhiem vu.", 422, "CREATOR_PROFILE_MAIN_PLATFORM_REQUIRED");
  }
  const mission = await prisma.mission.findUnique({
    where: { id: payload.missionId },
    select: {
      id: true,
      campaignId: true,
      status: true,
      campaign: { select: { isPublic: true, status: true } }
    }
  });
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");
  if (mission.status !== "OPEN") throw new AppError("Mission is not open", 409, "MISSION_NOT_OPEN");
  if (!mission.campaign.isPublic || mission.campaign.status !== "ACTIVE") throw new AppError("Campaign is not open", 409, "CAMPAIGN_NOT_OPEN");

  const existing = await prisma.missionApplication.findUnique({
    where: { missionId_accountId: { missionId: mission.id, accountId } }
  });
  if (existing) throw new AppError("Ban da xin lam nhiem vu nay", 409, "MISSION_APPLICATION_ALREADY_EXISTS");

  return prisma.missionApplication.create({
    data: {
      missionId: mission.id,
      campaignId: mission.campaignId,
      accountId,
      status: "PENDING_REVIEW",
      note: payload.note?.trim() || null
    },
    include: {
      mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true } },
      campaign: { select: { id: true, title: true, slug: true } }
    }
  });
}

function toOrder(sort?: Sort) {
  return sort === "oldest" ? "asc" : "desc";
}

async function resolveBrandOwnerAccountId(accountId: string) {
  const ownedBrand = await prisma.brand.findFirst({
    where: { ownerAccountId: accountId },
    select: { ownerAccountId: true },
    orderBy: { createdAt: "desc" }
  });
  if (ownedBrand) return ownedBrand.ownerAccountId;

  const membership = await prisma.brandMember.findFirst({
    where: { accountId },
    select: { brand: { select: { ownerAccountId: true } } },
    orderBy: { createdAt: "desc" }
  });
  if (membership) return membership.brand.ownerAccountId;

  throw new AppError("Brand access is not configured for this account", 403, "BRAND_ACCESS_NOT_CONFIGURED");
}

export async function listMissionApplicationsForAdmin(input: {
  query?: string;
  status?: ApplicationStatus;
  campaignId?: string;
  campaign?: string;
  sort?: Sort;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.MissionApplicationWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = { title: { contains: input.campaign.trim(), mode: "insensitive" } };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.missionApplication.count({ where }),
    prisma.missionApplication.findMany({
      where,
      include: {
        account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } } } },
        campaign: { select: { id: true, title: true, slug: true } },
        mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true, productLink: true } },
        reviewedBy: { select: { id: true, displayName: true, email: true } }
      },
      orderBy: { createdAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items, pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionApplicationDetailForAdmin(id: string) {
  const item = await prisma.missionApplication.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true, bio: true } } } },
      campaign: { select: { id: true, title: true, slug: true, brandId: true } },
      mission: { select: { id: true, title: true, description: true, rewardPoints: true, productReceiveOption: true, productLink: true, deadlineAt: true } },
      reviewedBy: { select: { id: true, displayName: true, email: true } }
    }
  });
  if (!item) throw new AppError("Mission application not found", 404, "MISSION_APPLICATION_NOT_FOUND");
  return item;
}

export async function approveMissionApplicationByAdmin(actorId: string, id: string) {
  const current = await getMissionApplicationDetailForAdmin(id);
  if (current.status !== "PENDING_REVIEW") throw new AppError("Mission application is not pending review", 409, "MISSION_APPLICATION_INVALID_STATUS");
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.missionApplication.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: actorId, reviewedAt: now(), rejectReason: null }
    });
    const submission = await ensureSubmission(tx, current.missionId, current.accountId, current.note);
    await ensureCreatorMissionFromApprovedApplication(tx, {
      missionId: current.missionId,
      campaignId: current.campaignId,
      accountId: current.accountId,
      missionApplicationId: current.id,
      submissionId: submission.id
    });
    return next;
  });
  await notifyCreator(current.accountId, "MISSION_APPLICATION_APPROVED", "Don xin nhiem vu duoc duyet", `Ban da duoc duyet nhiem vu \"${current.mission.title}\".`, { missionApplicationId: id });
  return updated;
}

export async function rejectMissionApplicationByAdmin(actorId: string, id: string, rejectReason: string) {
  const current = await getMissionApplicationDetailForAdmin(id);
  if (current.status !== "PENDING_REVIEW") throw new AppError("Mission application is not pending review", 409, "MISSION_APPLICATION_INVALID_STATUS");
  const reason = rejectReason.trim();
  if (!reason) throw new AppError("rejectReason is required", 422, "REJECT_REASON_REQUIRED");
  const updated = await prisma.missionApplication.update({
    where: { id },
    data: { status: "REJECTED", rejectReason: reason, reviewedById: actorId, reviewedAt: now() }
  });
  await notifyCreator(current.accountId, "MISSION_APPLICATION_REJECTED", "Don xin nhiem vu bi tu choi", reason, { missionApplicationId: id });
  return updated;
}

export async function listMissionVideoReviewsForAdmin(input: {
  query?: string;
  campaignId?: string;
  campaign?: string;
  videoReviewStatus?: CreatorMissionVideoReviewStatus;
  sort?: Sort;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.CreatorMissionWhereInput = { videoReviewStatus: input.videoReviewStatus ?? "PENDING" };
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = { title: { contains: input.campaign.trim(), mode: "insensitive" } };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { videoSubmittedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionVideoReviewDetailForAdmin(id: string) {
  const item = await getMissionById(id);
  if (!item) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapMission(item);
}

export async function approveMissionVideoReviewByAdmin(actorId: string, id: string) {
  return approveVideoReviewByAdmin(actorId, id);
}

export async function rejectMissionVideoReviewByAdmin(actorId: string, id: string, feedback: string) {
  return rejectVideoReviewByAdmin(actorId, id, feedback);
}

export async function listMissionFinalReviewsForAdmin(input: {
  query?: string;
  campaignId?: string;
  campaign?: string;
  productReceiveOption?: ProductReceiveOption;
  publishStatus?: CreatorMissionPublishStatus;
  sort?: Sort;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.CreatorMissionWhereInput = { publishStatus: input.publishStatus ?? "PENDING" };
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = { title: { contains: input.campaign.trim(), mode: "insensitive" } };
  }
  if (input.productReceiveOption) where.productReceiveOption = input.productReceiveOption;
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { publishSubmittedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionFinalReviewDetailForAdmin(id: string) {
  const item = await getMissionById(id);
  if (!item) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapMission(item);
}

export async function approveMissionFinalReviewByAdmin(actorId: string, id: string, input?: { reimbursementAmountVnd?: number }) {
  return approvePublishReportByAdmin(actorId, id, input?.reimbursementAmountVnd ?? 0);
}

export async function rejectMissionFinalReviewByAdmin(actorId: string, id: string, feedback: string) {
  return rejectPublishReportByAdmin(actorId, id, feedback);
}

export async function listMissionTranscriptReviewsForAdmin(input: {
  query?: string;
  campaignId?: string;
  campaign?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  sort?: Sort;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.CreatorMissionWhereInput = {
    submission: { is: { proofTextNote: { not: null } } }
  };

  if (input.status === "PENDING") {
    where.status = "DRAFT_PENDING";
    where.submission = { is: { proofTextNote: { not: null }, status: "SUBMITTED" } };
  } else if (input.status === "REJECTED") {
    where.status = "DRAFT_PENDING";
    where.submission = { is: { proofTextNote: { not: null }, status: "REJECTED" } };
  } else if (input.status === "APPROVED") {
    where.status = { not: "DRAFT_PENDING" };
    where.submission = { is: { proofTextNote: { not: null }, status: "APPROVED" } };
  } else {
    where.status = "DRAFT_PENDING";
  }

  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = { title: { contains: input.campaign.trim(), mode: "insensitive" } };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { updatedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionTranscriptReviewDetailForAdmin(id: string) {
  const item = await getMissionById(id);
  if (!item || !item.submission?.proofTextNote) throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  return mapMission(item);
}

export async function approveMissionTranscriptReviewByAdmin(actorId: string, id: string) {
  const current = await getMissionById(id);
  if (!current || !current.submissionId || !current.submission?.proofTextNote) throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  if (current.status !== "DRAFT_PENDING" || current.submission.status !== "SUBMITTED") {
    throw new AppError("Transcript is not pending review", 409, "CREATOR_MISSION_TRANSCRIPT_INVALID_STATUS");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        status: "APPROVED",
        lifecycleStatus: "APPROVED",
        rejectReason: null,
        reviewedById: actorId,
        reviewedAt: now(),
        approvedAt: now()
      }
    });

    return tx.creatorMission.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        videoReviewFeedback: null,
        videoReviewStatus: "NOT_SUBMITTED",
        videoReviewedAt: null
      },
      include: creatorMissionInclude
    });
  });

  await notifyCreator(updated.accountId, "CREATOR_MISSION_VIDEO_APPROVED", "Kich ban duoc duyet", "Ban co the nop video review.", { creatorMissionId: id, actorId });
  return mapMission(updated);
}

export async function rejectMissionTranscriptReviewByAdmin(actorId: string, id: string, feedback: string) {
  const current = await getMissionById(id);
  if (!current || !current.submissionId || !current.submission?.proofTextNote) throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  if (current.status !== "DRAFT_PENDING" || current.submission.status !== "SUBMITTED") {
    throw new AppError("Transcript is not pending review", 409, "CREATOR_MISSION_TRANSCRIPT_INVALID_STATUS");
  }
  const reason = feedback.trim();
  if (!reason) throw new AppError("feedback is required", 422, "REJECT_REASON_REQUIRED");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.submissionId! },
      data: {
        status: "REJECTED",
        lifecycleStatus: "REJECTED",
        rejectReason: reason,
        reviewedById: actorId,
        reviewedAt: now(),
        approvedAt: null
      }
    });

    return tx.creatorMission.update({
      where: { id },
      data: {
        status: "DRAFT_PENDING",
        videoReviewFeedback: reason,
        videoReviewStatus: "NOT_SUBMITTED",
        videoReviewedAt: now()
      },
      include: creatorMissionInclude
    });
  });

  await notifyCreator(updated.accountId, "CREATOR_MISSION_VIDEO_REJECTED", "Kich ban bi tu choi", reason, { creatorMissionId: id, actorId });
  return mapMission(updated);
}

export async function listMissionApplicationsForBrand(
  accountId: string,
  input: {
    query?: string;
    status?: ApplicationStatus;
    campaignId?: string;
    campaign?: string;
    sort?: Sort;
    page?: number;
    limit?: number;
  }
) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const where: Prisma.MissionApplicationWhereInput = {
    campaign: { brandId: brandOwnerAccountId }
  };
  if (input.status) where.status = input.status;
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = {
      brandId: brandOwnerAccountId,
      title: { contains: input.campaign.trim(), mode: "insensitive" }
    };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }

  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.missionApplication.count({ where }),
    prisma.missionApplication.findMany({
      where,
      include: {
        account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } } } },
        campaign: { select: { id: true, title: true, slug: true } },
        mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true, productLink: true } },
        reviewedBy: { select: { id: true, displayName: true, email: true } }
      },
      orderBy: { createdAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items, pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionApplicationDetailForBrand(accountId: string, id: string) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const item = await getMissionApplicationDetailForAdmin(id);
  if (item.campaign.brandId !== brandOwnerAccountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return item;
}

export async function approveMissionApplicationByBrand(accountId: string, id: string) {
  await getMissionApplicationDetailForBrand(accountId, id);
  return approveMissionApplicationByAdmin(accountId, id);
}

export async function rejectMissionApplicationByBrand(accountId: string, id: string, rejectReason: string) {
  await getMissionApplicationDetailForBrand(accountId, id);
  return rejectMissionApplicationByAdmin(accountId, id, rejectReason);
}

export async function listMissionVideoReviewsForBrand(
  accountId: string,
  input: {
    query?: string;
    campaignId?: string;
    campaign?: string;
    videoReviewStatus?: CreatorMissionVideoReviewStatus;
    sort?: Sort;
    page?: number;
    limit?: number;
  }
) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const where: Prisma.CreatorMissionWhereInput = {
    campaign: { brandId: brandOwnerAccountId },
    videoReviewStatus: input.videoReviewStatus ?? "PENDING"
  };
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = {
      brandId: brandOwnerAccountId,
      title: { contains: input.campaign.trim(), mode: "insensitive" }
    };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { videoSubmittedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function listMissionTranscriptReviewsForBrand(
  accountId: string,
  input: {
    query?: string;
    campaignId?: string;
    campaign?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
    sort?: Sort;
    page?: number;
    limit?: number;
  }
) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const where: Prisma.CreatorMissionWhereInput = {
    campaign: { brandId: brandOwnerAccountId },
    submission: { is: { proofTextNote: { not: null } } }
  };

  if (input.status === "PENDING") {
    where.status = "DRAFT_PENDING";
    where.submission = { is: { proofTextNote: { not: null }, status: "SUBMITTED" } };
  } else if (input.status === "REJECTED") {
    where.status = "DRAFT_PENDING";
    where.submission = { is: { proofTextNote: { not: null }, status: "REJECTED" } };
  } else if (input.status === "APPROVED") {
    where.status = { not: "DRAFT_PENDING" };
    where.submission = { is: { proofTextNote: { not: null }, status: "APPROVED" } };
  } else {
    where.status = "DRAFT_PENDING";
  }

  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = {
      brandId: brandOwnerAccountId,
      title: { contains: input.campaign.trim(), mode: "insensitive" }
    };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { updatedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionTranscriptReviewDetailForBrand(accountId: string, id: string) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const item = await getMissionTranscriptReviewDetailForAdmin(id);
  if (item.campaign.brandId !== brandOwnerAccountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return item;
}

export async function approveMissionTranscriptReviewByBrand(accountId: string, id: string) {
  await getMissionTranscriptReviewDetailForBrand(accountId, id);
  return approveMissionTranscriptReviewByAdmin(accountId, id);
}

export async function rejectMissionTranscriptReviewByBrand(accountId: string, id: string, feedback: string) {
  await getMissionTranscriptReviewDetailForBrand(accountId, id);
  return rejectMissionTranscriptReviewByAdmin(accountId, id, feedback);
}

export async function getMissionVideoReviewDetailForBrand(accountId: string, id: string) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const item = await getMissionVideoReviewDetailForAdmin(id);
  if (item.campaign.brandId !== brandOwnerAccountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return item;
}

export async function approveMissionVideoReviewByBrand(accountId: string, id: string) {
  await getMissionVideoReviewDetailForBrand(accountId, id);
  return approveMissionVideoReviewByAdmin(accountId, id);
}

export async function rejectMissionVideoReviewByBrand(accountId: string, id: string, feedback: string) {
  await getMissionVideoReviewDetailForBrand(accountId, id);
  return rejectMissionVideoReviewByAdmin(accountId, id, feedback);
}

export async function listMissionFinalReviewsForBrand(
  accountId: string,
  input: {
    query?: string;
    campaignId?: string;
    campaign?: string;
    productReceiveOption?: ProductReceiveOption;
    publishStatus?: CreatorMissionPublishStatus;
    sort?: Sort;
    page?: number;
    limit?: number;
  }
) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const where: Prisma.CreatorMissionWhereInput = {
    campaign: { brandId: brandOwnerAccountId },
    publishStatus: input.publishStatus ?? "PENDING"
  };
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.campaign?.trim()) {
    where.campaign = {
      brandId: brandOwnerAccountId,
      title: { contains: input.campaign.trim(), mode: "insensitive" }
    };
  }
  if (input.productReceiveOption) where.productReceiveOption = input.productReceiveOption;
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { publishSubmittedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionFinalReviewDetailForBrand(accountId: string, id: string) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const item = await getMissionFinalReviewDetailForAdmin(id);
  if (item.campaign.brandId !== brandOwnerAccountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return item;
}

export async function approveMissionFinalReviewByBrand(accountId: string, id: string, input?: { reimbursementAmountVnd?: number }) {
  await getMissionFinalReviewDetailForBrand(accountId, id);
  return approveMissionFinalReviewByAdmin(accountId, id, input);
}

export async function rejectMissionFinalReviewByBrand(accountId: string, id: string, feedback: string) {
  await getMissionFinalReviewDetailForBrand(accountId, id);
  return rejectMissionFinalReviewByAdmin(accountId, id, feedback);
}
