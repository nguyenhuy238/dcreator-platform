import { MissionLifecycleStatus, MissionStatus, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification } from "@/lib/services/notification.service";

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

export async function listCampaignApplicationsForAdmin(input: {
  campaignId?: string;
  brandId?: string;
  status?: MissionLifecycleStatus;
  platform?: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "OTHER";
  followerMin?: number;
  followerMax?: number;
  query?: string;
}) {
  return prisma.missionSubmission.findMany({
    where: {
      mission: {
        audience: "CREATOR",
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.brandId ? { campaign: { brandId: input.brandId } } : {})
      },
      ...(input.status ? { lifecycleStatus: input.status } : {}),
      ...(input.query
        ? {
            OR: [
              { account: { displayName: { contains: input.query, mode: "insensitive" } } },
              { account: { email: { contains: input.query, mode: "insensitive" } } },
              { account: { creatorProfile: { socialUrl: { contains: input.query, mode: "insensitive" } } } },
              { note: { contains: input.query, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(input.platform ? { account: { creatorProfile: { mainPlatform: input.platform } } } : {}),
      ...(input.followerMin !== undefined ? { account: { creatorProfile: { followerCount: { gte: input.followerMin } } } } : {}),
      ...(input.followerMax !== undefined ? { account: { creatorProfile: { followerCount: { lte: input.followerMax } } } } : {})
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
  if (item.mission.audience !== "CREATOR") throw new AppError("Not a creator application", 400, "NOT_CREATOR_APPLICATION");
  return item;
}

export async function adminApproveCampaignApplication(actorId: string, applicationId: string) {
  const current = await getCampaignApplicationDetailForAdmin(applicationId);
  ensureReviewable(current.lifecycleStatus);
  if (!canMoveToDoing(current.lifecycleStatus)) {
    throw new AppError("Cannot approve in current status", 409, "INVALID_STATUS_TRANSITION");
  }
  const updated = await prisma.missionSubmission.update({
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

  await writeAuditLog({
    actorId,
    action: "CREATOR_CAMPAIGN_APPLICATION_ADMIN_APPROVED",
    targetType: "MissionSubmission",
    targetId: applicationId
  });

  await Promise.all([
    createNotification({
      accountId: current.account.id,
      event: NotificationEvent.CAMPAIGN_APPROVED,
      title: "Application được duyệt sơ bộ",
      content: `Bạn đã được admin duyệt sơ bộ cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, campaignId: current.mission.campaign.id }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.CAMPAIGN_APPROVED,
      title: "Creator application đã được admin duyệt",
      content: `Creator ${current.account.displayName} đã qua bước duyệt sơ bộ cho campaign "${current.mission.campaign.title}".`,
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
    metadata: { reason }
  });

  await Promise.all([
    createNotification({
      accountId: current.account.id,
      event: NotificationEvent.CAMPAIGN_REJECTED,
      title: "Application bị từ chối",
      content: `Application của bạn cho campaign "${current.mission.campaign.title}" đã bị từ chối: ${reason}`,
      metadata: { applicationId, campaignId: current.mission.campaign.id, reason }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.CAMPAIGN_REJECTED,
      title: "Creator application bị từ chối",
      content: `Creator ${current.account.displayName} bị từ chối ở bước admin cho campaign "${current.mission.campaign.title}".`,
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

  await writeAuditLog({
    actorId,
    action: "CREATOR_CAMPAIGN_APPLICATION_SENT_TO_BRAND_REVIEW",
    targetType: "MissionSubmission",
    targetId: applicationId
  });

  await createNotification({
    accountId: current.mission.campaign.brandId,
    event: NotificationEvent.CAMPAIGN_APPROVED,
    title: "Có application cần Brand review",
    content: `Application của Creator ${current.account.displayName} đang chờ Brand review cho campaign "${current.mission.campaign.title}".`,
    metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
  });

  return updated;
}

export async function adminAssignTask(actorId: string, applicationId: string) {
  const current = await getCampaignApplicationDetailForAdmin(applicationId);
  ensureReviewable(current.lifecycleStatus);
  const updated = await prisma.missionSubmission.update({
    where: { id: applicationId },
    data: {
      lifecycleStatus: "DOING",
      status: MissionStatus.OPEN,
      reviewedById: actorId,
      reviewedAt: new Date(),
      note: buildAdminNote(current.note, `[ADMIN_ASSIGNED_TASK] ${new Date().toISOString()}`)
    }
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
      event: NotificationEvent.MISSION_ACCEPTED,
      title: "Task đã được assign",
      content: `Bạn đã được assign task cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, campaignId: current.mission.campaign.id }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.CAMPAIGN_APPROVED,
      title: "Creator task đã được assign",
      content: `Creator ${current.account.displayName} đã được assign task cho campaign "${current.mission.campaign.title}".`,
      metadata: { applicationId, creatorId: current.account.id, campaignId: current.mission.campaign.id }
    })
  ]);

  return updated;
}
