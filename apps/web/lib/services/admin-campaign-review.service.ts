import { CampaignStatus, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getBrandDisplayName } from "@/lib/display-identity";
import { AppError } from "@/lib/errors";
import { normalizeRequiredHashtags } from "@/lib/hashtags";
import { normalizeImageUrlInput } from "@/lib/images/resolve-image-url";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification } from "@/lib/services/notification.service";
import { assertStateTransition } from "@/lib/services/admin-transition.service";
import type { z } from "zod";
import type { adminCampaignCreateSchema } from "@/lib/validators/admin-campaign";
import type { adminCampaignUpdateSchema } from "@/lib/validators/admin-campaign";
import type { campaignMissionCreateSchema } from "@/lib/validators/brand-dashboard";

type AdminDecision = "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "PAUSE";
type AdminCampaignCreateInput = z.infer<typeof adminCampaignCreateSchema>;
type AdminCampaignUpdateInput = z.infer<typeof adminCampaignUpdateSchema>;
type CampaignMissionInput = z.infer<typeof campaignMissionCreateSchema>;

async function trySyncCampaignNewFields(campaignId: string, benefits: string | null, participationRoadmap: string[], requiredHashtags?: string[]) {
  try {
    await prisma.$executeRaw`
      UPDATE "Campaign"
      SET
        "benefits" = ${benefits},
        "participationRoadmap" = ${participationRoadmap},
        "requiredHashtags" = ${requiredHashtags ?? []}
      WHERE "id" = ${campaignId}
    `;
  } catch {
    // Backward compatibility when DB has not applied migration yet.
  }
}

async function getCampaignRequiredHashtags(campaignId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ requiredHashtags: string[] }>>`
      SELECT "requiredHashtags" FROM "Campaign" WHERE "id" = ${campaignId} LIMIT 1
    `;
    return rows[0]?.requiredHashtags ?? [];
  } catch {
    return [];
  }
}

async function trySyncCampaignRequiredHashtags(campaignId: string, requiredHashtags: string[]) {
  try {
    await prisma.$executeRaw`
      UPDATE "Campaign"
      SET "requiredHashtags" = ${requiredHashtags}
      WHERE "id" = ${campaignId}
    `;
  } catch {
    throw new AppError(
      "Hệ thống chưa cập nhật migration hashtag bắt buộc. Vui lòng chạy migration trước khi lưu thay đổi.",
      500,
      "CAMPAIGN_REQUIRED_HASHTAGS_MIGRATION_REQUIRED"
    );
  }
}

async function syncCampaignUgcVideoQuota(campaignId: string, ugcVideoQuota: number) {
  try {
    await prisma.$executeRaw`
      UPDATE "Campaign"
      SET "ugcVideoQuota" = ${ugcVideoQuota}
      WHERE "id" = ${campaignId}
    `;
  } catch {
    throw new AppError(
      "Hệ thống chưa cập nhật migration quota video UGC. Vui lòng chạy migration trước khi tạo campaign.",
      500,
      "CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED"
    );
  }
}

function sanitizeCampaignImageUrl(input?: string | null) {
  const value = normalizeImageUrlInput(input);
  return value || null;
}

const campaignTransitionMap: Record<AdminDecision, readonly CampaignStatus[]> = {
  APPROVE: ["DRAFT", "PAUSED"],
  REJECT: ["DRAFT", "PAUSED"],
  REQUEST_CHANGES: ["DRAFT", "PAUSED", "ACTIVE"],
  PAUSE: ["ACTIVE"]
};

function isPendingReview(campaign: { status: CampaignStatus; reviewTag?: string | null }) {
  return campaign.status === "PAUSED" && campaign.reviewTag === "SUBMITTED_FOR_REVIEW";
}

function normalizeStatusView(campaign: { status: CampaignStatus; reviewTag?: string | null }) {
  if (campaign.status === "ARCHIVED") return "REJECTED";
  if (isPendingReview(campaign)) return "PENDING_REVIEW";
  if (campaign.status === "DRAFT") return "DRAFT";
  if (campaign.status === "PAUSED") return "PAUSED";
  if (campaign.status === "ACTIVE") return "ACTIVE";
  if (campaign.status === "COMPLETED") return "COMPLETED";
  return campaign.status;
}

async function getCampaignReviewTag(campaignIds: string[]) {
  const logs = await prisma.auditLog.findMany({
    where: {
      targetType: "Campaign",
      targetId: { in: campaignIds },
      action: { in: ["CAMPAIGN_SUBMITTED_FOR_REVIEW", "CAMPAIGN_PAUSED_BY_ADMIN"] }
    },
    orderBy: { createdAt: "desc" }
  });

  const map = new Map<string, string>();
  for (const log of logs) {
    if (map.has(log.targetId)) continue;
    map.set(log.targetId, log.action === "CAMPAIGN_SUBMITTED_FOR_REVIEW" ? "SUBMITTED_FOR_REVIEW" : "PAUSED_BY_ADMIN");
  }
  return map;
}

export async function listCampaignsForAdmin(input: { status?: CampaignStatus; query?: string }) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.query
        ? {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { brief: { contains: input.query, mode: "insensitive" } },
              { brand: { displayName: { contains: input.query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      brief: true,
      status: true,
      budgetVnd: true,
      targetAmountVnd: true,
      fundedAmountVnd: true,
      backerCount: true,
      startsAt: true,
      endsAt: true,
      updatedAt: true,
      brand: { select: { id: true, displayName: true, email: true } },
      creator: { select: { id: true, displayName: true, email: true } },
      rewards: { select: { id: true, stockTotal: true, stockRemaining: true, pointsCost: true } },
      missions: { select: { id: true, audience: true, title: true } }
    }
  });

  const brandOwnerAccountIds = [...new Set(campaigns.map((campaign) => campaign.brand.id))];
  const brandProfiles = brandOwnerAccountIds.length
    ? await prisma.brand.findMany({
        where: { ownerAccountId: { in: brandOwnerAccountIds } },
        orderBy: { updatedAt: "desc" },
        select: { ownerAccountId: true, name: true, legalName: true, logoUrl: true }
      })
    : [];
  const brandProfileByOwnerAccountId = new Map<string, (typeof brandProfiles)[number]>();
  for (const brand of brandProfiles) {
    if (!brandProfileByOwnerAccountId.has(brand.ownerAccountId)) {
      brandProfileByOwnerAccountId.set(brand.ownerAccountId, brand);
    }
  }

  const tagMap = await getCampaignReviewTag(campaigns.map((c) => c.id));
  const normalized = campaigns.map((campaign) => ({
    ...campaign,
    brand: {
      ...campaign.brand,
      ownerDisplayName: campaign.brand.displayName,
      displayName: getBrandDisplayName({ brand: brandProfileByOwnerAccountId.get(campaign.brand.id) ?? null })
    },
    statusView: normalizeStatusView({ status: campaign.status, reviewTag: tagMap.get(campaign.id) ?? null })
  }));

  if (!input.status) return normalized;

  const requested = input.status;
  if (requested === "PAUSED") {
    return normalized.filter((item) => item.statusView === "PAUSED");
  }
  if (requested === "DRAFT") {
    return normalized.filter((item) => item.statusView === "DRAFT");
  }
  return normalized.filter((item) => item.status === requested);
}

export async function getCampaignDetailForAdmin(campaignId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      brandId: true,
      slug: true,
      title: true,
      brief: true,
      coverImageUrl: true,
      campaignType: true,
      setupSource: true,
      fulfillmentMode: true,
      creatorDepositRequired: true,
      benefits: true,
      requirementsSummary: true,
      creatorBriefDescription: true,
      productName: true,
      productDescription: true,
      productImageUrl: true,
      productLink: true,
      participationRoadmap: true,
      objective: true,
      category: true,
      ugcVideoQuota: true,
      isPublic: true,
      status: true,
      startsAt: true,
      endsAt: true,
      budgetVnd: true,
      targetAmountVnd: true,
      fundedAmountVnd: true,
      backerCount: true,
      brand: { select: { id: true, displayName: true, email: true } },
      creator: { select: { id: true, displayName: true, email: true } },
      sourceBrandRequests: {
        select: {
          id: true,
          title: true,
          brief: true,
          requestedSlug: true,
          status: true,
          budgetVnd: true,
          targetAmountVnd: true,
          adminNote: true,
          brandFeedback: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: "desc" }
      },
      rewards: true,
      contributions: { select: { id: true, amountVnd: true, status: true } }
    }
  });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  const requiredHashtags = await getCampaignRequiredHashtags(campaign.id);

  const brandProfile = await prisma.brand.findFirst({
    where: { ownerAccountId: campaign.brandId },
    select: {
      id: true,
      name: true,
      legalName: true,
      logoUrl: true,
      contactName: true,
      status: true,
      commissionRatePercent: true,
      revenueSharePercent: true
    }
  });

  const productSubmissions = await prismaAny.productSubmission.findMany({
    where: { campaignId: campaign.id },
    include: { inventoryBatches: true }
  });

  const latestReviewLog = await prisma.auditLog.findFirst({
    where: {
      targetType: "Campaign",
      targetId: campaign.id,
      action: { in: ["CAMPAIGN_SUBMITTED_FOR_REVIEW", "CAMPAIGN_PAUSED_BY_ADMIN"] }
    },
    orderBy: { createdAt: "desc" }
  });

  const statusView = normalizeStatusView({
    status: campaign.status,
    reviewTag: latestReviewLog?.action === "CAMPAIGN_SUBMITTED_FOR_REVIEW" ? "SUBMITTED_FOR_REVIEW" : latestReviewLog ? "PAUSED_BY_ADMIN" : null
  });

  return {
    ...campaign,
    brand: {
      ...campaign.brand,
      ownerDisplayName: campaign.brand.displayName,
      displayName: getBrandDisplayName({ brand: brandProfile })
    },
    requirementsSummary: campaign.requirementsSummary ?? null,
    requirements: campaign.creatorBriefDescription ?? null,
    requiredHashtags,
    statusView,
    brandProfile,
    productSubmissions,
    kpiSnapshot: {
      targetAmountVnd: campaign.targetAmountVnd,
      fundedAmountVnd: campaign.fundedAmountVnd,
      backerCount: campaign.backerCount,
      contributionCount: campaign.contributions.length
    },
    commission: {
      commissionRatePercent: brandProfile?.commissionRatePercent ?? null,
      revenueSharePercent: brandProfile?.revenueSharePercent ?? null
    },
    quota: { creator: 0, user: 0 }
  };
}

function validateCampaignReadiness(detail: Awaited<ReturnType<typeof getCampaignDetailForAdmin>>) {
  const errors: string[] = [];
  if (!detail.brandProfile || detail.brandProfile.status !== "ACTIVE") {
    errors.push("Brand chưa được duyệt hoặc chưa active.");
  }
  if (!detail.productSubmissions.length) {
    errors.push("Campaign chưa gắn sản phẩm/lô hàng.");
  }
  if (detail.productSubmissions.some((item: { reviewStatus: string }) => item.reviewStatus !== "APPROVED")) {
    errors.push("Có sản phẩm/lô hàng chưa được duyệt.");
  }
  if (!detail.startsAt || !detail.endsAt || detail.startsAt >= detail.endsAt) {
    errors.push("Timeline không hợp lệ.");
  }
  if (!detail.rewards.length) {
    errors.push("Campaign chưa có reward.");
  }
  if (detail.commission.commissionRatePercent === null || detail.commission.commissionRatePercent < 0 || detail.commission.commissionRatePercent > 100) {
    errors.push("Commission không hợp lệ.");
  }
  if (!detail.budgetVnd || detail.budgetVnd <= 0) {
    errors.push("Budget campaign không hợp lệ.");
  }
  if (!detail.productName?.trim() || !detail.productDescription?.trim() || !detail.productLink?.trim() || !detail.productImageUrl?.trim()) {
    errors.push("Campaign chưa có đủ thông tin sản phẩm.");
  }
  return errors;
}

export async function decideCampaignByAdmin(input: {
  actorId: string;
  campaignId: string;
  decision: AdminDecision;
  reason?: string;
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    include: { brand: { select: { id: true, displayName: true, email: true } }, creator: { select: { id: true } } }
  });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  assertStateTransition(campaign.status, input.decision, campaignTransitionMap, { message: "Invalid campaign status transition" });
  if ((input.decision === "REJECT" || input.decision === "REQUEST_CHANGES" || input.decision === "PAUSE") && !input.reason?.trim()) {
    throw new AppError("reason is required", 422, "REASON_REQUIRED");
  }

  if (input.decision === "APPROVE") {
    const detail = await getCampaignDetailForAdmin(campaign.id);
    const readinessErrors = validateCampaignReadiness(detail);
    if (readinessErrors.length > 0) {
      throw new AppError(`Campaign is not ready: ${readinessErrors.join(" | ")}`, 422, "CAMPAIGN_NOT_READY");
    }
  }

  const nextStatus: CampaignStatus =
    input.decision === "APPROVE"
      ? "ACTIVE"
      : input.decision === "REJECT"
        ? "ARCHIVED"
        : input.decision === "REQUEST_CHANGES"
          ? "DRAFT"
          : "PAUSED";

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: nextStatus }
  });

  const action =
    input.decision === "APPROVE"
      ? "CAMPAIGN_REVIEW_APPROVED"
      : input.decision === "REJECT"
        ? "CAMPAIGN_REVIEW_REJECTED"
        : input.decision === "REQUEST_CHANGES"
          ? "CAMPAIGN_REVIEW_CHANGES_REQUESTED"
          : "CAMPAIGN_PAUSED_BY_ADMIN";

  await writeAuditLog({
    actorId: input.actorId,
    action,
    targetType: "Campaign",
    targetId: campaign.id,
    oldStatus: campaign.status,
    newStatus: nextStatus,
    reason: input.reason ?? null,
    metadata: {
      reason: input.reason ?? null
    }
  });

  await createNotification({
    accountId: campaign.brandId,
    event: input.decision === "APPROVE" ? NotificationEvent.CAMPAIGN_APPROVED : NotificationEvent.CAMPAIGN_REJECTED,
    title: input.decision === "APPROVE" ? "Campaign đã được publish" : "Campaign cần xử lý",
    content:
      input.decision === "APPROVE"
        ? `Campaign "${campaign.title}" đã được kích hoạt.`
        : `Campaign "${campaign.title}" cần xử lý: ${input.reason ?? "Vui lòng kiểm tra lại."}`,
    metadata: { campaignId: campaign.id, decision: input.decision }
  });

  if (campaign.creatorId) {
    await createNotification({
      accountId: campaign.creatorId,
      event: input.decision === "APPROVE" ? NotificationEvent.CAMPAIGN_APPROVED : NotificationEvent.CAMPAIGN_REJECTED,
      title: input.decision === "APPROVE" ? "Campaign đã active" : "Campaign cập nhật trạng thái",
      content: `Campaign "${campaign.title}" hiện tại: ${nextStatus}.`,
      metadata: { campaignId: campaign.id, decision: input.decision }
    });
  }

  return updated;
}

export async function createCampaignByAdmin(actorId: string, input: AdminCampaignCreateInput) {
  const brandAccount = await prisma.account.findUnique({
    where: { id: input.brandAccountId },
    select: { id: true, displayName: true, email: true, isActive: true }
  });
  if (!brandAccount) throw new AppError("Brand account not found", 404, "BRAND_ACCOUNT_NOT_FOUND");
  if (!brandAccount.isActive) throw new AppError("Brand account is inactive", 409, "BRAND_ACCOUNT_INACTIVE");

  const ownedBrand = await prisma.brand.findFirst({
    where: { ownerAccountId: brandAccount.id },
    select: { id: true },
    orderBy: { createdAt: "desc" }
  });

  const memberBrand = ownedBrand
    ? null
    : await prisma.brandMember.findFirst({
        where: { accountId: brandAccount.id },
        include: { brand: { select: { id: true } } },
        orderBy: { createdAt: "desc" }
      });

  const brandProfile = ownedBrand ?? memberBrand?.brand ?? null;
  if (!brandProfile) {
    throw new AppError("Brand chua hoan tat onboarding", 409, "BRAND_PROFILE_NOT_FOUND");
  }

  const ugcVideoQuota = input.ugcVideoQuota;

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const requiredHashtags = normalizeRequiredHashtags(input.requiredHashtags);
  const campaign = await prisma.$transaction(async (tx) => {
    const linkedRequest = input.requestId
      ? await tx.brandCampaignRequest.findFirst({
          where: {
            id: input.requestId,
            brandId: brandProfile.id,
            createdCampaignId: null,
            status: { in: ["PENDING_REVIEW", "NEEDS_REVISION"] }
          },
          select: { id: true }
        })
      : null;

    if (input.requestId && !linkedRequest) {
      throw new AppError("Campaign request not found or cannot be linked", 404, "CAMPAIGN_REQUEST_NOT_FOUND");
    }

    const createdCampaign = await tx.campaign.create({
      data: {
        brandId: brandAccount.id,
        slug: input.slug,
        title: input.title,
        brief: input.brief ?? "",
        budgetVnd: 10000000,
        targetAmountVnd: 10000000,
        category: input.category,
        campaignType: input.campaignType,
        setupSource: input.setupSource,
        fulfillmentMode: input.fulfillmentMode,
        creatorDepositRequired: input.fulfillmentMode === "BRAND_SHIP",
        objective: input.benefits || null,
        benefits: input.benefits || null,
        requirementsSummary: input.requirementsSummary?.trim() || null,
        creatorBriefTitle: "YÊU CẦU",
        creatorBriefDescription: input.requirements || null,
        productName: input.productName,
        productDescription: input.productDescription,
        productImageUrl: input.productImageUrl,
        productLink: input.productLink,
        participationRoadmap: input.participationRoadmap ?? [],
        priorityChannels: input.participationRoadmap?.join("\n") || null,
        missionTypes: null,
        creatorCommissionPercent: 0,
        userCommissionPercent: 0,
        bonusBudgetVnd: 0,
        coverImageUrl: sanitizeCampaignImageUrl(input.imageUrl),
        startsAt,
        endsAt,
        feasibilityStatus: "APPROVED",
        brandApprovalStatus: "APPROVED",
        status: "ACTIVE"
      }
    });

    if (linkedRequest) {
      await tx.brandCampaignRequest.update({
        where: { id: linkedRequest.id },
        data: {
          status: "APPROVED",
          reviewedById: actorId,
          reviewedAt: new Date(),
          createdCampaignId: createdCampaign.id
        }
      });
    } else {
      await tx.brandCampaignRequest.updateMany({
        where: {
          brandId: brandProfile.id,
          requestedSlug: input.slug,
          createdCampaignId: null,
          status: { in: ["PENDING_REVIEW", "NEEDS_REVISION"] }
        },
        data: {
          status: "APPROVED",
          reviewedById: actorId,
          reviewedAt: new Date(),
          createdCampaignId: createdCampaign.id
        }
      });
    }

    return createdCampaign;
  });
  await trySyncCampaignNewFields(campaign.id, input.benefits || null, input.participationRoadmap ?? [], requiredHashtags);
  await syncCampaignUgcVideoQuota(campaign.id, ugcVideoQuota);

  await writeAuditLog({
    actorId,
    action: "ADMIN_CAMPAIGN_CREATED",
    targetType: "Campaign",
    targetId: campaign.id,
    newStatus: campaign.status,
    metadata: {
      publishNow: true,
      brandAccountId: brandAccount.id,
      ugcVideoQuota,
      requiredHashtags,
      fulfillmentMode: input.fulfillmentMode,
      creatorDepositRequired: input.fulfillmentMode === "BRAND_SHIP"
    }
  });

  await createNotification({
    accountId: brandAccount.id,
    event: NotificationEvent.CAMPAIGN_APPROVED,
    title: "Admin đã tạo và kích hoạt chiến dịch",
    content: `Chiến dịch "${campaign.title}" đã được tạo và active.`,
    metadata: { campaignId: campaign.id }
  });

  return campaign;
}

export async function addCampaignMissionByAdmin(actorId: string, campaignId: string, input: CampaignMissionInput) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  const missionCount = await prisma.mission.count({ where: { campaignId: campaign.id } });
  if (missionCount > 0) {
    throw new AppError("Mỗi campaign chỉ được phép có 1 mission.", 409, "CAMPAIGN_MISSION_LIMIT_REACHED");
  }

  const deadlineAt = input.deadlineAt ? new Date(input.deadlineAt) : null;
  if (deadlineAt && campaign.startsAt && deadlineAt < campaign.startsAt) {
    throw new AppError("Mission deadline cannot be earlier than campaign start", 422, "MISSION_DEADLINE_INVALID");
  }
  if (deadlineAt && campaign.endsAt && deadlineAt > campaign.endsAt) {
    throw new AppError("Mission deadline cannot be later than campaign end", 422, "MISSION_DEADLINE_INVALID");
  }

  const mission = await prisma.mission.create({
    data: {
      campaignId: campaign.id,
      title: input.title,
      description: input.description,
      productName: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productName || null : null,
      productDescription: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productDescription || null : null,
      productImageUrl: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productImageUrl || null : null,
      productLink: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productLink || null : null,
      rewardPoints: input.rewardPoints,
      rewardCommissionVnd: input.rewardCommissionVnd,
      audience: input.audience,
      productReceiveOption: input.productReceiveOption,
      allowRepeat: input.allowRepeat,
      deadlineAt
    }
  });

  await writeAuditLog({
    actorId,
    action: "ADMIN_CAMPAIGN_MISSION_CREATED",
    targetType: "Mission",
    targetId: mission.id,
    metadata: { campaignId: campaign.id, audience: mission.audience }
  });

  return mission;
}

export async function updateCampaignByAdmin(actorId: string, campaignId: string, input: AdminCampaignUpdateInput) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  const beforeRequiredHashtags = await getCampaignRequiredHashtags(campaignId);

  const nextStartsAt = input.startsAt === undefined ? undefined : input.startsAt ? new Date(input.startsAt) : null;
  const nextEndsAt = input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null;
  const startsAtForValidate = nextStartsAt === undefined ? campaign.startsAt : nextStartsAt;
  const endsAtForValidate = nextEndsAt === undefined ? campaign.endsAt : nextEndsAt;
  if (startsAtForValidate && endsAtForValidate && endsAtForValidate <= startsAtForValidate) {
    throw new AppError("Ngày kết thúc phải sau ngày bắt đầu.", 422, "CAMPAIGN_TIMELINE_INVALID");
  }
  const nextSlug = input.slug?.trim();
  if (nextSlug && nextSlug !== campaign.slug) {
    const slugConflict = await prisma.campaign.findFirst({
      where: { slug: nextSlug, NOT: { id: campaignId } },
      select: { id: true }
    });
    if (slugConflict) {
      throw new AppError("Slug campaign đã tồn tại.", 409, "CAMPAIGN_SLUG_ALREADY_EXISTS");
    }
  }

  const nextImageUrl =
    input.imageUrl === undefined
      ? undefined
      : sanitizeCampaignImageUrl(input.imageUrl);
  
  const nextRoadmap = input.participationRoadmap ? input.participationRoadmap.map((step) => step.trim()).filter(Boolean) : undefined;
  const nextBenefits = input.benefits === undefined ? undefined : input.benefits?.trim() || null;
  const nextRequirementsSummary = input.requirementsSummary === undefined ? undefined : input.requirementsSummary?.trim() || null;
  const nextRequirements = input.requirements === undefined ? undefined : input.requirements?.trim() || null;
  const nextRequiredHashtags = input.requiredHashtags === undefined ? undefined : normalizeRequiredHashtags(input.requiredHashtags);

  const updated = await prisma.$transaction(async (tx) => {
    const nextCampaign = await tx.campaign.update({
      where: { id: campaignId },
      data: {
        slug: input.slug?.trim(),
        title: input.title?.trim(),
        brief: input.brief === undefined ? undefined : input.brief?.trim() || "",
        category: input.category,
        campaignType: input.campaignType,
        setupSource: input.setupSource,
        fulfillmentMode: input.fulfillmentMode,
        creatorDepositRequired:
          input.fulfillmentMode === undefined ? undefined : input.fulfillmentMode === "BRAND_SHIP",
        benefits: nextBenefits,
        requirementsSummary: nextRequirementsSummary,
        creatorBriefTitle: nextRequirements === undefined ? undefined : nextRequirements ? "YÊU CẦU" : null,
        creatorBriefDescription: nextRequirements,
        productName: input.productName?.trim(),
        productDescription: input.productDescription?.trim(),
        productImageUrl: input.productImageUrl?.trim(),
        productLink: input.productLink?.trim(),
        objective: nextBenefits,
        participationRoadmap: nextRoadmap,
        priorityChannels: nextRoadmap ? nextRoadmap.join("\n") : undefined,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        budgetVnd: input.budgetVnd,
        targetAmountVnd: input.targetAmountVnd,
        ugcVideoQuota: input.ugcVideoQuota,
        coverImageUrl: nextImageUrl
      }
    });

    return nextCampaign;
  });
  if (nextRequiredHashtags !== undefined) {
    await trySyncCampaignRequiredHashtags(campaignId, nextRequiredHashtags);
  }
  const afterRequiredHashtags = nextRequiredHashtags ?? beforeRequiredHashtags;

  await writeAuditLog({
    actorId,
    action: "ADMIN_CAMPAIGN_UPDATED",
    targetType: "Campaign",
    targetId: campaignId,
    oldStatus: campaign.status,
    newStatus: updated.status,
    reason: input.reason ?? null,
    metadata: {
      before: {
        slug: campaign.slug,
        title: campaign.title,
        brief: campaign.brief,
        category: campaign.category,
        campaignType: campaign.campaignType,
        setupSource: campaign.setupSource,
        fulfillmentMode: campaign.fulfillmentMode,
        creatorDepositRequired: campaign.creatorDepositRequired,
        participationRoadmap: campaign.participationRoadmap,
        requiredHashtags: beforeRequiredHashtags,
        benefits: campaign.benefits ?? null,
        requirementsSummary: campaign.requirementsSummary ?? null,
        requirements: campaign.creatorBriefDescription ?? null,
        productName: campaign.productName ?? null,
        productDescription: campaign.productDescription ?? null,
        productImageUrl: campaign.productImageUrl ?? null,
        productLink: campaign.productLink ?? null,
        objective: campaign.objective ?? null,
        startsAt: campaign.startsAt?.toISOString() ?? null,
        endsAt: campaign.endsAt?.toISOString() ?? null,
        budgetVnd: campaign.budgetVnd,
        targetAmountVnd: campaign.targetAmountVnd,
        ugcVideoQuota: campaign.ugcVideoQuota ?? null,
        isPublic: campaign.isPublic,
        coverImageUrl: campaign.coverImageUrl ?? null
      },
      after: {
        slug: updated.slug,
        title: updated.title,
        brief: updated.brief,
        category: updated.category,
        campaignType: updated.campaignType,
        setupSource: updated.setupSource,
        fulfillmentMode: updated.fulfillmentMode,
        creatorDepositRequired: updated.creatorDepositRequired,
        participationRoadmap: updated.participationRoadmap,
        requiredHashtags: afterRequiredHashtags,
        benefits: updated.benefits ?? null,
        requirementsSummary: updated.requirementsSummary ?? null,
        requirements: updated.creatorBriefDescription ?? null,
        productName: updated.productName ?? null,
        productDescription: updated.productDescription ?? null,
        productImageUrl: updated.productImageUrl ?? null,
        productLink: updated.productLink ?? null,
        objective: updated.objective ?? null,
        startsAt: updated.startsAt?.toISOString() ?? null,
        endsAt: updated.endsAt?.toISOString() ?? null,
        budgetVnd: updated.budgetVnd,
        targetAmountVnd: updated.targetAmountVnd,
        ugcVideoQuota: updated.ugcVideoQuota ?? null,
        isPublic: updated.isPublic,
        coverImageUrl: updated.coverImageUrl ?? null
      }
    }
  });

  return { ...updated, requirementsSummary: updated.requirementsSummary ?? null, requirements: updated.creatorBriefDescription ?? null, requiredHashtags: afterRequiredHashtags };
}

export async function deleteCampaignCascadeByAdmin(actorId: string, campaignId: string, reason: string) {
  const normalizedCampaignId = campaignId.trim();
  if (!normalizedCampaignId) throw new AppError("Campaign id is required", 422, "CAMPAIGN_ID_REQUIRED");

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: normalizedCampaignId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        brandId: true,
        creatorId: true
      }
    });
    if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

    const missions = await tx.mission.findMany({
      where: { campaignId: campaign.id },
      select: { id: true }
    });
    const missionIds = missions.map((mission) => mission.id);

    const rewards = await tx.reward.findMany({
      where: { campaignId: campaign.id },
      select: { id: true }
    });
    const rewardIds = rewards.map((reward) => reward.id);

    const contributions = await tx.contribution.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, paymentTransactionId: true }
    });
    const contributionIds = contributions.map((contribution) => contribution.id);
    const paymentTransactionIds = contributions
      .map((contribution) => contribution.paymentTransactionId)
      .filter((id): id is string => Boolean(id));

    const submissions = missionIds.length
      ? await tx.missionSubmission.findMany({
          where: { missionId: { in: missionIds } },
          select: { id: true }
        })
      : [];
    const submissionIds = submissions.map((submission) => submission.id);

    const deletionCounts: Record<string, number> = {};

    const track = (key: string, count: number) => {
      deletionCounts[key] = count;
    };

    if (submissionIds.length || missionIds.length) {
      const deleted = await tx.proofReview.deleteMany({
        where: {
          OR: [
            ...(submissionIds.length ? [{ submissionId: { in: submissionIds } }] : []),
            ...(missionIds.length ? [{ missionId: { in: missionIds } }] : [])
          ]
        }
      });
      track("proofReviews", deleted.count);
    } else {
      track("proofReviews", 0);
    }

    const creatorMissions = await tx.creatorMission.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("creatorMissions", creatorMissions.count);

    const missionSubmissions = missionIds.length
      ? await tx.missionSubmission.deleteMany({
          where: { missionId: { in: missionIds } }
        })
      : { count: 0 };
    track("missionSubmissions", missionSubmissions.count);

    const missionApplications = await tx.missionApplication.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("missionApplications", missionApplications.count);

    const rewardClaims = rewardIds.length || contributionIds.length
      ? await tx.rewardClaim.deleteMany({
          where: {
            OR: [
              ...(rewardIds.length ? [{ rewardId: { in: rewardIds } }] : []),
              ...(contributionIds.length ? [{ contributionId: { in: contributionIds } }] : [])
            ]
          }
        })
      : { count: 0 };
    track("rewardClaims", rewardClaims.count);

    const contributionsDeleted = await tx.contribution.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("contributions", contributionsDeleted.count);

    const rewardsDeleted = await tx.reward.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("rewards", rewardsDeleted.count);

    const missionsDeleted = await tx.mission.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("missions", missionsDeleted.count);

    const paymentOrders = await tx.paymentOrder.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("paymentOrders", paymentOrders.count);

    const analyticsDaily = await tx.analyticsDaily.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("analyticsDaily", analyticsDaily.count);

    const analyticsEvents = await tx.analyticsEvent.deleteMany({
      where: { campaignId: campaign.id }
    });
    track("analyticsEvents", analyticsEvents.count);

    const brandCampaignRequests = await tx.brandCampaignRequest.updateMany({
      where: { createdCampaignId: campaign.id },
      data: { createdCampaignId: null }
    });
    track("brandCampaignRequestsDetached", brandCampaignRequests.count);

    const productSubmissions = await tx.productSubmission.updateMany({
      where: { campaignId: campaign.id },
      data: { campaignId: null }
    });
    track("productSubmissionsDetached", productSubmissions.count);

    const fulfillmentOrders = await tx.fulfillmentOrder.updateMany({
      where: { campaignId: campaign.id },
      data: { campaignId: null }
    });
    track("fulfillmentOrdersDetached", fulfillmentOrders.count);

    await tx.auditLog.create({
      data: {
        actorId,
        action: "ADMIN_CAMPAIGN_HARD_DELETED",
        targetType: "Campaign",
        targetId: campaign.id,
        oldStatus: campaign.status,
        reason,
        metadata: {
          campaign: {
            id: campaign.id,
            slug: campaign.slug,
            title: campaign.title,
            brandId: campaign.brandId,
            creatorId: campaign.creatorId ?? null
          },
          deletionCounts,
          preservedFinancialReferences: {
            paymentTransactionIds,
            walletTransactions: "preserved"
          }
        }
      }
    });

    await tx.campaign.delete({
      where: { id: campaign.id }
    });

    return {
      id: campaign.id,
      title: campaign.title,
      message: "Đã xóa campaign và dữ liệu liên quan.",
      deletionCounts
    };
  });

  return result;
}

export async function listCampaignMissionsByAdmin(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  return prisma.mission.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" }
  });
}
