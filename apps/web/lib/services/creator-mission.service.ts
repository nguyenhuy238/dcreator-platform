import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type ProductReceiveOption = "DEPOSIT_PRODUCT" | "CREATOR_BUY_FIRST" | "NO_PRODUCT_REQUIRED";
export type CreatorMissionStatus = "PRODUCT_PENDING" | "DRAFT_PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ProductStatus = "NOT_REQUIRED" | "WAITING_DEPOSIT" | "WAITING_PURCHASE" | "RECEIVED";
export type DepositStatus = "NOT_REQUIRED" | "PENDING" | "PAID" | "REFUND_PENDING" | "REFUNDED";
export type ReimbursementStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PURCHASE_SUBMITTED"
  | "APPROVED"
  | "PAYOUT_PENDING"
  | "PAID"
  | "REJECTED";

type CreatorMissionDbExecutor = Pick<typeof prisma, "$queryRaw" | "$executeRaw">;

type CreatorMissionRow = {
  id: string;
  missionId: string;
  campaignId: string;
  accountId: string;
  applicationId: string | null;
  status: CreatorMissionStatus;
  productReceiveOption: ProductReceiveOption;
  productStatus: ProductStatus;
  depositStatus: DepositStatus;
  reimbursementStatus: ReimbursementStatus;
  purchaseProofTextNote: string | null;
  purchaseProofScreenshotUrl: string | null;
  purchaseProofNote: string | null;
  purchaseProofSubmittedAt: Date | null;
  purchaseProofReviewedAt: Date | null;
  purchaseProofRejectReason: string | null;
  assignedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  missionTitle: string;
  missionDescription: string;
  missionDeadlineAt: Date | null;
  missionRewardPoints: number;
  campaignTitle: string;
  campaignSlug: string;
  accountDisplayName: string;
  accountEmail: string;
};

function isMissingPurchaseProofColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybe = error as {
    code?: string;
    message?: string;
    meta?: { code?: string; message?: string };
  };

  const pgCode = maybe.meta?.code ?? maybe.code;
  const message = `${maybe.message ?? ""} ${maybe.meta?.message ?? ""}`.toLowerCase();
  return pgCode === "42703" && message.includes("purchaseproof");
}

async function withPurchaseProofColumnFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>) {
  try {
    return await primary();
  } catch (error) {
    if (isMissingPurchaseProofColumnError(error)) {
      return fallback();
    }
    throw error;
  }
}

function isPast(date?: Date | null) {
  return Boolean(date && date.getTime() <= Date.now());
}

function mapInitialStateByReceiveOption(productReceiveOption: ProductReceiveOption) {
  if (productReceiveOption === "DEPOSIT_PRODUCT") {
    return {
      status: "PRODUCT_PENDING" as CreatorMissionStatus,
      productStatus: "WAITING_DEPOSIT" as ProductStatus,
      depositStatus: "PENDING" as DepositStatus,
      reimbursementStatus: "NOT_REQUIRED" as ReimbursementStatus
    };
  }

  if (productReceiveOption === "CREATOR_BUY_FIRST") {
    return {
      status: "PRODUCT_PENDING" as CreatorMissionStatus,
      productStatus: "WAITING_PURCHASE" as ProductStatus,
      depositStatus: "NOT_REQUIRED" as DepositStatus,
      reimbursementStatus: "PENDING" as ReimbursementStatus
    };
  }

  return {
    status: "DRAFT_PENDING" as CreatorMissionStatus,
    productStatus: "NOT_REQUIRED" as ProductStatus,
    depositStatus: "NOT_REQUIRED" as DepositStatus,
    reimbursementStatus: "NOT_REQUIRED" as ReimbursementStatus
  };
}

export function getCreatorMissionGuidanceByOption(option: ProductReceiveOption) {
  if (option === "DEPOSIT_PRODUCT") {
    return "Bạn cần cọc tiền sản phẩm. Sau khi xác nhận cọc, sản phẩm sẽ được gửi cho bạn. Sau khi nhiệm vụ được nghiệm thu, tiền cọc sẽ được hoàn lại.";
  }
  if (option === "CREATOR_BUY_FIRST") {
    return "Bạn tự mua sản phẩm theo link brand cung cấp. Xác nhận đã mua để bắt đầu quay video review, sau đó gửi báo cáo đăng bài để admin xác nhận hoàn tiền.";
  }
  return "Nhiệm vụ này không yêu cầu nhận sản phẩm. Bạn có thể bắt đầu thực hiện nội dung theo brief và gửi bản nháp đúng deadline.";
}

function mapCreatorMissionRow(item: CreatorMissionRow) {
  return {
    id: item.id,
    status: item.status,
    productReceiveOption: item.productReceiveOption,
    productStatus: item.productStatus,
    depositStatus: item.depositStatus,
    reimbursementStatus: item.reimbursementStatus,
    purchaseProof: {
      proofTextNote: item.purchaseProofTextNote,
      screenshotUrl: item.purchaseProofScreenshotUrl,
      note: item.purchaseProofNote,
      submittedAt: item.purchaseProofSubmittedAt?.toISOString() ?? null,
      reviewedAt: item.purchaseProofReviewedAt?.toISOString() ?? null,
      rejectReason: item.purchaseProofRejectReason
    },
    assignedAt: item.assignedAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    mission: {
      id: item.missionId,
      title: item.missionTitle,
      description: item.missionDescription,
      deadlineAt: item.missionDeadlineAt?.toISOString() ?? null,
      rewardPoints: item.missionRewardPoints
    },
    campaign: {
      id: item.campaignId,
      title: item.campaignTitle,
      slug: item.campaignSlug
    },
    account: {
      id: item.accountId,
      displayName: item.accountDisplayName,
      email: item.accountEmail
    },
    guidance: getCreatorMissionGuidanceByOption(item.productReceiveOption)
  };
}

async function getCreatorMissionRowById(db: CreatorMissionDbExecutor, creatorMissionId: string) {
  const rows = await withPurchaseProofColumnFallback(
    () =>
      db.$queryRaw<CreatorMissionRow[]>`
        SELECT
          cm."id",
          cm."missionId",
          cm."campaignId",
          cm."accountId",
          cm."applicationId",
          cm."status",
          cm."productReceiveOption",
          cm."productStatus",
          cm."depositStatus",
          cm."reimbursementStatus",
          cm."purchaseProofTextNote",
          cm."purchaseProofScreenshotUrl",
          cm."purchaseProofNote",
          cm."purchaseProofSubmittedAt",
          cm."purchaseProofReviewedAt",
          cm."purchaseProofRejectReason",
          cm."assignedAt",
          cm."startedAt",
          cm."completedAt",
          cm."createdAt",
          cm."updatedAt",
          m."title" AS "missionTitle",
          m."description" AS "missionDescription",
          m."deadlineAt" AS "missionDeadlineAt",
          m."rewardPoints" AS "missionRewardPoints",
          c."title" AS "campaignTitle",
          c."slug" AS "campaignSlug",
          a."displayName" AS "accountDisplayName",
          a."email" AS "accountEmail"
        FROM "CreatorMission" cm
        INNER JOIN "Mission" m ON m."id" = cm."missionId"
        INNER JOIN "Campaign" c ON c."id" = cm."campaignId"
        INNER JOIN "Account" a ON a."id" = cm."accountId"
        WHERE cm."id" = ${creatorMissionId}
        LIMIT 1
      `,
    () =>
      db.$queryRaw<CreatorMissionRow[]>`
        SELECT
          cm."id",
          cm."missionId",
          cm."campaignId",
          cm."accountId",
          cm."applicationId",
          cm."status",
          cm."productReceiveOption",
          cm."productStatus",
          cm."depositStatus",
          cm."reimbursementStatus",
          NULL::TEXT AS "purchaseProofTextNote",
          NULL::TEXT AS "purchaseProofScreenshotUrl",
          NULL::TEXT AS "purchaseProofNote",
          NULL::TIMESTAMP(3) AS "purchaseProofSubmittedAt",
          NULL::TIMESTAMP(3) AS "purchaseProofReviewedAt",
          NULL::TEXT AS "purchaseProofRejectReason",
          cm."assignedAt",
          cm."startedAt",
          cm."completedAt",
          cm."createdAt",
          cm."updatedAt",
          m."title" AS "missionTitle",
          m."description" AS "missionDescription",
          m."deadlineAt" AS "missionDeadlineAt",
          m."rewardPoints" AS "missionRewardPoints",
          c."title" AS "campaignTitle",
          c."slug" AS "campaignSlug",
          a."displayName" AS "accountDisplayName",
          a."email" AS "accountEmail"
        FROM "CreatorMission" cm
        INNER JOIN "Mission" m ON m."id" = cm."missionId"
        INNER JOIN "Campaign" c ON c."id" = cm."campaignId"
        INNER JOIN "Account" a ON a."id" = cm."accountId"
        WHERE cm."id" = ${creatorMissionId}
        LIMIT 1
      `
  );

  return rows[0] ?? null;
}

async function findCreatorMissionByApplication(db: CreatorMissionDbExecutor, applicationId: string) {
  const rows = await withPurchaseProofColumnFallback(
    () =>
      db.$queryRaw<CreatorMissionRow[]>`
        SELECT
          cm."id",
          cm."missionId",
          cm."campaignId",
          cm."accountId",
          cm."applicationId",
          cm."status",
          cm."productReceiveOption",
          cm."productStatus",
          cm."depositStatus",
          cm."reimbursementStatus",
          cm."purchaseProofTextNote",
          cm."purchaseProofScreenshotUrl",
          cm."purchaseProofNote",
          cm."purchaseProofSubmittedAt",
          cm."purchaseProofReviewedAt",
          cm."purchaseProofRejectReason",
          cm."assignedAt",
          cm."startedAt",
          cm."completedAt",
          cm."createdAt",
          cm."updatedAt",
          m."title" AS "missionTitle",
          m."description" AS "missionDescription",
          m."deadlineAt" AS "missionDeadlineAt",
          m."rewardPoints" AS "missionRewardPoints",
          c."title" AS "campaignTitle",
          c."slug" AS "campaignSlug",
          a."displayName" AS "accountDisplayName",
          a."email" AS "accountEmail"
        FROM "CreatorMission" cm
        INNER JOIN "Mission" m ON m."id" = cm."missionId"
        INNER JOIN "Campaign" c ON c."id" = cm."campaignId"
        INNER JOIN "Account" a ON a."id" = cm."accountId"
        WHERE cm."applicationId" = ${applicationId}
        LIMIT 1
      `,
    () =>
      db.$queryRaw<CreatorMissionRow[]>`
        SELECT
          cm."id",
          cm."missionId",
          cm."campaignId",
          cm."accountId",
          cm."applicationId",
          cm."status",
          cm."productReceiveOption",
          cm."productStatus",
          cm."depositStatus",
          cm."reimbursementStatus",
          NULL::TEXT AS "purchaseProofTextNote",
          NULL::TEXT AS "purchaseProofScreenshotUrl",
          NULL::TEXT AS "purchaseProofNote",
          NULL::TIMESTAMP(3) AS "purchaseProofSubmittedAt",
          NULL::TIMESTAMP(3) AS "purchaseProofReviewedAt",
          NULL::TEXT AS "purchaseProofRejectReason",
          cm."assignedAt",
          cm."startedAt",
          cm."completedAt",
          cm."createdAt",
          cm."updatedAt",
          m."title" AS "missionTitle",
          m."description" AS "missionDescription",
          m."deadlineAt" AS "missionDeadlineAt",
          m."rewardPoints" AS "missionRewardPoints",
          c."title" AS "campaignTitle",
          c."slug" AS "campaignSlug",
          a."displayName" AS "accountDisplayName",
          a."email" AS "accountEmail"
        FROM "CreatorMission" cm
        INNER JOIN "Mission" m ON m."id" = cm."missionId"
        INNER JOIN "Campaign" c ON c."id" = cm."campaignId"
        INNER JOIN "Account" a ON a."id" = cm."accountId"
        WHERE cm."applicationId" = ${applicationId}
        LIMIT 1
      `
  );
  return rows[0] ?? null;
}

async function findCreatorMissionByMissionAndAccount(db: CreatorMissionDbExecutor, missionId: string, accountId: string) {
  const rows = await withPurchaseProofColumnFallback(
    () =>
      db.$queryRaw<CreatorMissionRow[]>`
        SELECT
          cm."id",
          cm."missionId",
          cm."campaignId",
          cm."accountId",
          cm."applicationId",
          cm."status",
          cm."productReceiveOption",
          cm."productStatus",
          cm."depositStatus",
          cm."reimbursementStatus",
          cm."purchaseProofTextNote",
          cm."purchaseProofScreenshotUrl",
          cm."purchaseProofNote",
          cm."purchaseProofSubmittedAt",
          cm."purchaseProofReviewedAt",
          cm."purchaseProofRejectReason",
          cm."assignedAt",
          cm."startedAt",
          cm."completedAt",
          cm."createdAt",
          cm."updatedAt",
          m."title" AS "missionTitle",
          m."description" AS "missionDescription",
          m."deadlineAt" AS "missionDeadlineAt",
          m."rewardPoints" AS "missionRewardPoints",
          c."title" AS "campaignTitle",
          c."slug" AS "campaignSlug",
          a."displayName" AS "accountDisplayName",
          a."email" AS "accountEmail"
        FROM "CreatorMission" cm
        INNER JOIN "Mission" m ON m."id" = cm."missionId"
        INNER JOIN "Campaign" c ON c."id" = cm."campaignId"
        INNER JOIN "Account" a ON a."id" = cm."accountId"
        WHERE cm."missionId" = ${missionId}
          AND cm."accountId" = ${accountId}
        LIMIT 1
      `,
    () =>
      db.$queryRaw<CreatorMissionRow[]>`
        SELECT
          cm."id",
          cm."missionId",
          cm."campaignId",
          cm."accountId",
          cm."applicationId",
          cm."status",
          cm."productReceiveOption",
          cm."productStatus",
          cm."depositStatus",
          cm."reimbursementStatus",
          NULL::TEXT AS "purchaseProofTextNote",
          NULL::TEXT AS "purchaseProofScreenshotUrl",
          NULL::TEXT AS "purchaseProofNote",
          NULL::TIMESTAMP(3) AS "purchaseProofSubmittedAt",
          NULL::TIMESTAMP(3) AS "purchaseProofReviewedAt",
          NULL::TEXT AS "purchaseProofRejectReason",
          cm."assignedAt",
          cm."startedAt",
          cm."completedAt",
          cm."createdAt",
          cm."updatedAt",
          m."title" AS "missionTitle",
          m."description" AS "missionDescription",
          m."deadlineAt" AS "missionDeadlineAt",
          m."rewardPoints" AS "missionRewardPoints",
          c."title" AS "campaignTitle",
          c."slug" AS "campaignSlug",
          a."displayName" AS "accountDisplayName",
          a."email" AS "accountEmail"
        FROM "CreatorMission" cm
        INNER JOIN "Mission" m ON m."id" = cm."missionId"
        INNER JOIN "Campaign" c ON c."id" = cm."campaignId"
        INNER JOIN "Account" a ON a."id" = cm."accountId"
        WHERE cm."missionId" = ${missionId}
          AND cm."accountId" = ${accountId}
        LIMIT 1
      `
  );
  return rows[0] ?? null;
}

export async function ensureCreatorMissionFromApprovedApplication(
  db: CreatorMissionDbExecutor,
  input: {
    missionId: string;
    campaignId: string;
    accountId: string;
    applicationId: string;
  }
) {
  const existingByApplication = await findCreatorMissionByApplication(db, input.applicationId);
  if (existingByApplication) return existingByApplication;

  const existingByMissionAndAccount = await findCreatorMissionByMissionAndAccount(db, input.missionId, input.accountId);
  if (existingByMissionAndAccount) return existingByMissionAndAccount;

  const missionRows = await db.$queryRaw<Array<{ id: string; productReceiveOption: ProductReceiveOption }>>`
    SELECT "id", "productReceiveOption"
    FROM "Mission"
    WHERE "id" = ${input.missionId}
    LIMIT 1
  `;

  const mission = missionRows[0];
  if (!mission) throw new AppError("Mission not found", 404, "MISSION_NOT_FOUND");

  const state = mapInitialStateByReceiveOption(mission.productReceiveOption);
  const now = new Date();

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "CreatorMission" (
        "id",
        "missionId",
        "campaignId",
        "accountId",
        "applicationId",
        "status",
        "productReceiveOption",
        "productStatus",
        "depositStatus",
        "reimbursementStatus",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${input.missionId},
        ${input.campaignId},
        ${input.accountId},
        ${input.applicationId},
        ${state.status}::"CreatorMissionStatus",
        ${mission.productReceiveOption}::"ProductReceiveOption",
        ${state.productStatus}::"ProductStatus",
        ${state.depositStatus}::"DepositStatus",
        ${state.reimbursementStatus}::"ReimbursementStatus",
        ${now},
        ${now}
      )
      ON CONFLICT ("missionId", "accountId") DO NOTHING
    `
  );

  const created = await findCreatorMissionByApplication(db, input.applicationId);
  if (created) return created;

  const fallback = await findCreatorMissionByMissionAndAccount(db, input.missionId, input.accountId);
  if (!fallback) {
    throw new AppError("Creator mission creation failed", 500, "CREATOR_MISSION_CREATE_FAILED");
  }
  return fallback;
}

const creatorMissionWorkflowSelect = {
  id: true,
  missionId: true,
  campaignId: true,
  accountId: true,
  applicationId: true,
  status: true,
  productReceiveOption: true,
  productStatus: true,
  depositStatus: true,
  reimbursementStatus: true,
  purchaseProofTextNote: true,
  purchaseProofScreenshotUrl: true,
  purchaseProofNote: true,
  purchaseProofSubmittedAt: true,
  purchaseProofReviewedAt: true,
  purchaseProofRejectReason: true,
  productPurchasedConfirmedAt: true,
  videoReviewStatus: true,
  videoReviewFeedback: true,
  videoSubmittedAt: true,
  videoReviewedAt: true,
  publishStatus: true,
  publishFeedback: true,
  publishSubmittedAt: true,
  publishReviewedAt: true,
  publishPurchaseAmountVnd: true,
  rewardCreditedAt: true,
  assignedAt: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  mission: {
    select: {
      id: true,
      title: true,
      description: true,
      deadlineAt: true,
      rewardPoints: true,
      productLink: true
    }
  },
  campaign: {
    select: {
      id: true,
      title: true,
      slug: true
    }
  },
  account: {
    select: {
      id: true,
      displayName: true,
      email: true
    }
  },
  application: {
    select: {
      id: true,
      lifecycleStatus: true,
      status: true,
      videoUrl: true,
      socialPostUrl: true,
      screenshotUrl: true,
      fileUploadUrl: true,
      proofTextNote: true,
      note: true,
      rejectReason: true,
      reviewedAt: true,
      approvedAt: true,
      rewardGrantedAt: true
    }
  }
} satisfies Prisma.CreatorMissionSelect;

type CreatorMissionWorkflowEntity = Prisma.CreatorMissionGetPayload<{ select: typeof creatorMissionWorkflowSelect }>;

function mapCreatorMissionWorkflow(entity: CreatorMissionWorkflowEntity) {
  return {
    id: entity.id,
    status: entity.status,
    productReceiveOption: entity.productReceiveOption,
    productStatus: entity.productStatus,
    depositStatus: entity.depositStatus,
    reimbursementStatus: entity.reimbursementStatus,
    productPurchasedConfirmedAt: entity.productPurchasedConfirmedAt?.toISOString() ?? null,
    videoReviewStatus: entity.videoReviewStatus,
    videoReviewFeedback: entity.videoReviewFeedback,
    videoSubmittedAt: entity.videoSubmittedAt?.toISOString() ?? null,
    videoReviewedAt: entity.videoReviewedAt?.toISOString() ?? null,
    publishStatus: entity.publishStatus,
    publishFeedback: entity.publishFeedback,
    publishSubmittedAt: entity.publishSubmittedAt?.toISOString() ?? null,
    publishReviewedAt: entity.publishReviewedAt?.toISOString() ?? null,
    publishPurchaseAmountVnd: entity.publishPurchaseAmountVnd,
    rewardCreditedAt: entity.rewardCreditedAt?.toISOString() ?? null,
    purchaseProof: {
      proofTextNote: entity.purchaseProofTextNote,
      screenshotUrl: entity.purchaseProofScreenshotUrl,
      note: entity.purchaseProofNote,
      submittedAt: entity.purchaseProofSubmittedAt?.toISOString() ?? null,
      reviewedAt: entity.purchaseProofReviewedAt?.toISOString() ?? null,
      rejectReason: entity.purchaseProofRejectReason
    },
    submission: entity.application
      ? {
          id: entity.application.id,
          lifecycleStatus: entity.application.lifecycleStatus,
          status: entity.application.status,
          videoUrl: entity.application.videoUrl,
          socialPostUrl: entity.application.socialPostUrl,
          screenshotUrl: entity.application.screenshotUrl,
          fileUploadUrl: entity.application.fileUploadUrl,
          proofTextNote: entity.application.proofTextNote,
          note: entity.application.note,
          rejectReason: entity.application.rejectReason,
          reviewedAt: entity.application.reviewedAt?.toISOString() ?? null,
          approvedAt: entity.application.approvedAt?.toISOString() ?? null,
          rewardGrantedAt: entity.application.rewardGrantedAt?.toISOString() ?? null
        }
      : null,
    assignedAt: entity.assignedAt.toISOString(),
    startedAt: entity.startedAt?.toISOString() ?? null,
    completedAt: entity.completedAt?.toISOString() ?? null,
    mission: {
      id: entity.mission.id,
      title: entity.mission.title,
      description: entity.mission.description,
      deadlineAt: entity.mission.deadlineAt?.toISOString() ?? null,
      rewardPoints: entity.mission.rewardPoints,
      productLink: entity.mission.productLink
    },
    campaign: {
      id: entity.campaign.id,
      title: entity.campaign.title,
      slug: entity.campaign.slug
    },
    account: {
      id: entity.account.id,
      displayName: entity.account.displayName,
      email: entity.account.email
    },
    guidance: getCreatorMissionGuidanceByOption(entity.productReceiveOption)
  };
}

export async function getMyCreatorMissions(accountId: string) {
  const items = await prisma.creatorMission.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: creatorMissionWorkflowSelect
  });
  return items.map(mapCreatorMissionWorkflow);
}

export async function listCreatorMissionsForAdmin() {
  const items = await prisma.creatorMission.findMany({
    orderBy: { createdAt: "desc" },
    select: creatorMissionWorkflowSelect
  });
  return items.map(mapCreatorMissionWorkflow);
}

export async function confirmDepositPaid(creatorMissionId: string, accountId: string) {
  const current = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.accountId !== accountId) throw new AppError("Forbidden", 403, "CREATOR_MISSION_FORBIDDEN");
  if (current.productReceiveOption !== "DEPOSIT_PRODUCT") {
    throw new AppError("Creator mission does not use deposit flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  }
  if (current.productStatus !== "WAITING_DEPOSIT" || current.depositStatus !== "PENDING") {
    throw new AppError("Creator mission is not waiting for deposit", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "CreatorMission"
      SET
        "depositStatus" = 'PAID'::"DepositStatus",
        "productStatus" = 'RECEIVED'::"ProductStatus",
        "status" = 'DRAFT_PENDING'::"CreatorMissionStatus",
        "updatedAt" = ${new Date()}
      WHERE "id" = ${creatorMissionId}
    `
  );

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CREATOR_MISSION_DEPOSIT_CONFIRMED_BY_CREATOR",
      targetType: "CreatorMission",
      targetId: creatorMissionId
    }
  });

  const updated = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionRow(updated);
}

export async function submitPurchaseProof(
  creatorMissionId: string,
  accountId: string,
  payload: { proofTextNote: string; screenshotUrl?: string; note?: string }
) {
  const current = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.accountId !== accountId) throw new AppError("Forbidden", 403, "CREATOR_MISSION_FORBIDDEN");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") {
    throw new AppError("Creator mission does not use buy-first flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  }

  const validReimbursement = current.reimbursementStatus === "PENDING" || current.reimbursementStatus === "REJECTED";
  if (current.productStatus !== "WAITING_PURCHASE" || !validReimbursement) {
    throw new AppError("Creator mission is not waiting purchase proof", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await withPurchaseProofColumnFallback(
    () =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "CreatorMission"
          SET
            "reimbursementStatus" = 'PURCHASE_SUBMITTED'::"ReimbursementStatus",
            "purchaseProofTextNote" = ${payload.proofTextNote},
            "purchaseProofScreenshotUrl" = ${payload.screenshotUrl ?? null},
            "purchaseProofNote" = ${payload.note ?? null},
            "purchaseProofSubmittedAt" = ${new Date()},
            "purchaseProofReviewedAt" = null,
            "purchaseProofRejectReason" = null,
            "updatedAt" = ${new Date()}
          WHERE "id" = ${creatorMissionId}
        `
      ),
    () =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "CreatorMission"
          SET
            "reimbursementStatus" = 'PURCHASE_SUBMITTED'::"ReimbursementStatus",
            "updatedAt" = ${new Date()}
          WHERE "id" = ${creatorMissionId}
        `
      )
  );

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CREATOR_MISSION_PURCHASE_PROOF_SUBMITTED",
      targetType: "CreatorMission",
      targetId: creatorMissionId,
      metadata: {
        proofTextNote: payload.proofTextNote,
        screenshotUrl: payload.screenshotUrl ?? null,
        note: payload.note ?? null
      }
    }
  });

  const updated = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionRow(updated);
}

export async function submitDraft(creatorMissionId: string, accountId: string, payload: { videoUrl: string; note?: string }) {
  const current = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.accountId !== accountId) throw new AppError("Forbidden", 403, "CREATOR_MISSION_FORBIDDEN");
  if (current.status !== "DRAFT_PENDING") {
    throw new AppError("Creator mission is not ready for draft", 409, "CREATOR_MISSION_NOT_READY_FOR_DRAFT");
  }
  if (isPast(current.missionDeadlineAt)) {
    throw new AppError("Mission deadline has passed", 409, "MISSION_DEADLINE_PASSED");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.missionSubmission.findUnique({
      where: { missionId_accountId: { missionId: current.missionId, accountId } }
    });

    const submission = existing
      ? await tx.missionSubmission.update({
          where: { id: existing.id },
          data: {
            videoUrl: payload.videoUrl,
            note: payload.note ?? existing.note,
            socialPostUrl: null,
            screenshotUrl: null,
            fileUploadUrl: null,
            proofTextNote: null,
            lifecycleStatus: "PENDING_REVIEW",
            status: "SUBMITTED",
            reviewedById: null,
            reviewedAt: null,
            approvedAt: null,
            rejectReason: null
          }
        })
      : await tx.missionSubmission.create({
          data: {
            missionId: current.missionId,
            accountId,
            videoUrl: payload.videoUrl,
            note: payload.note,
            lifecycleStatus: "PENDING_REVIEW",
            status: "SUBMITTED"
          }
        });

    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "CreatorMission"
        SET
          "status" = 'IN_PROGRESS'::"CreatorMissionStatus",
          "startedAt" = COALESCE("startedAt", ${new Date()}),
          "videoReviewStatus" = 'PENDING'::"CreatorMissionVideoReviewStatus",
          "videoReviewFeedback" = null,
          "videoSubmittedAt" = ${new Date()},
          "videoReviewedAt" = null,
          "publishStatus" = 'NOT_SUBMITTED'::"CreatorMissionPublishStatus",
          "publishFeedback" = null,
          "publishSubmittedAt" = null,
          "publishReviewedAt" = null,
          "publishPurchaseAmountVnd" = null,
          "rewardCreditedAt" = null,
          "applicationId" = COALESCE("applicationId", ${submission.id}),
          "updatedAt" = ${new Date()}
        WHERE "id" = ${creatorMissionId}
      `
    );

    await tx.auditLog.create({
      data: {
        actorId: accountId,
        action: "CREATOR_MISSION_DRAFT_SUBMITTED",
        targetType: "CreatorMission",
        targetId: creatorMissionId,
        metadata: {
          missionSubmissionId: submission.id
        }
      }
    });

    return submission;
  });

  const updated = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");

  return {
    creatorMission: mapCreatorMissionRow(updated),
    submissionId: result.id,
    submissionLifecycleStatus: result.lifecycleStatus
  };
}

export async function confirmDepositAndProductReceivedByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "DEPOSIT_PRODUCT") {
    throw new AppError("Creator mission does not use deposit flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "CreatorMission"
      SET
        "depositStatus" = 'PAID'::"DepositStatus",
        "productStatus" = 'RECEIVED'::"ProductStatus",
        "status" = 'DRAFT_PENDING'::"CreatorMissionStatus",
        "updatedAt" = ${new Date()}
      WHERE "id" = ${creatorMissionId}
    `
  );

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATOR_MISSION_DEPOSIT_CONFIRMED_BY_ADMIN",
      targetType: "CreatorMission",
      targetId: creatorMissionId
    }
  });

  const updated = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionRow(updated);
}

export async function approvePurchaseProofByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") {
    throw new AppError("Creator mission does not use buy-first flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  }
  if (current.reimbursementStatus !== "PURCHASE_SUBMITTED") {
    throw new AppError("Creator mission does not have submitted purchase proof", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await withPurchaseProofColumnFallback(
    () =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "CreatorMission"
          SET
            "reimbursementStatus" = 'APPROVED'::"ReimbursementStatus",
            "productStatus" = 'RECEIVED'::"ProductStatus",
            "status" = 'DRAFT_PENDING'::"CreatorMissionStatus",
            "purchaseProofReviewedAt" = ${new Date()},
            "purchaseProofRejectReason" = null,
            "updatedAt" = ${new Date()}
          WHERE "id" = ${creatorMissionId}
        `
      ),
    () =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "CreatorMission"
          SET
            "reimbursementStatus" = 'APPROVED'::"ReimbursementStatus",
            "productStatus" = 'RECEIVED'::"ProductStatus",
            "status" = 'DRAFT_PENDING'::"CreatorMissionStatus",
            "updatedAt" = ${new Date()}
          WHERE "id" = ${creatorMissionId}
        `
      )
  );

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATOR_MISSION_PURCHASE_PROOF_APPROVED",
      targetType: "CreatorMission",
      targetId: creatorMissionId
    }
  });

  const updated = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionRow(updated);
}

export async function rejectPurchaseProofByAdmin(actorId: string, creatorMissionId: string, reason?: string) {
  const current = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") {
    throw new AppError("Creator mission does not use buy-first flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  }
  if (current.reimbursementStatus !== "PURCHASE_SUBMITTED") {
    throw new AppError("Creator mission does not have submitted purchase proof", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await withPurchaseProofColumnFallback(
    () =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "CreatorMission"
          SET
            "reimbursementStatus" = 'REJECTED'::"ReimbursementStatus",
            "productStatus" = 'WAITING_PURCHASE'::"ProductStatus",
            "status" = 'PRODUCT_PENDING'::"CreatorMissionStatus",
            "purchaseProofReviewedAt" = ${new Date()},
            "purchaseProofRejectReason" = ${reason ?? "Purchase proof rejected"},
            "updatedAt" = ${new Date()}
          WHERE "id" = ${creatorMissionId}
        `
      ),
    () =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "CreatorMission"
          SET
            "reimbursementStatus" = 'REJECTED'::"ReimbursementStatus",
            "productStatus" = 'WAITING_PURCHASE'::"ProductStatus",
            "status" = 'PRODUCT_PENDING'::"CreatorMissionStatus",
            "updatedAt" = ${new Date()}
          WHERE "id" = ${creatorMissionId}
        `
      )
  );

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATOR_MISSION_PURCHASE_PROOF_REJECTED",
      targetType: "CreatorMission",
      targetId: creatorMissionId,
      metadata: { reason: reason ?? null }
    }
  });

  const updated = await getCreatorMissionRowById(prisma, creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionRow(updated);
}

async function getCreatorMissionWorkflowById(creatorMissionId: string) {
  return prisma.creatorMission.findUnique({
    where: { id: creatorMissionId },
    select: creatorMissionWorkflowSelect
  });
}

export async function confirmProductPurchased(creatorMissionId: string, accountId: string) {
  const current = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.accountId !== accountId) throw new AppError("Forbidden", 403, "CREATOR_MISSION_FORBIDDEN");
  if (current.productReceiveOption !== "CREATOR_BUY_FIRST") {
    throw new AppError("Creator mission does not use buy-first flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  }
  if (!current.mission.productLink) {
    throw new AppError("Mission product link is missing", 409, "MISSION_PRODUCT_LINK_MISSING");
  }
  if (current.status !== "PRODUCT_PENDING" || current.productStatus !== "WAITING_PURCHASE") {
    throw new AppError("Creator mission is not waiting product purchase confirmation", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      status: "DRAFT_PENDING",
      productStatus: "RECEIVED",
      reimbursementStatus: "PENDING",
      productPurchasedConfirmedAt: new Date(),
      updatedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CREATOR_MISSION_PRODUCT_PURCHASE_CONFIRMED",
      targetType: "CreatorMission",
      targetId: creatorMissionId
    }
  });

  const updated = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionWorkflow(updated);
}

export async function submitPublishReport(
  creatorMissionId: string,
  accountId: string,
  payload: { socialPostUrl: string; adCode?: string; purchaseInvoiceUrl?: string; ratingImageUrl?: string; note?: string }
) {
  const current = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.accountId !== accountId) throw new AppError("Forbidden", 403, "CREATOR_MISSION_FORBIDDEN");
  if (current.videoReviewStatus !== "APPROVED") {
    throw new AppError("Video draft must be approved before publish report", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  }
  if (!current.application) {
    throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  }
  if (current.productReceiveOption === "CREATOR_BUY_FIRST") {
    if (!payload.purchaseInvoiceUrl?.trim()) {
      throw new AppError("Purchase invoice url is required for CREATOR_BUY_FIRST", 422, "PURCHASE_INVOICE_REQUIRED");
    }
    if (!payload.ratingImageUrl?.trim()) {
      throw new AppError("Rating image url is required for CREATOR_BUY_FIRST", 422, "RATING_IMAGE_REQUIRED");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.application!.id },
      data: {
        socialPostUrl: payload.socialPostUrl,
        proofTextNote: payload.adCode ?? null,
        screenshotUrl: payload.purchaseInvoiceUrl ?? null,
        fileUploadUrl: payload.ratingImageUrl ?? null,
        note: payload.note ?? null,
        lifecycleStatus: "SUBMITTED",
        status: "SUBMITTED",
        reviewedById: null,
        reviewedAt: null,
        approvedAt: null,
        rejectReason: null
      }
    });

    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        publishStatus: "PENDING",
        publishFeedback: null,
        publishSubmittedAt: new Date(),
        publishReviewedAt: null,
        updatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: accountId,
        action: "CREATOR_MISSION_PUBLISH_REPORT_SUBMITTED",
        targetType: "CreatorMission",
        targetId: creatorMissionId,
        metadata: {
          socialPostUrl: payload.socialPostUrl,
          purchaseInvoiceUrl: payload.purchaseInvoiceUrl ?? null,
          ratingImageUrl: payload.ratingImageUrl ?? null
        }
      }
    });
  });

  const updated = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionWorkflow(updated);
}

export async function approveVideoReviewByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (!current.application) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.videoReviewStatus !== "PENDING") {
    throw new AppError("Creator mission is not waiting for video review", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.application!.id },
      data: {
        lifecycleStatus: "APPROVED",
        status: "APPROVED",
        reviewedById: actorId,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        rejectReason: null
      }
    });

    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        videoReviewStatus: "APPROVED",
        videoReviewFeedback: null,
        videoReviewedAt: new Date(),
        publishStatus: "NOT_SUBMITTED",
        publishFeedback: null,
        updatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CREATOR_MISSION_VIDEO_REVIEW_APPROVED",
        targetType: "CreatorMission",
        targetId: creatorMissionId
      }
    });
  });

  const updated = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionWorkflow(updated);
}

export async function rejectVideoReviewByAdmin(actorId: string, creatorMissionId: string, reason: string) {
  const current = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (!current.application) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.videoReviewStatus !== "PENDING") {
    throw new AppError("Creator mission is not waiting for video review", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.application!.id },
      data: {
        lifecycleStatus: "REJECTED",
        status: "REJECTED",
        rejectReason: reason,
        reviewedById: actorId,
        reviewedAt: new Date(),
        approvedAt: null
      }
    });

    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "DRAFT_PENDING",
        videoReviewStatus: "REJECTED",
        videoReviewFeedback: reason,
        videoReviewedAt: new Date(),
        publishStatus: "NOT_SUBMITTED",
        publishFeedback: null,
        publishSubmittedAt: null,
        publishReviewedAt: null,
        updatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CREATOR_MISSION_VIDEO_REVIEW_REJECTED",
        targetType: "CreatorMission",
        targetId: creatorMissionId,
        metadata: { reason }
      }
    });
  });

  const updated = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionWorkflow(updated);
}

export async function approvePublishReportByAdmin(
  actorId: string,
  creatorMissionId: string,
  purchaseAmountVnd: number
) {
  const current = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (!current.application) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus !== "PENDING") {
    throw new AppError("Creator mission publish report is not pending", 409, "CREATOR_MISSION_INVALID_STATUS");
  }
  if (current.videoReviewStatus !== "APPROVED") {
    throw new AppError("Video draft must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  }
  if (!current.application.socialPostUrl) {
    throw new AppError("Publish report missing social post url", 422, "PUBLISH_REPORT_MISSING_SOCIAL_URL");
  }

  const purchasePoints = Math.floor(purchaseAmountVnd / 100);
  const missionRewardPoints = current.mission.rewardPoints;
  const pointsDelta = missionRewardPoints + purchasePoints;
  const idempotencyKey = `creator_mission_reward_${creatorMissionId}`;

  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.application!.id },
      data: {
        lifecycleStatus: "DONE",
        status: "APPROVED",
        reviewedById: actorId,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        rejectReason: null,
        rewardGrantedAt: new Date()
      }
    });

    const wallet = await tx.wallet.upsert({
      where: { userId: current.accountId },
      create: { userId: current.accountId },
      update: {}
    });

    const existingRewardTx = await tx.walletTransaction.findUnique({
      where: {
        walletId_idempotencyKey: {
          walletId: wallet.id,
          idempotencyKey
        }
      }
    });

    if (!existingRewardTx) {
      const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pointsBalance: currentWallet.pointsBalance + pointsDelta
        }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          accountId: current.accountId,
          type: "ADJUSTMENT",
          pointsDelta,
          cashDeltaVnd: 0,
          balanceAfterPoints: updatedWallet.pointsBalance,
          balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
          referenceType: "CREATOR_MISSION",
          referenceId: creatorMissionId,
          idempotencyKey
        }
      });
    }

    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        publishStatus: "APPROVED",
        publishFeedback: null,
        publishReviewedAt: new Date(),
        publishPurchaseAmountVnd: purchaseAmountVnd,
        rewardCreditedAt: new Date(),
        reimbursementStatus: current.productReceiveOption === "CREATOR_BUY_FIRST" ? "PAID" : current.reimbursementStatus,
        updatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CREATOR_MISSION_PUBLISH_REPORT_APPROVED",
        targetType: "CreatorMission",
        targetId: creatorMissionId,
        metadata: {
          purchaseAmountVnd,
          purchasePoints,
          missionRewardPoints,
          totalPointsGranted: pointsDelta
        }
      }
    });
  });

  const updated = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionWorkflow(updated);
}

export async function rejectPublishReportByAdmin(actorId: string, creatorMissionId: string, reason: string) {
  const current = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (!current.application) throw new AppError("Mission submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus !== "PENDING") {
    throw new AppError("Creator mission publish report is not pending", 409, "CREATOR_MISSION_INVALID_STATUS");
  }

  await prisma.$transaction(async (tx) => {
    await tx.missionSubmission.update({
      where: { id: current.application!.id },
      data: {
        lifecycleStatus: "APPROVED",
        status: "APPROVED",
        reviewedById: actorId,
        reviewedAt: new Date(),
        rejectReason: null
      }
    });

    await tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        publishStatus: "REJECTED",
        publishFeedback: reason,
        publishReviewedAt: new Date(),
        updatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CREATOR_MISSION_PUBLISH_REPORT_REJECTED",
        targetType: "CreatorMission",
        targetId: creatorMissionId,
        metadata: { reason }
      }
    });
  });

  const updated = await getCreatorMissionWorkflowById(creatorMissionId);
  if (!updated) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  return mapCreatorMissionWorkflow(updated);
}
