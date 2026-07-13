import { MissionLifecycleStatus, MissionStatus, NotificationEvent, Prisma } from "@prisma/client";
import { CREATOR_CAMPAIGN_APPLICATION_TAG, hasCreatorCampaignApplicationTag } from "@/lib/constants/campaign-application";
import { prisma } from "@/lib/db";
import { getBrandDisplayName } from "@/lib/display-identity";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { ensureCreatorMissionFromApprovedApplication } from "@/lib/services/creator-mission.service";
import { createNotification, createNotificationForBrandMembers } from "@/lib/services/notification.service";

function ensureReviewable(status: MissionLifecycleStatus) {
  if (status === "REJECTED" || status === "DONE" || status === "CANCELLED" || status === "EXPIRED") {
    throw new AppError("Application is not reviewable", 409, "APPLICATION_NOT_REVIEWABLE");
  }
}

function canMoveToDoing(status: MissionLifecycleStatus) {
  return status === "ACCEPTED" || status === "DOING";
}

function buildAdminNote(currentNote: string | null, next: string) {
  const lines = currentNote ? [currentNote] : [];
  lines.push(next);
  return lines.join("\n");
}

function isCreatorApplicationRecord(item: {
  mission: { audience: string };
  note: string | null;
  account?: { creatorProfile: unknown | null };
}) {
  if (item.mission.audience === "CREATOR") return true;
  if (hasCreatorCampaignApplicationTag(item.note)) return true;
  return item.mission.audience === "USER" && Boolean(item.account?.creatorProfile);
}

export async function listCampaignApplicationsForAdmin(input: {
  campaignId?: string;
  brandId?: string;
  status?: MissionLifecycleStatus;
  platform?: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "OTHER";
  followerMin?: number;
  followerMax?: number;
  query?: string;
}) {
  const creatorProfileFilter: Prisma.CreatorProfileWhereInput = {};
  if (input.platform) creatorProfileFilter.mainPlatform = input.platform;
  if (input.followerMin !== undefined || input.followerMax !== undefined) {
    creatorProfileFilter.followerCount = {
      ...(input.followerMin !== undefined ? { gte: input.followerMin } : {}),
      ...(input.followerMax !== undefined ? { lte: input.followerMax } : {})
    };
  }

  const queryFilter: Prisma.MissionSubmissionWhereInput | null = input.query
    ? {
        OR: [
          { account: { is: { displayName: { contains: input.query, mode: "insensitive" } } } },
          { account: { is: { email: { contains: input.query, mode: "insensitive" } } } },
          { account: { is: { creatorProfile: { is: { socialUrl: { contains: input.query, mode: "insensitive" } } } } } },
          { note: { contains: input.query, mode: "insensitive" } }
        ]
      }
    : null;

  const rows = await prisma.missionSubmission.findMany({
    where: {
      mission: {
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.brandId ? { campaign: { brandId: input.brandId } } : {})
      },
      ...(input.status ? { lifecycleStatus: input.status } : {}),
      ...(Object.keys(creatorProfileFilter).length > 0 ? { account: { is: { creatorProfile: { is: creatorProfileFilter } } } } : {}),
      AND: [
        {
          OR: [
            { mission: { audience: "CREATOR" } },
            { note: { contains: CREATOR_CAMPAIGN_APPLICATION_TAG } },
            { mission: { audience: "USER" }, account: { creatorProfile: { isNot: null } } }
          ]
        },
        ...(queryFilter ? [queryFilter] : [])
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          creatorProfile: {
            select: {
              id: true,
              mainPlatform: true,
              socialUrl: true,
              handle: true,
              followerCount: true,
              contentCategory: true,
              portfolioUrl: true
            }
          }
        }
      },
      mission: {
        select: {
          id: true,
          title: true,
          description: true,
          campaign: {
            select: {
              id: true,
              title: true,
              brief: true,
              brandId: true,
              brand: { select: { id: true, displayName: true, email: true } }
            }
          }
        }
      }
    }
  });
  const brandOwnerAccountIds = [...new Set(rows.map((row) => row.mission.campaign.brand.id))];
  const brands = brandOwnerAccountIds.length
    ? await prisma.brand.findMany({
        where: { ownerAccountId: { in: brandOwnerAccountIds } },
        orderBy: { updatedAt: "desc" },
        select: { ownerAccountId: true, name: true, legalName: true }
      })
    : [];
  const brandByOwnerAccountId = new Map<string, (typeof brands)[number]>();
  for (const brand of brands) {
    if (!brandByOwnerAccountId.has(brand.ownerAccountId)) brandByOwnerAccountId.set(brand.ownerAccountId, brand);
  }
  return rows.map((row) => ({
    ...row,
    mission: {
      ...row.mission,
      campaign: {
        ...row.mission.campaign,
        brand: {
          ...row.mission.campaign.brand,
          ownerDisplayName: row.mission.campaign.brand.displayName,
          displayName: getBrandDisplayName({ brand: brandByOwnerAccountId.get(row.mission.campaign.brand.id) ?? null })
        }
      }
    }
  }));
}

export async function getCampaignApplicationDetailForAdmin(applicationId: string) {
  const item = await prisma.missionSubmission.findUnique({
    where: { id: applicationId },
    include: {
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          creatorProfile: {
            select: {
              id: true,
              mainPlatform: true,
              socialUrl: true,
              handle: true,
              followerCount: true,
              contentCategory: true,
              portfolioUrl: true,
              bio: true
            }
          }
        }
      },
      mission: {
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              brief: true,
              brandId: true,
              brand: { select: { id: true, displayName: true, email: true } }
            }
          }
        }
      }
    }
  });
  if (!item) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  if (!isCreatorApplicationRecord(item)) throw new AppError("Not a creator application", 400, "NOT_CREATOR_APPLICATION");
  const brand = await prisma.brand.findFirst({
    where: { ownerAccountId: item.mission.campaign.brand.id },
    orderBy: { updatedAt: "desc" },
    select: { name: true, legalName: true }
  });
  return {
    ...item,
    mission: {
      ...item.mission,
      campaign: {
        ...item.mission.campaign,
        brand: {
          ...item.mission.campaign.brand,
          ownerDisplayName: item.mission.campaign.brand.displayName,
          displayName: getBrandDisplayName({ brand })
        }
      }
    }
  };
}

export async function adminApproveCampaignApplication(actorId: string, applicationId: string) {
  const current = await getCampaignApplicationDetailForAdmin(applicationId);
  ensureReviewable(current.lifecycleStatus);
  if (!canMoveToDoing(current.lifecycleStatus)) {
    throw new AppError("Cannot approve in current status", 409, "INVALID_STATUS_TRANSITION");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.missionSubmission.update({
      where: { id: applicationId },
      data: {
        lifecycleStatus: "DOING",
        status: MissionStatus.OPEN,
        reviewedById: actorId,
        reviewedAt: new Date(),
        rejectReason: null,
        note: buildAdminNote(current.note, `[ADMIN_APPROVED] ${new Date().toISOString()}`)
      }
    });

    await ensureCreatorMissionFromApprovedApplication(tx, {
      missionId: current.missionId,
      campaignId: current.mission.campaign.id,
      accountId: current.account.id,
      applicationId: current.id
    });

    return next;
  });

  await writeAuditLog({
    actorId,
    action: "CREATOR_CAMPAIGN_APPLICATION_ADMIN_APPROVED",
    targetType: "MissionSubmission",
    targetId: applicationId,
    oldStatus: current.lifecycleStatus,
    newStatus: "DOING"
  });

  await Promise.all([
    createNotification({
      accountId: current.account.id,
      event: NotificationEvent.CREATOR_CAMPAIGN_APPLICATION_APPROVED,
      title: "Application được duyệt sơ bộ",
      content: `Bạn đã được admin duyệt sơ bộ cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, campaignId: current.mission.campaign.id }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.BRAND_CREATOR_APPLICATION_PREAPPROVED,
      title: "Creator application đã được admin duyệt",
      content: `Creator ${current.account.displayName} đã qua bước duyệt sơ bộ cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
    }),
    createNotificationForBrandMembers({
      brandId: current.mission.campaign.brandId,
      event: NotificationEvent.BRAND_CREATOR_APPLICATION_PREAPPROVED,
      title: "Creator application preapproved",
      content: `Creator ${current.account.displayName} passed admin preapproval for campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
    })
  ]);

  return updated;
}

export async function adminRejectCampaignApplication(actorId: string, applicationId: string, reason: string) {
  const current = await getCampaignApplicationDetailForAdmin(applicationId);
  ensureReviewable(current.lifecycleStatus);
  const updated = await prisma.missionSubmission.update({
    where: { id: applicationId },
    data: {
      lifecycleStatus: "REJECTED",
      status: MissionStatus.REJECTED,
      rejectReason: reason,
      reviewedById: actorId,
      reviewedAt: new Date(),
      note: buildAdminNote(current.note, `[ADMIN_REJECTED] ${new Date().toISOString()} reason=${reason}`)
    }
  });

  await writeAuditLog({
    actorId,
    action: "CREATOR_CAMPAIGN_APPLICATION_ADMIN_REJECTED",
    targetType: "MissionSubmission",
    targetId: applicationId,
    oldStatus: current.lifecycleStatus,
    newStatus: "REJECTED",
    reason,
    metadata: { reason }
  });

  await Promise.all([
    createNotification({
      accountId: current.account.id,
      event: NotificationEvent.CREATOR_CAMPAIGN_APPLICATION_REJECTED,
      title: "Application bị từ chối",
      content: `Application của bạn cho campaign "${current.mission.campaign.title}" đã bị từ chối: ${reason}`,
      metadata: { applicationId, campaignId: current.mission.campaign.id, reason }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.BRAND_CREATOR_APPLICATION_REJECTED,
      title: "Creator application bị từ chối",
      content: `Creator ${current.account.displayName} bị từ chối ở bước admin cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id, reason }
    }),
    createNotificationForBrandMembers({
      brandId: current.mission.campaign.brandId,
      event: NotificationEvent.BRAND_CREATOR_APPLICATION_REJECTED,
      title: "Creator application rejected",
      content: `Creator ${current.account.displayName} was rejected at admin review for campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id, reason }
    })
  ]);

  return updated;
}

export async function adminSendToBrandReview(actorId: string, applicationId: string) {
  const current = await getCampaignApplicationDetailForAdmin(applicationId);
  ensureReviewable(current.lifecycleStatus);
  const updated = await prisma.missionSubmission.update({
    where: { id: applicationId },
    data: {
      lifecycleStatus: "DOING",
      reviewedById: actorId,
      reviewedAt: new Date(),
      note: buildAdminNote(current.note, `[SENT_TO_BRAND_REVIEW] ${new Date().toISOString()}`)
    }
  });
  await createNotificationForBrandMembers({
    brandId: current.mission.campaign.brandId,
    event: NotificationEvent.BRAND_CREATOR_APPLICATION_REVIEW_REQUIRED,
    title: "Application needs brand review",
    content: `Creator application from ${current.account.displayName} is waiting for brand review in campaign "${current.mission.campaign.title}".`,
    metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
  });

  await writeAuditLog({
    actorId,
    action: "CREATOR_CAMPAIGN_APPLICATION_SENT_TO_BRAND_REVIEW",
    targetType: "MissionSubmission",
    targetId: applicationId
  });

  await createNotification({
    accountId: current.mission.campaign.brandId,
    event: NotificationEvent.BRAND_CREATOR_APPLICATION_REVIEW_REQUIRED,
    title: "Có application cần Brand review",
    content: `Application của Creator ${current.account.displayName} đang chờ Brand review cho campaign "${current.mission.campaign.title}".`,
    metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
  });

  return updated;
}

export async function adminAssignTask(actorId: string, applicationId: string) {
  const current = await getCampaignApplicationDetailForAdmin(applicationId);
  ensureReviewable(current.lifecycleStatus);
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.missionSubmission.update({
      where: { id: applicationId },
      data: {
        lifecycleStatus: "DOING",
        status: MissionStatus.OPEN,
        reviewedById: actorId,
        reviewedAt: new Date(),
        note: buildAdminNote(current.note, `[ADMIN_ASSIGNED_TASK] ${new Date().toISOString()}`)
      }
    });

    await ensureCreatorMissionFromApprovedApplication(tx, {
      missionId: current.missionId,
      campaignId: current.mission.campaign.id,
      accountId: current.account.id,
      applicationId: current.id
    });

    return next;
  });

  await writeAuditLog({
    actorId,
    action: "CREATOR_CAMPAIGN_APPLICATION_TASK_ASSIGNED",
    targetType: "MissionSubmission",
    targetId: applicationId
  });

  await Promise.all([
    createNotification({
      accountId: current.account.id,
      event: NotificationEvent.CREATOR_TASK_ASSIGNED,
      title: "Task đã được assign",
      content: `Bạn đã được assign task cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, campaignId: current.mission.campaign.id }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.BRAND_CREATOR_TASK_ASSIGNED,
      title: "Creator task đã được assign",
      content: `Creator ${current.account.displayName} đã được assign task cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
    }),
    createNotificationForBrandMembers({
      brandId: current.mission.campaign.brandId,
      event: NotificationEvent.BRAND_CREATOR_TASK_ASSIGNED,
      title: "Creator task assigned",
      content: `Creator ${current.account.displayName} was assigned to campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
    })
  ]);

  return updated;
}
