import { MissionLifecycleStatus, MissionStatus, NotificationEvent, ReviewDecision, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification } from "@/lib/services/notification.service";

type ContentReviewStatusView =
  | "SUBMITTED"
  | "ADMIN_REVIEWING"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED"
  | "CHANGES_REQUESTED"
  | "BRAND_REVIEWING"
  | "BRAND_APPROVED"
  | "READY_TO_PUBLISH"
  | "PUBLISHED";

function appendTag(currentNote: string | null, tag: string, feedback?: string) {
  const line = `[${tag}] ${new Date().toISOString()}${feedback ? ` feedback=${feedback}` : ""}`;
  return currentNote ? `${currentNote}\n${line}` : line;
}

function extractStatusView(item: { lifecycleStatus: MissionLifecycleStatus; note: string | null }): ContentReviewStatusView {
  const note = item.note ?? "";
  if (item.lifecycleStatus === "PENDING_REVIEW") return "SUBMITTED";
  if (item.lifecycleStatus === "DOING") {
    if (note.includes("[SENT_TO_BRAND_REVIEW]")) return "BRAND_REVIEWING";
    return "ADMIN_REVIEWING";
  }
  if (item.lifecycleStatus === "APPROVED") {
    if (note.includes("[READY_TO_PUBLISH]")) return "READY_TO_PUBLISH";
    if (note.includes("[BRAND_APPROVED]")) return "BRAND_APPROVED";
    return "ADMIN_APPROVED";
  }
  if (item.lifecycleStatus === "DONE") return "PUBLISHED";
  if (item.lifecycleStatus === "REJECTED") {
    if (note.includes("[CHANGES_REQUESTED]")) return "CHANGES_REQUESTED";
    return "ADMIN_REJECTED";
  }
  return "ADMIN_REVIEWING";
}

function ensureAdminReviewable(status: MissionLifecycleStatus) {
  if (status === "DONE" || status === "CANCELLED" || status === "EXPIRED") {
    throw new AppError("Submission is finalized", 409, "SUBMISSION_FINALIZED");
  }
}

async function createReviewRecord(input: {
  submissionId: string;
  missionId: string;
  reviewerId: string;
  reviewerRole: Role;
  decision: ReviewDecision;
  feedback: string;
}) {
  await prisma.proofReview.create({
    data: {
      submissionId: input.submissionId,
      missionId: input.missionId,
      reviewerId: input.reviewerId,
      reviewerRole: input.reviewerRole,
      decision: input.decision,
      rejectReason: input.decision === "REJECTED" ? input.feedback : null,
      note: input.feedback
    }
  });
}

export async function listContentSubmissionsForAdmin(input: {
  campaignId?: string;
  creatorId?: string;
  brandId?: string;
  status?: ContentReviewStatusView;
  platform?: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "OTHER";
  query?: string;
}) {
  const raw = await prisma.missionSubmission.findMany({
    where: {
      mission: {
        audience: "CREATOR",
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.brandId ? { campaign: { brandId: input.brandId } } : {})
      },
      ...(input.creatorId ? { accountId: input.creatorId } : {}),
      ...(input.platform ? { account: { creatorProfile: { mainPlatform: input.platform } } } : {}),
      ...(input.query
        ? {
            OR: [
              { account: { displayName: { contains: input.query, mode: "insensitive" } } },
              { account: { email: { contains: input.query, mode: "insensitive" } } },
              { note: { contains: input.query, mode: "insensitive" } },
              { proofTextNote: { contains: input.query, mode: "insensitive" } },
              { mission: { title: { contains: input.query, mode: "insensitive" } } },
              { mission: { campaign: { title: { contains: input.query, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "asc" },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          creatorProfile: { select: { mainPlatform: true, socialUrl: true, followerCount: true } }
        }
      },
      mission: {
        select: {
          id: true,
          title: true,
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
      },
      reviews: { orderBy: { createdAt: "desc" }, take: 1, include: { reviewer: { select: { id: true, displayName: true } } } }
    }
  });

  const mapped = raw.map((item) => ({ ...item, statusView: extractStatusView(item) }));
  if (!input.status) return mapped;
  return mapped.filter((item) => item.statusView === input.status);
}

export async function getContentSubmissionDetailForAdmin(id: string) {
  const item = await prisma.missionSubmission.findUnique({
    where: { id },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
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
              brand: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  brandApplications: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { description: true, bccAgreementTerms: true, businessGoal: true }
                  }
                }
              }
            }
          }
        }
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { id: true, displayName: true, role: true } } }
      }
    }
  });
  if (!item) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (item.mission.audience !== "CREATOR") throw new AppError("Not creator content submission", 400, "INVALID_AUDIENCE");
  return { ...item, statusView: extractStatusView(item) };
}

export async function adminApproveContentSubmission(input: {
  actorId: string;
  actorRole: Role;
  submissionId: string;
  feedback: string;
  markReadyToPublish?: boolean;
}) {
  const current = await getContentSubmissionDetailForAdmin(input.submissionId);
  ensureAdminReviewable(current.lifecycleStatus);
  if (!["PENDING_REVIEW", "DOING", "REJECTED", "APPROVED"].includes(current.lifecycleStatus)) {
    throw new AppError("Submission is not reviewable", 409, "SUBMISSION_NOT_REVIEWABLE");
  }

  const nextNote = appendTag(current.note, input.markReadyToPublish ? "READY_TO_PUBLISH" : "ADMIN_APPROVED", input.feedback);
  const updated = await prisma.missionSubmission.update({
    where: { id: current.id },
    data: {
      lifecycleStatus: "APPROVED",
      status: MissionStatus.APPROVED,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
      rejectReason: null,
      note: nextNote
    }
  });

  await createReviewRecord({
    submissionId: current.id,
    missionId: current.missionId,
    reviewerId: input.actorId,
    reviewerRole: input.actorRole,
    decision: "APPROVED",
    feedback: input.feedback
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: input.markReadyToPublish ? "CONTENT_READY_TO_PUBLISH" : "CONTENT_ADMIN_APPROVED",
    targetType: "MissionSubmission",
    targetId: current.id,
    metadata: { feedback: input.feedback }
  });

  await Promise.all([
    createNotification({
      accountId: current.accountId,
      event: NotificationEvent.PROOF_APPROVED,
      title: input.markReadyToPublish ? "Content đã sẵn sàng publish" : "Content đã được admin duyệt",
      content: `Nội dung cho campaign "${current.mission.campaign.title}" đã qua bước admin review.`,
      metadata: { submissionId: current.id, campaignId: current.mission.campaign.id }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.PROOF_APPROVED,
      title: "Content đã qua admin review",
      content: `Content của creator ${current.account.displayName} đã được admin duyệt.`,
      metadata: { submissionId: current.id, creatorId: current.accountId, campaignId: current.mission.campaign.id }
    })
  ]);

  return updated;
}

export async function adminRejectContentSubmission(input: {
  actorId: string;
  actorRole: Role;
  submissionId: string;
  feedback: string;
  isChangesRequested?: boolean;
}) {
  const current = await getContentSubmissionDetailForAdmin(input.submissionId);
  ensureAdminReviewable(current.lifecycleStatus);
  if (!["PENDING_REVIEW", "DOING", "REJECTED", "APPROVED"].includes(current.lifecycleStatus)) {
    throw new AppError("Submission is not reviewable", 409, "SUBMISSION_NOT_REVIEWABLE");
  }
  const tag = input.isChangesRequested ? "CHANGES_REQUESTED" : "ADMIN_REJECTED";
  const updated = await prisma.missionSubmission.update({
    where: { id: current.id },
    data: {
      lifecycleStatus: "REJECTED",
      status: MissionStatus.REJECTED,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
      rejectReason: input.feedback,
      note: appendTag(current.note, tag, input.feedback)
    }
  });

  await createReviewRecord({
    submissionId: current.id,
    missionId: current.missionId,
    reviewerId: input.actorId,
    reviewerRole: input.actorRole,
    decision: "REJECTED",
    feedback: input.feedback
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: input.isChangesRequested ? "CONTENT_CHANGES_REQUESTED" : "CONTENT_ADMIN_REJECTED",
    targetType: "MissionSubmission",
    targetId: current.id,
    metadata: { feedback: input.feedback }
  });

  await Promise.all([
    createNotification({
      accountId: current.accountId,
      event: NotificationEvent.PROOF_REJECTED,
      title: input.isChangesRequested ? "Content cần chỉnh sửa" : "Content bị từ chối",
      content: `Nội dung cho campaign "${current.mission.campaign.title}" cần cập nhật: ${input.feedback}`,
      metadata: { submissionId: current.id, campaignId: current.mission.campaign.id, feedback: input.feedback }
    }),
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.PROOF_REJECTED,
      title: "Content cần xử lý",
      content: `Content của creator ${current.account.displayName} bị từ chối ở bước admin: ${input.feedback}`,
      metadata: { submissionId: current.id, creatorId: current.accountId, campaignId: current.mission.campaign.id, feedback: input.feedback }
    })
  ]);

  return updated;
}

export async function adminSendContentToBrandReview(input: {
  actorId: string;
  actorRole: Role;
  submissionId: string;
  feedback: string;
}) {
  const current = await getContentSubmissionDetailForAdmin(input.submissionId);
  ensureAdminReviewable(current.lifecycleStatus);
  if (!["PENDING_REVIEW", "REJECTED", "APPROVED", "DOING"].includes(current.lifecycleStatus)) {
    throw new AppError("Submission is not reviewable", 409, "SUBMISSION_NOT_REVIEWABLE");
  }

  const updated = await prisma.missionSubmission.update({
    where: { id: current.id },
    data: {
      lifecycleStatus: "DOING",
      status: MissionStatus.SUBMITTED,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
      note: appendTag(current.note, "SENT_TO_BRAND_REVIEW", input.feedback)
    }
  });

  await createReviewRecord({
    submissionId: current.id,
    missionId: current.missionId,
    reviewerId: input.actorId,
    reviewerRole: input.actorRole,
    decision: "APPROVED",
    feedback: input.feedback
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "CONTENT_SENT_TO_BRAND_REVIEW",
    targetType: "MissionSubmission",
    targetId: current.id,
    metadata: { feedback: input.feedback }
  });

  await Promise.all([
    createNotification({
      accountId: current.mission.campaign.brandId,
      event: NotificationEvent.PROOF_SUBMITTED,
      title: "Có content cần Brand review",
      content: `Content mới từ ${current.account.displayName} đang chờ Brand duyệt cho campaign "${current.mission.campaign.title}".`,
      metadata: { submissionId: current.id, campaignId: current.mission.campaign.id }
    }),
    createNotification({
      accountId: current.accountId,
      event: NotificationEvent.PROOF_SUBMITTED,
      title: "Content đã chuyển Brand review",
      content: `Nội dung của bạn đã qua bước admin và đang chờ Brand duyệt.`,
      metadata: { submissionId: current.id, campaignId: current.mission.campaign.id }
    })
  ]);

  return updated;
}

