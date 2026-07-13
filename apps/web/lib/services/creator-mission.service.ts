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
import { DCREATOR_ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { prisma } from "@/lib/db";
import { cleanDisplayUrl, getBrandDisplayName } from "@/lib/display-identity";
import { AppError } from "@/lib/errors";
import { trackDcreatorEvent } from "@/lib/services/analytics-event.service";
import {
  createNotification,
  createNotificationForAdminOps,
  createNotificationForBrandMembers
} from "@/lib/services/notification.service";

type DbClient = Prisma.TransactionClient | typeof prisma;
type Sort = "newest" | "oldest";
type FinalReviewResubmitField = "PUBLIC_URL" | "AD_CODE" | "SCREENSHOT" | "PURCHASE_BILL" | "PRODUCT_REVIEW_SCREENSHOT";
const FINAL_REVIEW_REJECT_META_PREFIX = "[[FINAL_REVIEW_REJECT_META]]:";

type CreatorShippingInput = {
  recipientName?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  addressLine?: string;
  note?: string;
};

const creatorMissionInclude = {
  mission: {
    select: {
      id: true,
      title: true,
      description: true,
      productName: true,
      productDescription: true,
      productImageUrl: true,
      productLink: true,
      rewardPoints: true,
      rewardCommissionVnd: true,
      audience: true,
      productReceiveOption: true,
      allowRepeat: true,
      deadlineAt: true
    }
  },
  campaign: {
    select: {
      id: true,
      title: true,
      brief: true,
      slug: true,
      coverImageUrl: true,
      brandId: true,
      creatorBriefTitle: true,
      creatorBriefDescription: true,
      productName: true,
      productDescription: true,
      productImageUrl: true,
      productLink: true,
      endsAt: true,
      fulfillmentMode: true,
      creatorDepositRequired: true,
      creatorDepositAmountVnd: true,
      brand: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          ownedBrands: {
            select: { name: true, legalName: true, logoUrl: true },
            orderBy: { updatedAt: "desc" },
            take: 1
          }
        }
      }
    }
  },
  account: {
    select: {
      id: true,
      displayName: true,
      email: true,
      creatorProfile: {
        select: {
          mainPlatform: true,
          socialUrl: true,
          followerCount: true,
          socialLinks: {
            where: { isActive: true },
            select: { id: true, platform: true, socialUrl: true, followers: true, handle: true, isActive: true, status: true }
          }
        }
      }
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

function serializeFinalReviewRejectFeedback(reason: string, requiredResubmitFields: FinalReviewResubmitField[]) {
  return `${FINAL_REVIEW_REJECT_META_PREFIX}${JSON.stringify({ reason, requiredResubmitFields })}`;
}

function parseStructuredFeedback(raw: string | null | undefined) {
  if (!raw) return { reason: null as string | null, requiredResubmitFields: [] as FinalReviewResubmitField[] };
  if (!raw.startsWith(FINAL_REVIEW_REJECT_META_PREFIX)) {
    return { reason: raw, requiredResubmitFields: [] as FinalReviewResubmitField[] };
  }
  try {
    const parsed = JSON.parse(raw.slice(FINAL_REVIEW_REJECT_META_PREFIX.length)) as {
      reason?: string;
      requiredResubmitFields?: FinalReviewResubmitField[];
    };
    return {
      reason: parsed.reason?.trim() || null,
      requiredResubmitFields: Array.isArray(parsed.requiredResubmitFields) ? parsed.requiredResubmitFields : []
    };
  } catch {
    return { reason: raw, requiredResubmitFields: [] as FinalReviewResubmitField[] };
  }
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

  return {
    status: "PRODUCT_PENDING" as const,
    productStatus: "WAITING_PURCHASE" as ProductStatus,
    depositStatus: "NOT_REQUIRED" as DepositStatus,
    reimbursementStatus: "PENDING" as ReimbursementStatus,
    startedAt: null
  };
}

function buildMissionView(item: CreatorMissionEntity) {
  return {
    id: item.mission?.id ?? item.campaignId,
    title: item.campaign.title,
    description: item.campaign.brief ?? item.mission?.description ?? "",
    rewardPoints: 0,
    rewardCommissionVnd: 0,
    audience: item.mission?.audience ?? "CREATOR",
    productReceiveOption: item.productReceiveOption,
    allowRepeat: item.mission?.allowRepeat ?? false,
    deadlineAt: dt(item.campaign.endsAt ?? item.mission?.deadlineAt),
    productName: item.campaign.productName ?? item.mission?.productName ?? null,
    productDescription: item.campaign.productDescription ?? item.mission?.productDescription ?? null,
    productImageUrl: item.campaign.productImageUrl ?? item.mission?.productImageUrl ?? null,
    productLink: item.campaign.productLink ?? item.mission?.productLink ?? null
  };
}

function mapMission(item: CreatorMissionEntity) {
  const submissionRejectFeedback = parseStructuredFeedback(item.submissionRejectReason);
  const publishRejectFeedback = parseStructuredFeedback(item.publishFeedback);
  const submission = {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lifecycleStatus: item.submissionLifecycleStatus,
    status: item.submissionStatus,
    transcriptType: item.submissionTranscriptType,
    transcriptTextNote: item.submissionTranscriptTextNote,
    transcriptResourceUrl: item.submissionTranscriptResourceUrl,
    videoUrl: item.submissionVideoUrl,
    socialPostUrl: item.submissionSocialPostUrl,
    screenshotUrl: item.submissionScreenshotUrl,
    fileUploadUrl: item.submissionFileUploadUrl,
    proofTextNote: item.submissionProofTextNote,
    note: item.submissionNote,
    rejectReason: submissionRejectFeedback.reason,
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
  creatorDepositAmountVnd: item.creatorDepositAmountVnd,
  depositHeldAt: dt(item.depositHeldAt),
  depositRefundedAt: dt(item.depositRefundedAt),
  depositTransactionId: item.depositTransactionId,
  shippingRecipientName: item.shippingRecipientName,
  shippingPhone: item.shippingPhone,
  shippingProvince: item.shippingProvince,
  shippingDistrict: item.shippingDistrict,
  shippingWard: item.shippingWard,
  shippingAddressLine: item.shippingAddressLine,
  shippingNote: item.shippingNote,
  shippingInfoSubmittedAt: dt(item.shippingInfoSubmittedAt),
  sampleShippingStatus: item.sampleShippingStatus,
  sampleShippedAt: dt(item.sampleShippedAt),
  sampleReceivedAt: dt(item.sampleReceivedAt),
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
    publishFeedback: publishRejectFeedback.reason,
    publishResubmitFields: publishRejectFeedback.requiredResubmitFields,
    publishSubmittedAt: dt(item.publishSubmittedAt),
    publishReviewedAt: dt(item.publishReviewedAt),
    publishPurchaseAmountVnd: item.publishPurchaseAmountVnd,
    rewardCreditedAt: dt(item.rewardCreditedAt),
    assignedAt: item.assignedAt.toISOString(),
    startedAt: dt(item.startedAt),
    completedAt: dt(item.completedAt),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    mission: buildMissionView(item),
    campaign: {
      ...item.campaign,
      brand: {
        ...item.campaign.brand,
        ownerDisplayName: item.campaign.brand.displayName,
        displayName: getBrandDisplayName({ brand: item.campaign.brand.ownedBrands[0] ?? null }),
        avatarUrl: resolveBrandAvatar(item.campaign.brand)
      }
    },
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

function missionRequiresHeldCreatorDeposit(item: CreatorMissionEntity) {
  return item.campaign.fulfillmentMode === "BRAND_SHIP" && item.campaign.creatorDepositRequired;
}

function assertHeldCreatorDeposit(item: CreatorMissionEntity) {
  if (missionRequiresHeldCreatorDeposit(item) && item.depositStatus !== "HELD") {
    throw new AppError("Campaign này yêu cầu đặt cọc trước khi nộp proof/video.", 409, "CREATOR_DEPOSIT_REQUIRED");
  }
}

function campaignDepositAmount(item: CreatorMissionEntity) {
  return item.creatorDepositAmountVnd > 0 ? item.creatorDepositAmountVnd : item.campaign.creatorDepositAmountVnd;
}

function normalizeCreatorShipping(input: CreatorShippingInput | undefined) {
  const shipping = {
    recipientName: input?.recipientName?.trim() ?? "",
    phone: input?.phone?.trim() ?? "",
    province: input?.province?.trim() ?? "",
    district: input?.district?.trim() ?? "",
    ward: input?.ward?.trim() ?? "",
    addressLine: input?.addressLine?.trim() ?? "",
    note: input?.note?.trim() ?? ""
  };
  if (!shipping.recipientName) throw new AppError("Họ tên người nhận là bắt buộc.", 422, "SHIPPING_RECIPIENT_REQUIRED");
  if (!shipping.phone) throw new AppError("Số điện thoại nhận hàng là bắt buộc.", 422, "SHIPPING_PHONE_REQUIRED");
  if (!shipping.province) throw new AppError("Tỉnh/Thành phố nhận hàng là bắt buộc.", 422, "SHIPPING_PROVINCE_REQUIRED");
  if (!shipping.addressLine) throw new AppError("Địa chỉ chi tiết nhận hàng là bắt buộc.", 422, "SHIPPING_ADDRESS_REQUIRED");
  return shipping;
}

function shippingUpdateData(shipping: ReturnType<typeof normalizeCreatorShipping>) {
  return {
    shippingRecipientName: shipping.recipientName,
    shippingPhone: shipping.phone,
    shippingProvince: shipping.province,
    shippingDistrict: shipping.district || null,
    shippingWard: shipping.ward || null,
    shippingAddressLine: shipping.addressLine,
    shippingNote: shipping.note || null,
    shippingInfoSubmittedAt: now()
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
  missionId: string | null | undefined,
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

  if (!missionId) return;

  await tx.missionSubmission.updateMany({
    where: { missionId, accountId },
    data
  });
}

async function notifyCreator(accountId: string, event: NotificationEvent, title: string, content: string, metadata: Record<string, unknown>) {
  await createNotification({ accountId, event, title, content, metadata });
}

async function notifyBrandStaffForMissionReview(
  brandId: string | null | undefined,
  title: string,
  content: string,
  metadata: Record<string, unknown>
) {
  if (!brandId) return;
  await createNotificationForBrandMembers({
    brandId,
    event: NotificationEvent.CREATOR_PROOF_SUBMITTED,
    title,
    content,
    metadata
  });
}

async function notifyAdminOpsForMissionReview(
  accountId: string,
  title: string,
  content: string,
  metadata: Record<string, unknown>
) {
  await createNotificationForAdminOps({
    event: NotificationEvent.CREATOR_PROOF_SUBMITTED,
    title,
    content,
    metadata,
    excludeAccountId: accountId
  });
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

async function debitCreatorDepositIfBalanceAllows(
  tx: Prisma.TransactionClient,
  accountId: string,
  creatorMissionId: string,
  amount: number
) {
  const wallet = await tx.wallet.upsert({
    where: { userId: accountId },
    create: { userId: accountId },
    update: {}
  });
  const idempotencyKey = `creator_deposit_hold_${creatorMissionId}`;
  const existing = await tx.walletTransaction.findUnique({
    where: { walletId_idempotencyKey: { walletId: wallet.id, idempotencyKey } }
  });
  if (existing) return existing;

  const rows = await tx.$queryRaw<Array<{ id: string; pointsBalance: number; cashBalanceVnd: number }>>`
    UPDATE "Wallet"
    SET "pointsBalance" = "pointsBalance" - ${amount}
    WHERE "id" = ${wallet.id}
      AND "pointsBalance" >= ${amount}
    RETURNING "id", "pointsBalance", "cashBalanceVnd"
  `;
  const updatedWallet = rows[0];
  if (!updatedWallet) return null;

  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      accountId,
      type: "CREATOR_DEPOSIT_HOLD",
      pointsDelta: -amount,
      cashDeltaVnd: 0,
      balanceAfterPoints: updatedWallet.pointsBalance,
      balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
      referenceType: "CREATOR_MISSION",
      referenceId: creatorMissionId,
      idempotencyKey
    }
  });
}

async function recordAdminConfirmedCreatorDeposit(
  tx: Prisma.TransactionClient,
  accountId: string,
  creatorMissionId: string
) {
  const wallet = await tx.wallet.upsert({
    where: { userId: accountId },
    create: { userId: accountId },
    update: {}
  });
  const idempotencyKey = `creator_deposit_admin_confirmed_${creatorMissionId}`;
  const existing = await tx.walletTransaction.findUnique({
    where: { walletId_idempotencyKey: { walletId: wallet.id, idempotencyKey } }
  });
  if (existing) return existing;
  const current = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      accountId,
      type: "CREATOR_DEPOSIT_ADMIN_CONFIRMED",
      pointsDelta: 0,
      cashDeltaVnd: 0,
      balanceAfterPoints: current.pointsBalance,
      balanceAfterCashVnd: current.cashBalanceVnd,
      referenceType: "CREATOR_MISSION",
      referenceId: creatorMissionId,
      idempotencyKey
    }
  });
}

async function refundCreatorDepositIfNeeded(
  tx: Prisma.TransactionClient,
  current: CreatorMissionEntity
) {
  if (
    current.campaign.fulfillmentMode !== "BRAND_SHIP" ||
    !current.campaign.creatorDepositRequired ||
    current.depositStatus !== "HELD"
  ) {
    return null;
  }
  const amount = campaignDepositAmount(current);
  if (amount <= 0) return null;

  const wallet = await tx.wallet.upsert({
    where: { userId: current.accountId },
    create: { userId: current.accountId },
    update: {}
  });
  const idempotencyKey = `creator_deposit_refund_${current.id}`;
  const existing = await tx.walletTransaction.findUnique({
    where: { walletId_idempotencyKey: { walletId: wallet.id, idempotencyKey } }
  });
  if (existing) return existing;

  const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  const updatedWallet = await tx.wallet.update({
    where: { id: wallet.id },
    data: { pointsBalance: currentWallet.pointsBalance + amount }
  });
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      accountId: current.accountId,
      type: "CREATOR_DEPOSIT_REFUND",
      pointsDelta: amount,
      cashDeltaVnd: 0,
      balanceAfterPoints: updatedWallet.pointsBalance,
      balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
      referenceType: "CREATOR_MISSION",
      referenceId: current.id,
      idempotencyKey
    }
  });
}

async function syncCreatorMissions(accountId: string) {
  void accountId;
}

export function getCreatorMissionGuidanceByOption(option: ProductReceiveOption) {
  if (option === "PRODUCT_REQUIRED") return "Bạn cần xác nhận sản phẩm theo yêu cầu trước khi nộp video và link public.";
  return "Nhiệm vụ không yêu cầu sản phẩm, có thể nộp video ngay.";
}

export async function ensureCreatorMissionFromApprovedApplication(
  db: DbClient,
  input: {
    missionId?: string | null;
    campaignId: string;
    accountId: string;
    applicationId?: string;
    missionApplicationId?: string;
    submissionId?: string;
  }
) {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, productName: true }
  });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

  const mission = input.missionId
    ? await db.mission.findUnique({
        where: { id: input.missionId },
        select: { id: true, productReceiveOption: true }
      })
    : null;

  const existing = await db.creatorMission.findFirst({
    where: { campaignId: input.campaignId, accountId: input.accountId }
  });

  if (existing) {
    return db.creatorMission.update({
      where: { id: existing.id },
      data: {
        missionId: existing.missionId ?? input.missionId ?? null,
        submissionId: existing.submissionId ?? input.submissionId ?? input.applicationId ?? null,
        missionApplicationId: existing.missionApplicationId ?? input.missionApplicationId ?? null,
        applicationStatus: existing.applicationStatus ?? "PENDING_REVIEW",
        submissionLifecycleStatus: existing.submissionLifecycleStatus ?? "ACCEPTED",
        submissionStatus: existing.submissionStatus ?? "OPEN"
      }
    });
  }

  const initial = toCreatorMissionState(mission?.productReceiveOption ?? "PRODUCT_REQUIRED");
  return db.creatorMission.create({
    data: {
      missionId: input.missionId ?? null,
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
      productReceiveOption: mission?.productReceiveOption ?? "PRODUCT_REQUIRED",
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
  campaignId?: string;
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

  if (input.campaignId?.trim()) {
    where.campaignId = input.campaignId.trim();
  }

  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
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

export async function confirmDepositPaid(creatorMissionId: string, accountId: string, shippingInput?: CreatorShippingInput) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  if (missionRequiresHeldCreatorDeposit(current)) {
    if (current.depositStatus === "HELD") return mapMission(current);
    const amount = campaignDepositAmount(current);
    if (amount <= 0) {
      throw new AppError("Campaign chưa cấu hình tiền cọc Creator.", 409, "CREATOR_DEPOSIT_AMOUNT_MISSING");
    }
    const shipping = normalizeCreatorShipping(shippingInput);
    const updated = await prisma.$transaction(async (tx) => {
      const depositTransaction = await debitCreatorDepositIfBalanceAllows(tx, accountId, creatorMissionId, amount);
      return tx.creatorMission.update({
        where: { id: creatorMissionId },
        data: {
          ...shippingUpdateData(shipping),
          creatorDepositAmountVnd: amount,
          depositStatus: depositTransaction ? "HELD" : "WAITING_TRANSFER",
          productStatus: "WAITING_DEPOSIT",
          depositHeldAt: depositTransaction ? now() : null,
          depositTransactionId: depositTransaction?.id ?? null,
          sampleShippingStatus: depositTransaction ? "READY_TO_SHIP" : "WAITING_DEPOSIT"
        },
        include: creatorMissionInclude
      });
    });
    if (updated.depositStatus === "HELD") {
      await notifyCreator(
        accountId,
        "CREATOR_FULFILLMENT_UPDATED",
        "Đã đặt cọc bằng N-Points",
        "Hệ thống đã giữ N-Points đặt cọc. Brand/Admin có thể gửi hàng theo thông tin nhận hàng của bạn.",
        { creatorMissionId }
      );
    } else {
      await notifyCreator(
        accountId,
        "CREATOR_FULFILLMENT_UPDATED",
        "Đang chờ xác nhận cọc",
        "Số dư N-Points chưa đủ. Vui lòng chuyển khoản theo hướng dẫn và chờ Admin xác nhận.",
        { creatorMissionId }
      );
    }
    return mapMission(updated);
  }
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      status: "IN_PROGRESS",
      productStatus: "RECEIVED",
      depositStatus: "PAID",
      startedAt: current.startedAt ?? now()
    },
    include: creatorMissionInclude
  });
  await notifyCreator(accountId, "CREATOR_PROOF_SUBMITTED", "Đã gửi xác nhận mua sản phẩm", "Bước xác nhận mua sản phẩm của bạn đã được ghi nhận.", { creatorMissionId });
  await notifyBrandStaffForMissionReview(
    current.campaign.brandId,
    "Creator submitted purchase proof",
    `Creator submitted purchase proof for campaign "${current.campaign.title}".`,
    { creatorMissionId, campaignId: current.campaign.id }
  );
  await notifyAdminOpsForMissionReview(
    accountId,
    "Creator nộp proof mua hàng",
    `Creator vừa nộp proof mua hàng cho campaign "${current.campaign.title}".`,
    { creatorMissionId, campaignId: current.campaign.id }
  );
  return mapMission(updated);
}

export async function submitPurchaseProof(creatorMissionId: string, accountId: string, payload: { proofTextNote: string; screenshotUrl?: string; note?: string }) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
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
  await notifyCreator(accountId, "CREATOR_PROOF_SUBMITTED", "Đã gửi xác nhận mua sản phẩm", "Bước xác nhận mua sản phẩm của bạn đã được ghi nhận.", { creatorMissionId });
  await notifyBrandStaffForMissionReview(
    updated.campaign.brandId,
    "Creator submitted purchase proof",
    `Creator submitted purchase proof for campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  await notifyAdminOpsForMissionReview(
    accountId,
    "Creator nộp proof mua hàng",
    `Creator vừa nộp proof mua hàng cho campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  return mapMission(updated);
}

export async function submitDraft(creatorMissionId: string, accountId: string, payload: { videoUrl: string; note?: string }) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  assertHeldCreatorDeposit(current);
  if (current.status === "DRAFT_PENDING") {
    throw new AppError("Transcript must be approved first", 409, "CREATOR_MISSION_TRANSCRIPT_NOT_APPROVED");
  }
  if (
    current.productReceiveOption === "PRODUCT_REQUIRED" &&
    current.campaign.fulfillmentMode === "CREATOR_ORDER" &&
    current.productStatus !== "RECEIVED"
  ) {
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
  await notifyCreator(accountId, "CREATOR_PROOF_SUBMITTED", "Đã gửi video review", "Video review của bạn đã được gửi để Brand/Admin duyệt.", { creatorMissionId });
  await notifyBrandStaffForMissionReview(
    updated.campaign.brandId,
    "Creator submitted video review",
    `A video review was submitted for campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  await notifyAdminOpsForMissionReview(
    accountId,
    "Creator nộp video review",
    `Creator vừa nộp video review cho campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  return { creatorMission: mapMission(updated), submissionId: updated.submissionId, submissionLifecycleStatus: updated.submissionLifecycleStatus };
}

export async function confirmDepositAndProductReceivedByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const amount = campaignDepositAmount(current);
  const updated = await prisma.$transaction(async (tx) => {
    const transaction =
      current.campaign.fulfillmentMode === "BRAND_SHIP"
        ? await recordAdminConfirmedCreatorDeposit(tx, current.accountId, creatorMissionId)
        : null;
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        productStatus: current.campaign.fulfillmentMode === "BRAND_SHIP" ? "WAITING_DEPOSIT" : "RECEIVED",
        depositStatus: current.campaign.fulfillmentMode === "BRAND_SHIP" ? "HELD" : "PAID",
        creatorDepositAmountVnd: amount > 0 ? amount : current.creatorDepositAmountVnd,
        depositHeldAt: current.depositHeldAt ?? now(),
        depositTransactionId: current.depositTransactionId ?? transaction?.id ?? null,
        sampleShippingStatus: current.campaign.fulfillmentMode === "BRAND_SHIP" ? "READY_TO_SHIP" : "NOT_REQUIRED",
        purchaseProofReviewedAt: now(),
        purchaseProofRejectReason: null,
        startedAt: current.startedAt ?? now()
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_FULFILLMENT_UPDATED", "Đã xác nhận cọc", "Admin đã xác nhận tiền cọc. Brand/Admin có thể gửi hàng theo thông tin nhận hàng của bạn.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function markSampleShippedByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.campaign.fulfillmentMode !== "BRAND_SHIP") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  if (current.depositStatus !== "HELD") throw new AppError("Creator deposit must be held before shipping sample.", 409, "CREATOR_DEPOSIT_REQUIRED");
  const updated = await prisma.creatorMission.update({
    where: { id: creatorMissionId },
    data: {
      sampleShippingStatus: "SHIPPED",
      sampleShippedAt: current.sampleShippedAt ?? now()
    },
    include: creatorMissionInclude
  });
  await notifyCreator(updated.accountId, "CREATOR_FULFILLMENT_UPDATED", "Brand/Admin đã gửi hàng", "Hàng review đã được đánh dấu là đã gửi theo thông tin nhận hàng của bạn.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function approvePurchaseProofByAdmin(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
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
  await notifyCreator(updated.accountId, "CREATOR_FULFILLMENT_UPDATED", "Đã duyệt bằng chứng mua hàng", "Bạn có thể tiếp tục nộp video review.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function rejectPurchaseProofByAdmin(actorId: string, creatorMissionId: string, reason?: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission not found", 404, "CREATOR_MISSION_NOT_FOUND");
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
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
  await notifyCreator(updated.accountId, "CREATOR_FULFILLMENT_UPDATED", "Bằng chứng mua hàng bị từ chối", feedback, { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function confirmProductPurchased(creatorMissionId: string, accountId: string) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
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
  payload: {
    socialPostUrl: string;
    adCode?: string;
    screenshotUrl?: string;
    purchaseBillImageUrl?: string;
    productReviewScreenshotUrl?: string;
    purchaseInvoiceUrl?: string;
    ratingImageUrl?: string;
    note?: string;
  }
) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  assertHeldCreatorDeposit(current);
  if (current.videoReviewStatus !== "APPROVED") throw new AppError("Video must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  const adCode = payload.adCode?.trim();
  if (!adCode) throw new AppError("Mã quảng cáo là bắt buộc.", 422, "AD_CODE_REQUIRED");
  const purchaseBillImageUrl = payload.purchaseBillImageUrl ?? payload.purchaseInvoiceUrl;
  const productReviewScreenshotUrl = payload.productReviewScreenshotUrl ?? payload.ratingImageUrl;
  const requiresCreatorOrderProof = current.productReceiveOption === "PRODUCT_REQUIRED" && current.campaign.fulfillmentMode === "CREATOR_ORDER";
  if (requiresCreatorOrderProof) {
    if (!purchaseBillImageUrl?.trim()) throw new AppError("Ảnh bill mua hàng là bắt buộc.", 422, "PURCHASE_BILL_REQUIRED");
    if (!productReviewScreenshotUrl?.trim()) throw new AppError("Ảnh đánh giá 5 sao là bắt buộc.", 422, "PRODUCT_REVIEW_SCREENSHOT_REQUIRED");
  }
  await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      socialPostUrl: payload.socialPostUrl,
      publicVideoUrl: payload.socialPostUrl,
      adCode,
      screenshotUrl: current.campaign.fulfillmentMode === "CREATOR_ORDER" ? payload.screenshotUrl ?? null : null,
      purchaseBillImageUrl: requiresCreatorOrderProof ? purchaseBillImageUrl ?? current.submissionPurchaseBillImageUrl : null,
      productReviewScreenshotUrl: requiresCreatorOrderProof ? productReviewScreenshotUrl ?? current.submissionProductReviewScreenshotUrl : null,
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
        submissionAdCode: adCode,
        submissionScreenshotUrl: current.campaign.fulfillmentMode === "CREATOR_ORDER" ? payload.screenshotUrl ?? null : null,
        submissionPurchaseBillImageUrl: requiresCreatorOrderProof ? purchaseBillImageUrl ?? current.submissionPurchaseBillImageUrl : null,
        submissionProductReviewScreenshotUrl: requiresCreatorOrderProof ? productReviewScreenshotUrl ?? current.submissionProductReviewScreenshotUrl : null,
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
  await notifyCreator(accountId, "CREATOR_PROOF_SUBMITTED", "Đã gửi link social public", "Link social public của bạn đã được gửi để Brand/Admin duyệt.", { creatorMissionId });
  await notifyBrandStaffForMissionReview(
    updated.campaign.brandId,
    "Creator submitted public link",
    `A public link was submitted for campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  await notifyAdminOpsForMissionReview(
    accountId,
    "Creator nộp link public",
    `Creator vừa nộp link public cho campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
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
  await notifyCreator(updated.accountId, "CREATOR_VIDEO_APPROVED", "Video đã được duyệt", "Bạn có thể tiếp tục nộp link social public.", { creatorMissionId, actorId });
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
  await notifyCreator(updated.accountId, "CREATOR_VIDEO_REJECTED", "Video bị từ chối", feedback, { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function approvePublishReportByAdmin(actorId: string, creatorMissionId: string, purchaseAmountVnd: number) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus === "APPROVED" && current.status === "COMPLETED") return mapMission(current);
  const isRefundPendingAfterBrandApproval =
    current.publishStatus === "APPROVED" &&
    current.productReceiveOption === "PRODUCT_REQUIRED" &&
    current.reimbursementStatus === "PAYOUT_PENDING";
  if (current.publishStatus !== "PENDING" && !isRefundPendingAfterBrandApproval) {
    throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  }
  if (current.videoReviewStatus !== "APPROVED") throw new AppError("Video must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");
  if (current.productReceiveOption === "PRODUCT_REQUIRED" && purchaseAmountVnd <= 0) {
    throw new AppError("Reimbursement amount is required", 422, "REIMBURSEMENT_AMOUNT_REQUIRED");
  }
  const reimbursementVnd = current.productReceiveOption === "PRODUCT_REQUIRED" ? Math.floor(purchaseAmountVnd) : 0;
  const reimbursementPoints = reimbursementVnd > 0 ? reimbursementVnd : 0;
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

    if (reimbursementPoints > 0) {
      await creditPointsOnce(tx, current.accountId, reimbursementPoints, "PRODUCT_REIMBURSEMENT", creatorMissionId, `creator_mission_reimbursement_${creatorMissionId}`);
    }
    const depositRefundTransaction = await refundCreatorDepositIfNeeded(tx, current);

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
        reimbursementStatus: current.productReceiveOption === "PRODUCT_REQUIRED" ? "PAID" : current.reimbursementStatus,
        depositStatus:
          current.campaign.fulfillmentMode === "BRAND_SHIP" &&
          current.campaign.creatorDepositRequired &&
          current.depositStatus !== "FORFEITED"
            ? "REFUNDED"
            : current.depositStatus,
        depositRefundedAt: depositRefundTransaction ? now() : current.depositRefundedAt
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_FINAL_SUBMISSION_APPROVED", "Final submission được duyệt", "Campaign của bạn đã được duyệt hoàn thành và hoàn N-Points mua sản phẩm.", { creatorMissionId, actorId });
  return mapMission(updated);
}

export async function approvePublishReportByBrand(actorId: string, creatorMissionId: string) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus === "APPROVED") return mapMission(current);
  if (current.publishStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  if (current.videoReviewStatus !== "APPROVED") throw new AppError("Video must be approved first", 409, "CREATOR_MISSION_VIDEO_NOT_APPROVED");

  if (current.productReceiveOption !== "PRODUCT_REQUIRED") {
    return approvePublishReportByAdmin(actorId, creatorMissionId, 0);
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
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        submissionStatus: "APPROVED",
        submissionLifecycleStatus: "APPROVED",
        submissionRejectReason: null,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        submissionApprovedAt: now(),
        publishStatus: "APPROVED",
        publishFeedback: null,
        publishReviewedAt: now(),
        reimbursementStatus: "PAYOUT_PENDING"
      },
      include: creatorMissionInclude
    });
  });

  await notifyCreator(
    updated.accountId,
    "CREATOR_FINAL_SUBMISSION_APPROVED",
    "Link public đã được Brand duyệt",
    "Bài public của bạn đã được Brand duyệt. Admin sẽ kiểm tra bill mua hàng và ảnh đánh giá 5 sao để xử lý hoàn N-Points.",
    { creatorMissionId, actorId }
  );
  return mapMission(updated);
}

export async function rejectPublishReportByAdmin(actorId: string, creatorMissionId: string, reason: string, requiredResubmitFields: FinalReviewResubmitField[]) {
  const current = await getMissionById(creatorMissionId);
  if (!current) throw new AppError("Creator mission/submission not found", 404, "MISSION_SUBMISSION_NOT_FOUND");
  if (current.publishStatus !== "PENDING") throw new AppError("Invalid status", 409, "CREATOR_MISSION_INVALID_STATUS");
  const feedback = reason.trim();
  if (!feedback) throw new AppError("reason is required", 422, "REJECT_REASON_REQUIRED");
  if (requiredResubmitFields.length < 1) throw new AppError("requiredResubmitFields is required", 422, "REQUIRED_RESUBMIT_FIELDS_REQUIRED");
  const serializedFeedback = serializeFinalReviewRejectFeedback(feedback, requiredResubmitFields);
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      rejectReason: serializedFeedback,
      reviewedById: actorId,
      reviewedAt: now()
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        status: "IN_PROGRESS",
        submissionRejectReason: serializedFeedback,
        submissionReviewedById: actorId,
        submissionReviewedAt: now(),
        publishStatus: "REJECTED",
        publishFeedback: serializedFeedback,
        publishReviewedAt: now()
      },
      include: creatorMissionInclude
    });
  });
  await notifyCreator(updated.accountId, "CREATOR_FINAL_SUBMISSION_REJECTED", "Final submission bị từ chối", feedback, { creatorMissionId, actorId });
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
      depositStatus: true,
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
      depositStatus: row.depositStatus,
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
  payload: { purchaseBillImageUrl?: string; productReviewScreenshotUrl?: string; purchaseProofNote?: string }
) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  if (current.productReceiveOption !== "PRODUCT_REQUIRED") throw new AppError("Invalid flow", 409, "CREATOR_MISSION_INVALID_FLOW");
  const updated = await prisma.$transaction(async (tx) => {
    await syncLegacySubmission(tx, current.missionId, current.accountId, current.submissionId, {
      purchaseProofNote: payload.purchaseProofNote ?? null,
      purchaseConfirmedAt: now()
    });
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
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

type TranscriptSubmissionInput =
  | { mode: "TEXT"; transcript: string }
  | { mode: "FILE"; fileUploadUrl: string }
  | { mode: "URL"; fileUploadUrl: string };

export async function submitCreatorMissionTranscript(accountId: string, creatorMissionId: string, payload: TranscriptSubmissionInput) {
  const current = await getMissionByIdForAccount(creatorMissionId, accountId);
  assertHeldCreatorDeposit(current);
  if (current.status === "COMPLETED") throw new AppError("Mission already completed", 409, "CREATOR_MISSION_ALREADY_COMPLETED");
  if (current.videoReviewStatus === "PENDING" || current.videoReviewStatus === "APPROVED") {
    throw new AppError("Video review already started", 409, "CREATOR_MISSION_VIDEO_ALREADY_STARTED");
  }
  if (current.productReceiveOption === "PRODUCT_REQUIRED" && current.productStatus !== "RECEIVED") {
    throw new AppError("Purchase proof is required before transcript submission", 409, "PURCHASE_PROOF_REQUIRED");
  }

  let transcriptHtml: string | null = null;
  let transcriptFileUrl: string | null = null;

  if (payload.mode === "TEXT") {
    const sanitizedHtml = normalizeTranscriptHtml(payload.transcript.trim());
    const plainText = transcriptHtmlToPlainText(sanitizedHtml);
    if (!plainText) throw new AppError("Transcript is required", 422, "TRANSCRIPT_REQUIRED");
    transcriptHtml = sanitizedHtml;
  } else {
    const fileUrl = payload.fileUploadUrl.trim();
    if (!fileUrl) throw new AppError("Transcript file or URL is required", 422, "TRANSCRIPT_FILE_REQUIRED");
    transcriptFileUrl = fileUrl;
  }

  const updated = await prisma.$transaction(async (tx) => {
    return tx.creatorMission.update({
      where: { id: creatorMissionId },
      data: {
        submissionTranscriptType: payload.mode,
        submissionTranscriptTextNote: transcriptHtml,
        submissionTranscriptResourceUrl: transcriptFileUrl,
        submissionProofTextNote: null,
        submissionFileUploadUrl: null,
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

  await notifyCreator(accountId, "CREATOR_PROOF_SUBMITTED", "Đã gửi kịch bản", "Kịch bản của bạn đã được gửi để Brand/Admin duyệt.", { creatorMissionId });
  await notifyBrandStaffForMissionReview(
    updated.campaign.brandId,
    "Creator submitted script",
    `A script was submitted for campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  await notifyAdminOpsForMissionReview(
    accountId,
    "Creator nộp kịch bản",
    `Creator vừa nộp kịch bản cho campaign "${updated.campaign.title}".`,
    { creatorMissionId, campaignId: updated.campaign.id }
  );
  return mapMission(updated);
}

export async function submitCreatorMissionPublish(
  accountId: string,
  creatorMissionId: string,
  payload: { publicVideoUrl?: string; socialPostUrl?: string; adCode?: string; screenshotUrl?: string; purchaseBillImageUrl?: string; productReviewScreenshotUrl?: string; finalProofNote?: string }
) {
  const url = payload.publicVideoUrl ?? payload.socialPostUrl;
  if (!url?.trim()) throw new AppError("publicVideoUrl or socialPostUrl is required", 422, "SOCIAL_POST_URL_REQUIRED");
  return submitPublishReport(creatorMissionId, accountId, {
    socialPostUrl: url.trim(),
    adCode: payload.adCode,
    screenshotUrl: payload.screenshotUrl,
    purchaseBillImageUrl: payload.purchaseBillImageUrl,
    productReviewScreenshotUrl: payload.productReviewScreenshotUrl,
    note: payload.finalProofNote
  });
}

export async function createMissionApplicationForCreator(accountId: string, payload: { missionId: string; note?: string }) {
  const CREATOR_MISSION_REAPPLY_LIMIT = 2;
  const profile = await prisma.creatorProfile.findUnique({ where: { accountId }, select: { id: true } });
  if (!profile) throw new AppError("Creator profile is required", 422, "CREATOR_PROFILE_REQUIRED");
  const activeChannels = await prisma.creatorSocialLink.findMany({
    where: { creatorProfileId: profile.id, isActive: true },
    select: { id: true, platform: true, socialUrl: true, followers: true, handle: true }
  });
  if (activeChannels.length < 1) {
    throw new AppError(
      "Bạn cần thêm ít nhất 1 kênh mạng xã hội đang sử dụng trước khi xin làm nhiệm vụ.",
      422,
      "CREATOR_SOCIAL_CHANNEL_REQUIRED"
    );
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

  let resubmissionCount = 0;
  if (existing?.applicationStatus === "REJECTED") {
    resubmissionCount = await prisma.auditLog.count({
      where: {
        targetType: "CreatorMission",
        targetId: existing.id,
        action: "CREATOR_MISSION_APPLICATION_RESUBMITTED"
      }
    });

    if (resubmissionCount >= CREATOR_MISSION_REAPPLY_LIMIT) {
      throw new AppError(
        "Bạn chỉ có thể đăng ký lại campaign này tối đa 2 lần.",
        409,
        "MISSION_APPLICATION_REAPPLY_LIMIT_REACHED"
      );
    }
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

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: existing ? "CREATOR_MISSION_APPLICATION_RESUBMITTED" : "CREATOR_MISSION_APPLICATION_SUBMITTED",
      targetType: "CreatorMission",
      targetId: created.id,
      metadata: {
        missionId: created.missionId,
        campaignId: created.campaignId,
        creatorSocialChannels: activeChannels,
        reapplyCount: existing ? resubmissionCount + 1 : 0,
        reapplyLimit: CREATOR_MISSION_REAPPLY_LIMIT
      }
    }
  });

  await trackDcreatorEvent({
    eventName: DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_SUBMITTED,
    accountId,
    campaignId: created.campaignId,
    creatorId: accountId,
    missionId: created.missionId,
    creatorMissionId: created.id,
    metadata: {
      source: "creator_dashboard",
      isReapply: Boolean(existing),
      reapplyCount: existing ? resubmissionCount + 1 : 0
    }
  });

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

function applyNotOverdueReviewFilter(where: Prisma.CreatorMissionWhereInput) {
  const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  where.AND = [
    ...existingAnd,
    {
      OR: [
        { missionId: null, campaign: { endsAt: null } },
        { missionId: null, campaign: { endsAt: { gte: now() } } },
        { mission: { deadlineAt: null } },
        { mission: { deadlineAt: { gte: now() } } }
      ]
    }
  ];
}

function buildApplicationMissionSummary(input: {
  mission: {
    id: string;
    title: string;
    description?: string | null;
    rewardPoints?: number | null;
    productReceiveOption?: ProductReceiveOption | null;
    productLink?: string | null;
    deadlineAt?: Date | null;
    productName?: string | null;
    productDescription?: string | null;
    productImageUrl?: string | null;
  } | null;
  campaign: {
    id: string;
    title: string;
    brief?: string | null;
    creatorBriefTitle?: string | null;
    creatorBriefDescription?: string | null;
    productName?: string | null;
    productDescription?: string | null;
    productImageUrl?: string | null;
    productLink?: string | null;
    endsAt?: Date | null;
  };
  productReceiveOption?: ProductReceiveOption;
}) {
  return {
    id: input.mission?.id ?? input.campaign.id,
    title: input.campaign.title,
    description: input.campaign.brief ?? input.mission?.description ?? "",
    rewardPoints: input.mission?.rewardPoints ?? 0,
    productReceiveOption: input.productReceiveOption ?? input.mission?.productReceiveOption ?? "PRODUCT_REQUIRED",
    productLink: input.campaign.productLink ?? input.mission?.productLink ?? null,
    deadlineAt: dt(input.campaign.endsAt ?? input.mission?.deadlineAt),
    productName: input.campaign.productName ?? input.mission?.productName ?? null,
    productDescription: input.campaign.productDescription ?? input.mission?.productDescription ?? null,
    productImageUrl: input.campaign.productImageUrl ?? input.mission?.productImageUrl ?? null
  };
}

function resolveBrandAvatar(input: { avatarUrl: string | null; ownedBrands: Array<{ logoUrl: string | null }> }) {
  const logoUrl = input.ownedBrands.map((item) => cleanDisplayUrl(item.logoUrl)).find(Boolean);
  if (logoUrl) return logoUrl;
  return cleanDisplayUrl(input.avatarUrl) || null;
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
  applyNotOverdueReviewFilter(where);
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
        depositStatus: true,
        account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } } } },
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            brief: true,
            creatorBriefTitle: true,
            creatorBriefDescription: true,
            productName: true,
            productDescription: true,
            productImageUrl: true,
            productLink: true,
            endsAt: true,
            fulfillmentMode: true,
            creatorDepositRequired: true,
            creatorDepositAmountVnd: true,
            brand: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                ownedBrands: {
                  select: { name: true, legalName: true, logoUrl: true },
                  orderBy: { updatedAt: "desc" },
                  take: 1
                }
              }
            }
          }
        },
        mission: {
          select: {
            id: true,
            title: true,
            description: true,
            rewardPoints: true,
            productReceiveOption: true,
            productLink: true,
            deadlineAt: true,
            productName: true,
            productDescription: true,
            productImageUrl: true
          }
        },
        productReceiveOption: true
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
    depositStatus: item.depositStatus,
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
        ownerDisplayName: item.campaign.brand.displayName,
        displayName: getBrandDisplayName({ brand: item.campaign.brand.ownedBrands[0] ?? null }),
        avatarUrl: resolveBrandAvatar(item.campaign.brand)
      }
    },
    mission: buildApplicationMissionSummary({
      mission: item.mission,
      campaign: item.campaign,
      productReceiveOption: item.productReceiveOption
    })
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
      productReceiveOption: true,
      depositStatus: true,
      account: { select: { id: true, displayName: true, email: true, creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true, bio: true, socialLinks: { where: { isActive: true }, select: { id: true, platform: true, socialUrl: true, followers: true, handle: true, isActive: true, status: true } } } } } },
      campaign: {
        select: {
          id: true,
          title: true,
          slug: true,
          brandId: true,
          creatorBriefTitle: true,
          creatorBriefDescription: true,
          productName: true,
          productDescription: true,
          productImageUrl: true,
          productLink: true,
          endsAt: true,
          fulfillmentMode: true,
          creatorDepositRequired: true,
          creatorDepositAmountVnd: true,
          brand: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              ownedBrands: {
                select: { name: true, legalName: true, logoUrl: true },
                orderBy: { updatedAt: "desc" },
                take: 1
              }
            }
          }
        }
      },
      mission: {
        select: {
          id: true,
          title: true,
          description: true,
          rewardPoints: true,
          productReceiveOption: true,
          productLink: true,
          deadlineAt: true,
          productName: true,
          productDescription: true,
          productImageUrl: true
        }
      }
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
    depositStatus: item.depositStatus,
    note: item.applicationNote,
    rejectReason: item.applicationRejectReason,
    reviewedById: item.applicationReviewedById,
    reviewedAt: item.applicationReviewedAt,
    createdAt: item.appliedAt,
    reviewedBy: item.applicationReviewedById ? { id: item.applicationReviewedById, displayName: "N/A", email: "N/A" } : null,
    account: item.account,
    mission: buildApplicationMissionSummary({
      mission: item.mission,
      campaign: item.campaign,
      productReceiveOption: item.productReceiveOption
    }),
    campaign: {
      ...item.campaign,
      brand: {
        ...item.campaign.brand,
        ownerDisplayName: item.campaign.brand.displayName,
        displayName: getBrandDisplayName({ brand: item.campaign.brand.ownedBrands[0] ?? null }),
        avatarUrl: resolveBrandAvatar(item.campaign.brand)
      }
    }
  };
}

export async function approveMissionApplicationByAdmin(actorId: string, id: string) {
  const current = await getMissionApplicationDetailForAdmin(id);
  if (current.status !== "PENDING_REVIEW") throw new AppError("Mission application is not pending review", 409, "MISSION_APPLICATION_INVALID_STATUS");
  const requiresCreatorDeposit =
    current.campaign.fulfillmentMode === "BRAND_SHIP" &&
    current.campaign.creatorDepositRequired;
  const approvedStatus = current.mission.productReceiveOption === "NO_PRODUCT_REQUIRED" ? "IN_PROGRESS" : "PRODUCT_PENDING";
  const approvedProductStatus =
    current.mission.productReceiveOption === "NO_PRODUCT_REQUIRED"
      ? "NOT_REQUIRED"
      : requiresCreatorDeposit
        ? "WAITING_DEPOSIT"
        : "WAITING_PURCHASE";
  const approvedDepositStatus = requiresCreatorDeposit ? "REQUIRED" : "NOT_REQUIRED";
  const approvedReimbursementStatus =
    current.mission.productReceiveOption === "PRODUCT_REQUIRED" &&
    current.campaign.fulfillmentMode === "CREATOR_ORDER"
      ? "PENDING"
      : "NOT_REQUIRED";
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
        status: approvedStatus,
        productStatus: approvedProductStatus,
        depositStatus: approvedDepositStatus,
        creatorDepositAmountVnd: requiresCreatorDeposit ? current.campaign.creatorDepositAmountVnd ?? 0 : 0,
        sampleShippingStatus: requiresCreatorDeposit ? "WAITING_DEPOSIT" : "NOT_REQUIRED",
        reimbursementStatus: approvedReimbursementStatus,
        startedAt: current.mission.productReceiveOption === "NO_PRODUCT_REQUIRED" ? now() : null,
        submissionLifecycleStatus: "ACCEPTED",
        submissionStatus: "OPEN",
        submissionNote: current.note ?? null
      },
      include: creatorMissionInclude
    });
    return mapMission(next);
  });
  await notifyCreator(current.accountId, "MISSION_APPLICATION_APPROVED", "Đơn tham gia campaign được duyệt", `Bạn đã được duyệt tham gia campaign "${current.campaign.title}".`, { creatorMissionId: id });
  await trackDcreatorEvent({
    eventName: DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_APPROVED,
    actorId,
    accountId: current.accountId,
    campaignId: current.campaignId,
    brandId: current.campaign.brand.id,
    creatorId: current.accountId,
    missionId: current.mission.id,
    creatorMissionId: id,
    metadata: { source: "creator_mission_service" }
  });
  await trackDcreatorEvent({
    eventName: DCREATOR_ANALYTICS_EVENTS.CREATOR_MISSION_ASSIGNED,
    actorId,
    accountId: current.accountId,
    campaignId: current.campaignId,
    brandId: current.campaign.brand.id,
    creatorId: current.accountId,
    missionId: current.mission.id,
    creatorMissionId: id,
    metadata: { source: "creator_mission_service", missionStatus: approvedStatus }
  });
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
  await notifyCreator(current.accountId, "MISSION_APPLICATION_REJECTED", "Đơn xin nhiệm vụ bị từ chối", reason, { creatorMissionId: id });
  await trackDcreatorEvent({
    eventName: DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_REJECTED,
    actorId,
    accountId: current.accountId,
    campaignId: current.campaignId,
    brandId: current.campaign.brand.id,
    creatorId: current.accountId,
    missionId: current.mission.id,
    creatorMissionId: id,
    metadata: { source: "creator_mission_service", rejectReason: reason }
  });
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
  applyNotOverdueReviewFilter(where);
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
  reimbursementStatus?: ReimbursementStatus;
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
  if (input.reimbursementStatus) where.reimbursementStatus = input.reimbursementStatus;
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  applyNotOverdueReviewFilter(where);
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

export async function rejectMissionFinalReviewByAdmin(actorId: string, id: string, input: { feedback: string; requiredResubmitFields: FinalReviewResubmitField[] }) {
  return rejectPublishReportByAdmin(actorId, id, input.feedback, input.requiredResubmitFields);
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
    applicationStatus: "APPROVED",
    OR: [
      { submissionTranscriptTextNote: { not: null } },
      { submissionTranscriptResourceUrl: { not: null } }
    ]
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
  applyNotOverdueReviewFilter(where);
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
  if (!item || (!item.submissionTranscriptTextNote && !item.submissionTranscriptResourceUrl)) {
    throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  }
  return mapMission(item);
}

export async function approveMissionTranscriptReviewByAdmin(actorId: string, id: string) {
  const current = await getMissionById(id);
  if (!current || (!current.submissionTranscriptTextNote && !current.submissionTranscriptResourceUrl)) {
    throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  }
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

  await notifyCreator(updated.accountId, "CREATOR_VIDEO_APPROVED", "Kịch bản được duyệt", "Bạn có thể tiếp tục nộp video review.", { creatorMissionId: id, actorId });
  return mapMission(updated);
}

export async function rejectMissionTranscriptReviewByAdmin(actorId: string, id: string, feedback: string) {
  const current = await getMissionById(id);
  if (!current || (!current.submissionTranscriptTextNote && !current.submissionTranscriptResourceUrl)) {
    throw new AppError("Creator mission transcript not found", 404, "CREATOR_MISSION_TRANSCRIPT_NOT_FOUND");
  }
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

  await notifyCreator(updated.accountId, "CREATOR_VIDEO_REJECTED", "Kịch bản bị từ chối", reason, { creatorMissionId: id, actorId });
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
  applyNotOverdueReviewFilter(where);

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
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            brief: true,
            creatorBriefTitle: true,
            creatorBriefDescription: true,
            productName: true,
            productDescription: true,
            productImageUrl: true,
            productLink: true,
            endsAt: true
          }
        },
        mission: {
          select: {
            id: true,
            title: true,
            description: true,
            rewardPoints: true,
            productReceiveOption: true,
            productLink: true,
            deadlineAt: true,
            productName: true,
            productDescription: true,
            productImageUrl: true
          }
        },
        productReceiveOption: true
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
      mission: buildApplicationMissionSummary({
        mission: item.mission,
        campaign: item.campaign,
        productReceiveOption: item.productReceiveOption
      })
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
  applyNotOverdueReviewFilter(where);
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
    applicationStatus: "APPROVED",
    campaign: { brandId: brandOwnerAccountId },
    OR: [
      { submissionTranscriptTextNote: { not: null } },
      { submissionTranscriptResourceUrl: { not: null } }
    ]
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
  applyNotOverdueReviewFilter(where);
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
    reimbursementStatus?: ReimbursementStatus;
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
  if (input.reimbursementStatus) where.reimbursementStatus = input.reimbursementStatus;
  if (input.query?.trim()) {
    const q = input.query.trim();
    where.OR = [
      { account: { displayName: { contains: q, mode: "insensitive" } } },
      { account: { email: { contains: q, mode: "insensitive" } } },
      { mission: { title: { contains: q, mode: "insensitive" } } },
      { campaign: { title: { contains: q, mode: "insensitive" } } }
    ];
  }
  applyNotOverdueReviewFilter(where);
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
  void input;
  return approvePublishReportByBrand(accountId, id);
}

export async function rejectMissionFinalReviewByBrand(accountId: string, id: string, input: { feedback: string; requiredResubmitFields: FinalReviewResubmitField[] }) {
  await getMissionFinalReviewDetailForBrand(accountId, id);
  return rejectMissionFinalReviewByAdmin(accountId, id, input);
}
