import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

type ListCreatorSocialLinkRequestOptions = {
  status?: ReviewStatus;
  query?: string;
  platform?: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "SHOPEE" | "OTHER";
  sort?: "newest" | "oldest";
};

function mapStatusToWhere(status?: ReviewStatus) {
  if (!status) return {};
  return { status };
}

export async function listCreatorSocialLinkRequests(options: ListCreatorSocialLinkRequestOptions = {}) {
  const { status, query, platform, sort = "newest" } = options;
  const statusWhere = mapStatusToWhere(status);

  return prisma.creatorSocialLink.findMany({
    where: {
      ...statusWhere,
      ...(platform ? { platform } : {}),
      ...(query
        ? {
            OR: [
              { socialUrl: { contains: query, mode: "insensitive" } },
              { creatorProfile: { displayName: { contains: query, mode: "insensitive" } } },
              { creatorProfile: { account: { email: { contains: query, mode: "insensitive" } } } },
              { creatorProfile: { account: { displayName: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    include: {
      creatorProfile: {
        select: {
          id: true,
          accountId: true,
          displayName: true,
          mainPlatform: true,
          socialUrl: true,
          followerCount: true,
          contentCategory: true,
          bio: true,
          phone: true,
          account: {
            select: {
              id: true,
              email: true,
              displayName: true,
              profile: { select: { phone: true } }
            }
          }
        }
      },
      reviewedBy: { select: { id: true, displayName: true, email: true } }
    },
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" }
  });
}

export async function getCreatorSocialLinkRequestDetail(linkId: string) {
  const [link, history] = await Promise.all([
    prisma.creatorSocialLink.findUnique({
      where: { id: linkId },
      include: {
        creatorProfile: {
          include: {
            account: {
              select: {
                id: true,
                email: true,
                displayName: true,
                profile: { select: { phone: true } }
              }
            }
          }
        },
        reviewedBy: { select: { id: true, displayName: true, email: true } }
      }
    }),
    prisma.auditLog.findMany({
      where: { targetType: "CreatorSocialLink", targetId: linkId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldStatus: true,
        newStatus: true,
        reason: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true, email: true } }
      }
    })
  ]);

  if (!link) throw new AppError("Social link request not found", 404, "SOCIAL_LINK_NOT_FOUND");
  return { ...link, statusHistory: history };
}

export async function reviewCreatorSocialLinkRequest(
  actorId: string,
  linkId: string,
  status: ReviewStatus,
  rejectReason?: string,
  reviewNote?: string
) {
  const current = await prisma.creatorSocialLink.findUnique({
    where: { id: linkId },
    include: { creatorProfile: true }
  });
  if (!current) throw new AppError("Social link request not found", 404, "SOCIAL_LINK_NOT_FOUND");
  if (current.status !== "PENDING") {
    throw new AppError("Social link request already processed", 409, "SOCIAL_LINK_ALREADY_PROCESSED");
  }

  if (status === "REJECTED" && !rejectReason?.trim()) {
    throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.creatorSocialLink.update({
      where: { id: linkId },
      data: {
        status,
        verificationStatus: status === "APPROVED" ? "VERIFIED" : status === "REJECTED" ? "REJECTED" : "PENDING",
        rejectReason: status === "APPROVED" ? null : rejectReason ?? null,
        reviewNote: reviewNote ?? null,
        reviewedById: actorId,
        reviewedAt: new Date()
      }
    });

    if (status === "APPROVED" && (!current.creatorProfile.mainPlatform || !current.creatorProfile.socialUrl)) {
      await tx.creatorProfile.update({
        where: { id: current.creatorProfileId },
        data: {
          mainPlatform: current.platform,
          socialUrl: current.socialUrl,
          followerCount: current.followers
        }
      });
    }

    return next;
  });

  await writeAuditLog({
    actorId,
    action: `CREATOR_SOCIAL_LINK_${status}`,
    targetType: "CreatorSocialLink",
    targetId: linkId,
    oldStatus: current.status,
    newStatus: status,
    reason: rejectReason ?? null,
    metadata: { reviewNote: reviewNote ?? null }
  });

  return updated;
}
