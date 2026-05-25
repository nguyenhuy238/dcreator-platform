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

async function trySyncCampaignNewFields(campaignId: string, benefits: string | null, participationRoadmap: string[]) {
  try {
    await prisma.$executeRaw`UPDATE "Campaign" SET "benefits" = ${benefits}, "participationRoadmap" = ${participationRoadmap} WHERE "id" = ${campaignId}`;
  } catch {
    // Backward compatibility when DB has not applied migration yet.
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

  const campaign = await prisma.campaign.create({
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
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      feasibilityStatus: input.publishNow ? "APPROVED" : "DRAFT",
      brandApprovalStatus: input.publishNow ? "APPROVED" : "DRAFT",
      status: input.publishNow ? "ACTIVE" : "DRAFT"
    }
  });
  await trySyncCampaignNewFields(campaign.id, input.benefits || null, input.participationRoadmap);

  await writeAuditLog({
    actorId,
    action: "ADMIN_CAMPAIGN_CREATED",
    targetType: "Campaign",
    targetId: campaign.id,
    newStatus: campaign.status,
    metadata: { publishNow: Boolean(input.publishNow), brandAccountId: brandAccount.id }
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
      productLink: input.productLink || null,
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

export async function listCampaignMissionsByAdmin(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  return prisma.mission.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" }
  });
}
