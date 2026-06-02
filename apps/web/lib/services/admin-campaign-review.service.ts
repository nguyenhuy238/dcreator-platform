import { CampaignStatus, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification } from "@/lib/services/notification.service";
import { assertStateTransition } from "@/lib/services/admin-transition.service";
import type { z } from "zod";
import type { adminCampaignCreateSchema } from "@/lib/validators/admin-campaign";
import type { campaignMissionCreateSchema } from "@/lib/validators/brand-dashboard";

type AdminDecision = "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "PAUSE";
type AdminCampaignCreateInput = z.infer<typeof adminCampaignCreateSchema>;
type CampaignMissionInput = z.infer<typeof campaignMissionCreateSchema>;
type AdminCampaignUpdateInput = {
  slug?: string;
  title?: string;
  brief?: string;
  category?: "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
  campaignType?: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
  setupSource?: "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
  participationRoadmap?: string[];
  benefits?: string;
  objective?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  budgetVnd?: number;
  targetAmountVnd?: number;
  ugcVideoQuota?: number;
  isPublic?: boolean;
  imageUrl?: string;
  reason?: string;
};

async function trySyncCampaignNewFields(campaignId: string, benefits: string | null, participationRoadmap: string[]) {
  try {
    await prisma.$executeRaw`UPDATE "Campaign" SET "benefits" = ${benefits}, "participationRoadmap" = ${participationRoadmap} WHERE "id" = ${campaignId}`;
  } catch {
    // Backward compatibility when DB has not applied migration yet.
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

  const tagMap = await getCampaignReviewTag(campaigns.map((c) => c.id));
  const normalized = campaigns.map((campaign) => ({
    ...campaign,
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
      benefits: true,
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
      rewards: true,
      missions: true,
      contributions: { select: { id: true, amountVnd: true, status: true } }
    }
  });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

  const brandProfile = await prisma.brand.findFirst({
    where: { ownerAccountId: campaign.brandId },
    select: {
      id: true,
      name: true,
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

  const quotaCreator = campaign.missions.filter((mission) => mission.audience === "CREATOR").length;
  const quotaUser = campaign.missions.filter((mission) => mission.audience === "USER").length;

  return {
    ...campaign,
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
    quota: { creator: quotaCreator, user: quotaUser }
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
  if (!detail.brief || detail.brief.trim().length < 10) {
    errors.push("Brief chưa đầy đủ.");
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
  if (!detail.missions.length) {
    errors.push("Campaign chưa có mission/KPI.");
  }
  if (!detail.budgetVnd || detail.budgetVnd <= 0) {
    errors.push("Budget campaign không hợp lệ.");
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
  const missionDeadlineAt = input.mission.deadlineAt ? new Date(input.mission.deadlineAt) : null;
  if (missionDeadlineAt && startsAt && missionDeadlineAt < startsAt) {
    throw new AppError("Mission deadline cannot be earlier than campaign start", 422, "MISSION_DEADLINE_INVALID");
  }
  if (missionDeadlineAt && endsAt && missionDeadlineAt > endsAt) {
    throw new AppError("Mission deadline cannot be later than campaign end", 422, "MISSION_DEADLINE_INVALID");
  }

  const campaign = await prisma.$transaction(async (tx) => {
    const createdCampaign = await tx.campaign.create({
      data: {
        brandId: brandAccount.id,
        slug: input.slug,
        title: input.title,
        brief: input.brief,
        budgetVnd: 10000000,
        targetAmountVnd: 10000000,
        category: input.category,
        campaignType: input.campaignType,
        setupSource: input.setupSource,
        objective: input.benefits || null,
        priorityChannels: input.participationRoadmap.join("\n"),
        missionTypes: null,
        creatorCommissionPercent: 0,
        userCommissionPercent: 0,
        bonusBudgetVnd: 0,
        coverImageUrl: input.imageUrl || null,
        startsAt,
        endsAt,
        feasibilityStatus: input.publishNow ? "APPROVED" : "DRAFT",
        brandApprovalStatus: input.publishNow ? "APPROVED" : "DRAFT",
        status: input.publishNow ? "ACTIVE" : "DRAFT"
      }
    });

    await tx.mission.create({
      data: {
        campaignId: createdCampaign.id,
        title: input.mission.title,
        description: input.mission.description,
        productName: input.mission.productReceiveOption === "PRODUCT_REQUIRED" ? input.mission.productName || null : null,
        productDescription: input.mission.productReceiveOption === "PRODUCT_REQUIRED" ? input.mission.productDescription || null : null,
        productImageUrl: input.mission.productReceiveOption === "PRODUCT_REQUIRED" ? input.mission.productImageUrl || null : null,
        productLink: input.mission.productReceiveOption === "PRODUCT_REQUIRED" ? input.mission.productLink || null : null,
        rewardPoints: input.mission.rewardPoints,
        rewardCommissionVnd: input.mission.rewardCommissionVnd,
        audience: input.mission.audience,
        productReceiveOption: input.mission.productReceiveOption,
        allowRepeat: input.mission.allowRepeat,
        deadlineAt: missionDeadlineAt
      }
    });

    return createdCampaign;
  });
  await trySyncCampaignNewFields(campaign.id, input.benefits || null, input.participationRoadmap);
  await syncCampaignUgcVideoQuota(campaign.id, ugcVideoQuota);

  await writeAuditLog({
    actorId,
    action: "ADMIN_CAMPAIGN_CREATED",
    targetType: "Campaign",
    targetId: campaign.id,
    newStatus: campaign.status,
    metadata: { publishNow: Boolean(input.publishNow), brandAccountId: brandAccount.id, ugcVideoQuota }
  });

  await createNotification({
    accountId: brandAccount.id,
    event: NotificationEvent.CAMPAIGN_APPROVED,
    title: input.publishNow ? "Admin đã tạo và publish campaign" : "Admin đã tạo campaign draft",
    content: input.publishNow
      ? `Campaign "${campaign.title}" đã được tạo và active.`
      : `Campaign "${campaign.title}" đã được tạo ở trạng thái draft.`,
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

  const nextParticipationRoadmap = input.participationRoadmap?.map((item) => item.trim()).filter(Boolean);
  if (input.participationRoadmap && (!nextParticipationRoadmap || nextParticipationRoadmap.length === 0)) {
    throw new AppError("Lộ trình tham gia cần ít nhất 1 bước.", 422, "CAMPAIGN_PARTICIPATION_ROADMAP_INVALID");
  }

  const nextImageUrl =
    input.imageUrl === undefined
      ? undefined
      : input.imageUrl === ""
        ? null
        : input.imageUrl.trim();

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      slug: nextSlug,
      title: input.title?.trim(),
      brief: input.brief?.trim(),
      category: input.category,
      campaignType: input.campaignType,
      setupSource: input.setupSource,
      participationRoadmap: nextParticipationRoadmap,
      benefits: input.benefits === undefined ? undefined : input.benefits.trim() || null,
      objective: input.objective === undefined ? undefined : input.objective.trim() || null,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      budgetVnd: input.budgetVnd,
      targetAmountVnd: input.targetAmountVnd,
      ugcVideoQuota: input.ugcVideoQuota,
      isPublic: input.isPublic,
      coverImageUrl: nextImageUrl
    }
  });

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
        participationRoadmap: campaign.participationRoadmap,
        benefits: campaign.benefits ?? null,
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
        participationRoadmap: updated.participationRoadmap,
        benefits: updated.benefits ?? null,
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

  return updated;
}

export async function archiveCampaignByAdmin(actorId: string, campaignId: string, reason: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  if (campaign.status === "ACTIVE") {
    throw new AppError("Campaign đang ACTIVE, hãy tạm dừng trước khi xóa.", 409, "CAMPAIGN_ACTIVE_CANNOT_ARCHIVE");
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "ARCHIVED" }
  });

  await writeAuditLog({
    actorId,
    action: "ADMIN_CAMPAIGN_ARCHIVED",
    targetType: "Campaign",
    targetId: campaignId,
    oldStatus: campaign.status,
    newStatus: updated.status,
    reason
  });

  return updated;
}

export async function listCampaignMissionsByAdmin(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  return prisma.mission.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" }
  });
}
