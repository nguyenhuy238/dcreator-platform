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
  campaign: { select: { id: true, title: true, slug: true, brandId: true, brand: { select: { displayName: true } } } },
  account: {
    select: {
      id: true,
      displayName: true,
      email: true,
      creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } }
    }
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
  const submission = {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lifecycleStatus: item.submissionLifecycleStatus,
    status: item.submissionStatus,
    videoUrl: item.submissionVideoUrl,
    socialPostUrl: item.submissionSocialPostUrl,
    screenshotUrl: item.submissionScreenshotUrl,
    fileUploadUrl: item.submissionFileUploadUrl,
    proofTextNote: item.submissionProofTextNote,
    note: item.submissionNote,
    rejectReason: item.submissionRejectReason,
    purchaseBillImageUrl: item.submissionPurchaseBillImageUrl,
    productReviewScreenshotUrl: item.submissionProductReviewScreenshotUrl,
    purchaseProofNote: item.submissionPurchaseProofNote,
    purchaseConfirmedAt: item.submissionPurchaseConfirmedAt,
    publicVideoUrl: item.submissionPublicVideoUrl,
    adCode: item.submissionAdCode,
    finalProofNote: item.submissionFinalProofNote,
    finalSubmittedAt: item.submissionFinalSubmittedAt,
    reviewedAt: item.submissionReviewedAt,
    approvedAt: item.submissionApprovedAt,
    rewardGrantedAt: item.submissionRewardGrantedAt
  };

  const missionApplication = {
    id: item.id,
    status: item.applicationStatus,
    note: item.applicationNote,
    rejectReason: item.applicationRejectReason,
    reviewedAt: item.applicationReviewedAt,
    createdAt: item.appliedAt
  };

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
    submission: {
      ...submission,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      purchaseConfirmedAt: dt(submission.purchaseConfirmedAt),
      finalSubmittedAt: dt(submission.finalSubmittedAt),
      reviewedAt: dt(submission.reviewedAt),
      approvedAt: dt(submission.approvedAt),
      rewardGrantedAt: dt(submission.rewardGrantedAt)
    },
    missionApplication: {
      ...missionApplication,
      reviewedAt: dt(missionApplication.reviewedAt),
      createdAt: missionApplication.createdAt.toISOString()
    }
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

async function syncLegacySubmission(
  tx: Prisma.TransactionClient,
  missionId: string,
  accountId: string,
  submissionId: string | null | undefined,
  data: Prisma.MissionSubmissionUpdateManyMutationInput
) {
  if (submissionId) {
    await tx.missionSubmission.updateMany({
      where: { id: submissionId },
      data
    });
    return;
  }

  await tx.missionSubmission.updateMany({
    where: { missionId, accountId },
    data
  });
}

async function notifyCreator(accountId: string, event: NotificationEvent, title: string, content: string, metadata: Record<string, unknown>) {
  await createNotification({ accountId, event, title, content, metadata });
}

async function reserveCampaignUgcVideoQuota(tx: Prisma.TransactionClient, campaignId: string) {
  try {
    const rows = await tx.$queryRaw<Array<{ ugcVideoQuota: number | null }>>`
      SELECT "ugcVideoQuota"
      FROM "Campaign"
      WHERE "id" = ${campaignId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    const quotaValue = row.ugcVideoQuota;
    if (quotaValue === null) return;
    if (quotaValue <= 0) {
      throw new AppError("Campaign đã hết hạn mức video UGC theo gói hiện tại.", 409, "CAMPAIGN_UGC_VIDEO_QUOTA_REACHED");
    }

    const reservedRows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "Campaign"
      SET "ugcVideoApprovedCount" = "ugcVideoApprovedCount" + 1
      WHERE "id" = ${campaignId}
        AND "ugcVideoApprovedCount" < ${quotaValue}
      RETURNING "id"
    `;
    if (!reservedRows.length) {
      throw new AppError(
        `Campaign đã đạt giới hạn ${quotaValue} video UGC được duyệt.`,
        409,
        "CAMPAIGN_UGC_VIDEO_QUOTA_REACHED"
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Hệ thống chưa cập nhật migration quota video UGC. Vui lòng chạy migration trước khi duyệt mission.",
      500,
      "CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED"
    );
  }
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
  void accountId;
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
        missionApplicationId: existing.missionApplicationId ?? input.missionApplicationId ?? null,
        applicationStatus: existing.applicationStatus ?? "PENDING_REVIEW",
        submissionLifecycleStatus: existing.submissionLifecycleStatus ?? "ACCEPTED",
        submissionStatus: existing.submissionStatus ?? "OPEN"
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
      applicationStatus: "PENDING_REVIEW",
      applicationNote: null,
      applicationRejectReason: null,
      applicationReviewedById: null,
      applicationReviewedAt: null,
      appliedAt: now(),
      submissionLifecycleStatus: "ACCEPTED",
      submissionStatus: "OPEN",
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

type MissionHistoryFilterInput = {
  accountId?: string;
  query?: string;
  campaign?: string;
  status?: "PRODUCT_PENDING" | "DRAFT_PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  videoReviewStatus?: CreatorMissionVideoReviewStatus;
  publishStatus?: CreatorMissionPublishStatus;
  productReceiveOption?: ProductReceiveOption;
  productStatus?: ProductStatus;
  reimbursementStatus?: ReimbursementStatus;
  page?: number;
  limit?: number;
};

function applyMissionHistoryFilters(
  where: Prisma.CreatorMissionWhereInput,
  input: MissionHistoryFilterInput,
  campaignScope?: Prisma.CampaignWhereInput
) {
  if (input.accountId?.trim()) {
    where.accountId = input.accountId.trim();
  }

  if (campaignScope || input.campaign?.trim()) {
    where.campaign = {
      ...(campaignScope ?? {}),
      ...(input.campaign?.trim() ? { title: { contains: input.campaign.trim(), mode: "insensitive" } } : {})
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

  if (input.status) where.status = input.status;
  if (input.videoReviewStatus) where.videoReviewStatus = input.videoReviewStatus;
  if (input.publishStatus) where.publishStatus = input.publishStatus;
  if (input.productReceiveOption) where.productReceiveOption = input.productReceiveOption;
  if (input.productStatus) where.productStatus = input.productStatus;
  if (input.reimbursementStatus) where.reimbursementStatus = input.reimbursementStatus;
}

export async function listMissionHistoryForAdmin(input: MissionHistoryFilterInput) {
  const where: Prisma.CreatorMissionWhereInput = {};
  applyMissionHistoryFilters(where, input);
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { updatedAt: "desc" },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionHistoryDetailForAdmin(id: string) {
  const item = await getMissionById(id);
  if (!item) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapMission(item);
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
  await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      purchaseBillImageUrl: payload.screenshotUrl ?? null,
      purchaseProofNote: payload.proofTextNote,
      note: payload.note ?? null,
      purchaseConfirmedAt: now()
    });
    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        purchaseProofTextNote: payload.proofTextNote,
        purchaseProofScreenshotUrl: payload.screenshotUrl ?? null,
        purchaseProofNote: payload.note ?? null,
        purchaseProofSubmittedAt: now(),
        submissionPurchaseBillImageUrl: payload.screenshotUrl ?? null,
        submissionPurchaseProofNote: payload.proofTextNote,
        submissionNote: payload.note ?? null,
        submissionPurchaseConfirmedAt: now(),
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
  if (current.status === "DRAFT_PENDING") {
    throw new AppError("Transcript must be approved first", 409, "CREATOR_MISSION_TRANSCRIPT_NOT_APPROVED");
  }
  if (current.productReceiveOption === "CREATOR_BUY_FIRST" && current.productStatus !== "RECEIVED") {
    throw new AppError("Purchase proof is required before video submission", 409, "PURCHASE_PROOF_REQUIRED");
  }
  await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      videoUrl: payload.videoUrl,
      note: payload.note ?? null,
      status: "SUBMITTED",
      lifecycleStatus: "SUBMITTED",
      rejectReason: null,
      reviewedById: null,
      reviewedAt: null,
      approvedAt: null
    });
    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        submissionVideoUrl: payload.videoUrl,
        submissionNote: payload.note ?? null,
        submissionStatus: "SUBMITTED",
        submissionLifecycleStatus: "SUBMITTED",
        submissionRejectReason: null,
        submissionReviewedById: null,
        submissionReviewedAt: null,
        submissionApprovedAt: null,
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
  return { creatorMission: mapMission(updated), submissionId: updated.submissionId, submissionLifecycleStatus: updated.submissionLifecycleStatus };
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
  await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
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
    });
    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        submissionSocialPostUrl: payload.socialPostUrl,
        submissionPublicVideoUrl: payload.socialPostUrl,
        submissionAdCode: payload.adCode ?? null,
        submissionProofTextNote: payload.adCode ?? null,
        submissionScreenshotUrl: payload.purchaseInvoiceUrl ?? null,
        submissionProductReviewScreenshotUrl: payload.ratingImageUrl ?? null,
        submissionFinalProofNote: payload.note ?? null,
        submissionFinalSubmittedAt: now(),
        submissionStatus: "SUBMITTED",
        submissionLifecycleStatus: "SUBMITTED",
        submissionRejectReason: null,
        submissionReviewedById: null,
        submissionReviewedAt: null,
        publishStatus: "PENDING",
        publishFeedback: null,
        publishSubmittedAt: now(),
        publishReviewedAt: null
      }
    });
  });
  const updated = await getMissionById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapMission(updated);
}

export async function approveVideoReviewByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.videoReviewStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      status: "APPROVED",
      lifecycleStatus: "APPROVED",
      rejectReason: null,
      reviewedById: actorId,
      reviewedAt: now(),
      approvedAt: now()
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        submissionStatus: "APPROVED",
        submissionLifecycleStatus: "APPROVED",
        submissionRejectReason: null,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        submissionApprovedAt: now(),
        videoReviewStatus: "APPROVED",
        videoReviewFeedback: null,
        videoReviewedAt: now(),
        publishStatus: "NOT_SUBMITTED",
        publishFeedback: null
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_MISSION_VIDEO_APPROVED", "Video duoc duyet", "Ban co the nop link social public.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function rejectVideoReviewByAdmin(actorId: string, creatorMissionId: string, reason: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.videoReviewStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const feedback = reason.trim();
  if (!feedback) throw new AppError("reason is required", 422, "REJECT_REASON_REQUIRED");
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      status: "REJECTED",
      lifecycleStatus: "REJECTED",
      rejectReason: feedback,
      reviewedById: actorId,
      reviewedAt: now(),
      approvedAt: null
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        submissionStatus: "REJECTED",
        submissionLifecycleStatus: "REJECTED",
        submissionRejectReason: feedback,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        submissionApprovedAt: null,
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
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus === "APPROVED" && current.status === "COMPLETED") return mapMission(current);
  if (current.publishStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  if (current.videoReviewStatus !== "APPROVED") throw new AppError("Video must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  if (current.productReceiveOption === "CREATOR_BUY_FIRST" && purchaseAmountVnd <= 0) {
    throw new AppError("Reimbursement amount is required", 422, "REIMBURSEMENT_AMOUNT_REQUIRED");
  }
  const reimbursementVnd = current.productReceiveOption === "CREATOR_BUY_FIRST" ? Math.floor(purchaseAmountVnd) : 0;
  const reimbursementPoints = reimbursementVnd > 0 ? Math.floor(reimbursementVnd / 100) : 0;
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      status: "APPROVED",
      lifecycleStatus: "DONE",
      rejectReason: null,
      reviewedById: actorId,
      reviewedAt: now(),
      approvedAt: now(),
      rewardGrantedAt: now()
    });

    await creditPointsOnce(tx, current.accountId, current.mission.rewardPoints, "CREATOR_MISSION_REWARD", creatorMissionId, `creator_mission_reward_${creatorMissionId}`);
    if (reimbursementPoints > 0) {
      await creditPointsOnce(tx, current.accountId, reimbursementPoints, "PRODUCT_REIMBURSEMENT", creatorMissionId, `creator_mission_reimbursement_${creatorMissionId}`);
    }

    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "COMPLETED",
        submissionStatus: "APPROVED",
        submissionLifecycleStatus: "DONE",
        submissionRejectReason: null,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        submissionApprovedAt: now(),
        submissionRewardGrantedAt: now(),
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
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const feedback = reason.trim();
  if (!feedback) throw new AppError("reason is required", 422, "REJECT_REASON_REQUIRED");
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      rejectReason: feedback,
      reviewedById: actorId,
      reviewedAt: now()
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        submissionRejectReason: feedback,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        publishStatus: "REJECTED",
        publishFeedback: feedback,
        publishReviewedAt: now()
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_MISSION_FINAL_REJECTED", "Buoc hoan thanh bi tu choi", feedback, { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function listCreatorMissionApplicationsByAccount(accountId: string) {
  return prisma.creatorMission.findMany({
    where: { accountId },
    select: {
      id: true,
      missionId: true,
      campaignId: true,
      applicationStatus: true,
      applicationNote: true,
      applicationRejectReason: true,
      applicationReviewedAt: true,
      appliedAt: true,
      mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true, productLink: true } },
      campaign: { select: { id: true, title: true, slug: true } }
    },
    orderBy: { appliedAt: "desc" }
  }).then((rows) =>
    rows.map((row) => ({
      id: row.id,
      missionId: row.missionId,
      campaignId: row.campaignId,
      status: row.applicationStatus,
      note: row.applicationNote,
      rejectReason: row.applicationRejectReason,
      reviewedAt: row.applicationReviewedAt,
      createdAt: row.appliedAt,
      mission: row.mission,
      campaign: row.campaign
    }))
  );
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
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      purchaseBillImageUrl: payload.purchaseBillImageUrl,
      productReviewScreenshotUrl: payload.productReviewScreenshotUrl,
      purchaseProofNote: payload.purchaseProofNote ?? null,
      purchaseConfirmedAt: now()
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        submissionPurchaseBillImageUrl: payload.purchaseBillImageUrl,
        submissionProductReviewScreenshotUrl: payload.productReviewScreenshotUrl,
        submissionPurchaseProofNote: payload.purchaseProofNote ?? null,
        submissionPurchaseConfirmedAt: now(),
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
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      proofTextNote: sanitizedHtml,
      fileUploadUrl: transcriptFileUrl,
      status: "SUBMITTED",
      lifecycleStatus: "SUBMITTED",
      rejectReason: null,
      reviewedById: null,
      reviewedAt: null,
      approvedAt: null
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        submissionProofTextNote: sanitizedHtml,
        submissionFileUploadUrl: transcriptFileUrl,
        submissionStatus: "SUBMITTED",
        submissionLifecycleStatus: "SUBMITTED",
        submissionRejectReason: null,
        submissionReviewedById: null,
        submissionReviewedAt: null,
        submissionApprovedAt: null,
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

  const existing = await prisma.creatorMission.findUnique({
    where: { missionId_accountId: { missionId: mission.id, accountId } },
    select: { id: true, applicationStatus: true }
  });

  if (existing && existing.applicationStatus !== "REJECTED") {
    throw new AppError("Ban da xin lam nhiem vu nay", 409, "MISSION_APPLICATION_ALREADY_EXISTS");
  }

  const created = existing
    ? await prisma.creatorMission.update({
        where: { id: existing.id },
        data: {
          applicationStatus: "PENDING_REVIEW",
          applicationNote: payload.note?.trim() || null,
          applicationRejectReason: null,
          applicationReviewedById: null,
          applicationReviewedAt: null,
          appliedAt: now()
        }
      })
    : await ensureCreatorMissionFromApprovedApplication(prisma, {
        missionId: mission.id,
        campaignId: mission.campaignId,
        accountId,
        missionApplicationId: undefined,
        submissionId: undefined
      }).then((row) =>
        prisma.creatorMission.update({
          where: { id: row.id },
          data: {
            applicationStatus: "PENDING_REVIEW",
            applicationNote: payload.note?.trim() || null,
            applicationRejectReason: null,
            applicationReviewedById: null,
            applicationReviewedAt: null,
            appliedAt: now()
          }
        })
      );

  return prisma.creatorMission.findUniqueOrThrow({
    where: { id: created.id },
    select: {
      id: true,
      missionId: true,
      campaignId: true,
      applicationStatus: true,
      applicationNote: true,
      applicationRejectReason: true,
      applicationReviewedAt: true,
      appliedAt: true,
      mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true } },
      campaign: { select: { id: true, title: true, slug: true } }
    }
  });
}

function toOrder(sort?: Sort) {
  return sort === "oldest" ? "asc" : "desc";
}

function resolveBrandAvatar(input: { avatarUrl: string | null; ownedBrands: Array<{ logoUrl: string | null }> }) {
  const logoUrl = input.ownedBrands.find((item) => Boolean(item.logoUrl?.trim()))?.logoUrl?.trim();
  if (logoUrl) return logoUrl;
  return input.avatarUrl;
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
  const where: Prisma.CreatorMissionWhereInput = {};
  if (input.status) where.applicationStatus = input.status;
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
      select: {
        id: true,
        missionId: true,
        campaignId: true,
        accountId: true,
        applicationStatus: true,
        applicationNote: true,
        applicationRejectReason: true,
        applicationReviewedById: true,
        applicationReviewedAt: true,
        appliedAt: true,
        account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } } } },
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            brand: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                ownedBrands: {
                  select: { logoUrl: true },
                  orderBy: { updatedAt: "desc" },
                  take: 1
                }
              }
            }
          }
        },
        mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true, productLink: true } }
      },
      orderBy: { appliedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  const normalizedItems = items.map((item) => ({
    id: item.id,
    missionId: item.missionId,
    campaignId: item.campaignId,
    accountId: item.accountId,
    status: item.applicationStatus,
    note: item.applicationNote,
    rejectReason: item.applicationRejectReason,
    reviewedAt: item.applicationReviewedAt,
    createdAt: item.appliedAt,
    reviewedBy: item.applicationReviewedById
      ? { id: item.applicationReviewedById, displayName: "N/A", email: "N/A" }
      : null,
    account: item.account,
    campaign: {
      ...item.campaign,
      brand: {
        ...item.campaign.brand,
        avatarUrl: resolveBrandAvatar(item.campaign.brand)
      }
    },
    mission: item.mission
  }));
  return { items: normalizedItems, pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionApplicationDetailForAdmin(id: string) {
  const item = await prisma.creatorMission.findUnique({
    where: { id },
    select: {
      id: true,
      missionId: true,
      campaignId: true,
      accountId: true,
      missionApplicationId: true,
      applicationStatus: true,
      applicationNote: true,
      applicationRejectReason: true,
      applicationReviewedById: true,
      applicationReviewedAt: true,
      appliedAt: true,
      account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true, bio: true } } } },
      campaign: {
        select: {
          id: true,
          title: true,
          slug: true,
          brandId: true,
          brand: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              ownedBrands: {
                select: { logoUrl: true },
                orderBy: { updatedAt: "desc" },
                take: 1
              }
            }
          }
        }
      },
      mission: { select: { id: true, title: true, description: true, rewardPoints: true, productReceiveOption: true, productLink: true, deadlineAt: true } }
    }
  });
  if (!item) throw new AppError("Mission application not found", 404, "MISSION_APPLICATION_NOT_FOUND");
  return {
    id: item.id,
    missionId: item.missionId,
    campaignId: item.campaignId,
    accountId: item.accountId,
    missionApplicationId: item.missionApplicationId,
    status: item.applicationStatus,
    note: item.applicationNote,
    rejectReason: item.applicationRejectReason,
    reviewedById: item.applicationReviewedById,
    reviewedAt: item.applicationReviewedAt,
    createdAt: item.appliedAt,
    reviewedBy: item.applicationReviewedById ? { id: item.applicationReviewedById, displayName: "N/A", email: "N/A" } : null,
    account: item.account,
    mission: item.mission,
    campaign: {
      ...item.campaign,
      brand: {
        ...item.campaign.brand,
        avatarUrl: resolveBrandAvatar(item.campaign.brand)
      }
    }
  };
}

export async function approveMissionApplicationByAdmin(actorId: string, id: string) {
  const current = await getMissionApplicationDetailForAdmin(id);
  if (current.status !== "PENDING_REVIEW") throw new AppError("Mission application is not pending review", 409, "MISSION_APPLICATION_INVALID_STATUS");
  const updated = await prisma.$transaction(async (tx) => {
    const claimPending = await tx.creatorMission.updateMany({
      where: { id, applicationStatus: "PENDING_REVIEW" },
      data: { applicationStatus: "APPROVED", applicationReviewedById: actorId, applicationReviewedAt: now(), applicationRejectReason: null }
    });
    if (claimPending.count === 0) {
      throw new AppError("Mission application is not pending review", 409, "MISSION_APPLICATION_INVALID_STATUS");
    }

    await reserveCampaignUgcVideoQuota(tx, current.campaignId);
    const next = await tx.creatorMission.update({
      where: { id },
      data: {
        missionApplicationId: current.missionApplicationId ?? current.id,
        submissionLifecycleStatus: "ACCEPTED",
        submissionStatus: "OPEN",
        submissionNote: current.note ?? null
      },
      include: creatorMissionInclude
    });
    return mapMission(next);
  });
  await notifyCreator(current.accountId, "MISSION_APPLICATION_APPROVED", "Don xin nhiem vu duoc duyet", `Ban da duoc duyet nhiem vu "${current.mission.title}".`, { creatorMissionId: id });
  return updated;
}

export async function rejectMissionApplicationByAdmin(actorId: string, id: string, rejectReason: string) {
  const current = await getMissionApplicationDetailForAdmin(id);
  if (current.status !== "PENDING_REVIEW") throw new AppError("Mission application is not pending review", 409, "MISSION_APPLICATION_INVALID_STATUS");
  const reason = rejectReason.trim();
  if (!reason) throw new AppError("rejectReason is required", 422, "REJECT_REASON_REQUIRED");
  const updated = await prisma.creatorMission.update({
    where: { id },
    data: { applicationStatus: "REJECTED", applicationRejectReason: reason, applicationReviewedById: actorId, applicationReviewedAt: now() },
    include: creatorMissionInclude
  });
  await notifyCreator(current.accountId, "MISSION_APPLICATION_REJECTED", "Don xin nhiem vu bi tu choi", reason, { creatorMissionId: id });
  return mapMission(updated);
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
    submissionProofTextNote: { not: null }
  };

  if (input.status === "PENDING") {
    where.status = "DRAFT_PENDING";
    where.submissionStatus = "SUBMITTED";
  } else if (input.status === "REJECTED") {
    where.status = "DRAFT_PENDING";
    where.submissionStatus = "REJECTED";
  } else if (input.status === "APPROVED") {
    where.status = { not: "DRAFT_PENDING" };
    where.submissionStatus = "APPROVED";
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
  if (!item || !item.submissionProofTextNote) throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  return mapMission(item);
}

export async function approveMissionTranscriptReviewByAdmin(actorId: string, id: string) {
  const current = await getMissionById(id);
  if (!current || !current.submissionProofTextNote) throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  if (current.status !== "DRAFT_PENDING" || current.submissionStatus !== "SUBMITTED") {
    throw new AppError("Transcript is not pending review", 409, "CREATOR_MISSION_TRANSCRIPT_INVALID_STATUS");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      status: "APPROVED",
      lifecycleStatus: "APPROVED",
      rejectReason: null,
      reviewedById: actorId,
      reviewedAt: now(),
      approvedAt: now()
    });

    return tx.creatorMission.update({
      where: { id },
      data: {
        submissionStatus: "APPROVED",
        submissionLifecycleStatus: "APPROVED",
        submissionRejectReason: null,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        submissionApprovedAt: now(),
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
  if (!current || !current.submissionProofTextNote) throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  if (current.status !== "DRAFT_PENDING" || current.submissionStatus !== "SUBMITTED") {
    throw new AppError("Transcript is not pending review", 409, "CREATOR_MISSION_TRANSCRIPT_INVALID_STATUS");
  }
  const reason = feedback.trim();
  if (!reason) throw new AppError("feedback is required", 422, "REJECT_REASON_REQUIRED");

  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      status: "REJECTED",
      lifecycleStatus: "REJECTED",
      rejectReason: reason,
      reviewedById: actorId,
      reviewedAt: now(),
      approvedAt: null
    });

    return tx.creatorMission.update({
      where: { id },
      data: {
        submissionStatus: "REJECTED",
        submissionLifecycleStatus: "REJECTED",
        submissionRejectReason: reason,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        submissionApprovedAt: null,
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
  const where: Prisma.CreatorMissionWhereInput = {
    campaign: { brandId: brandOwnerAccountId }
  };
  if (input.status) where.applicationStatus = input.status;
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
      select: {
        id: true,
        missionId: true,
        campaignId: true,
        accountId: true,
        applicationStatus: true,
        applicationNote: true,
        applicationRejectReason: true,
        applicationReviewedAt: true,
        appliedAt: true,
        account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } } } },
        campaign: { select: { id: true, title: true, slug: true } },
        mission: { select: { id: true, title: true, rewardPoints: true, productReceiveOption: true, productLink: true } }
      },
      orderBy: { appliedAt: toOrder(input.sort) },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return {
    items: items.map((item) => ({
      id: item.id,
      missionId: item.missionId,
      campaignId: item.campaignId,
      accountId: item.accountId,
      status: item.applicationStatus,
      note: item.applicationNote,
      rejectReason: item.applicationRejectReason,
      createdAt: item.appliedAt,
      reviewedAt: item.applicationReviewedAt,
      account: item.account,
      campaign: item.campaign,
      mission: item.mission
    })),
    pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) }
  };
}

export async function listMissionHistoryForBrand(accountId: string, input: MissionHistoryFilterInput) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const where: Prisma.CreatorMissionWhereInput = {};
  applyMissionHistoryFilters(where, input, { brandId: brandOwnerAccountId });
  const paging = toPagination(input.page, input.limit);
  const [total, items] = await prisma.$transaction([
    prisma.creatorMission.count({ where }),
    prisma.creatorMission.findMany({
      where,
      include: creatorMissionInclude,
      orderBy: { updatedAt: "desc" },
      skip: paging.skip,
      take: paging.limit
    })
  ]);
  return { items: items.map(mapMission), pagination: { page: paging.page, limit: paging.limit, total, totalPages: Math.max(1, Math.ceil(total / paging.limit)) } };
}

export async function getMissionHistoryDetailForBrand(accountId: string, id: string) {
  const brandOwnerAccountId = await resolveBrandOwnerAccountId(accountId);
  const item = await getMissionById(id);
  if (!item) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (item.campaign.brandId !== brandOwnerAccountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return mapMission(item);
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
    submissionProofTextNote: { not: null }
  };

  if (input.status === "PENDING") {
    where.status = "DRAFT_PENDING";
    where.submissionStatus = "SUBMITTED";
  } else if (input.status === "REJECTED") {
    where.status = "DRAFT_PENDING";
    where.submissionStatus = "REJECTED";
  } else if (input.status === "APPROVED") {
    where.status = { not: "DRAFT_PENDING" };
    where.submissionStatus = "APPROVED";
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
