import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errors";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    const item = await prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            email: true,
            displayName: true,
            profile: { select: { socialLinks: true } },
            _count: { select: { campaignsAsCreator: true, submissions: true, payoutRequests: true } }
          }
        },
        socialLinks: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] }
      }
    });
    if (!item) throw new AppError("Creator profile not found", 404, "CREATOR_NOT_FOUND");
    const socialMeta = item.account.profile?.socialLinks;
    const kycVerified = typeof socialMeta === "object" && socialMeta !== null && !Array.isArray(socialMeta) && "kycVerified" in socialMeta && socialMeta.kycVerified === true;
    return ok({
      id: item.id,
      accountId: item.accountId,
      status: item.isSuspended ? "suspended" : "active",
      verificationStatus: kycVerified ? "verified" : "unverified",
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
      bio: item.bio,
      mainPlatform: item.mainPlatform ?? "OTHER",
      socialUrl: item.socialUrl ?? "",
      handle: item.handle,
      followerCount: item.followerCount,
      contentCategory: item.contentCategory,
      portfolioUrl: item.portfolioUrl,
      location: item.location,
      expectedRate: item.expectedRate,
      maxJobsPerMonth: item.maxJobsPerMonth,
      rejectReason: item.suspendedReason,
      reviewNote: null,
      campaignCount: item.account._count.campaignsAsCreator + item.account._count.submissions,
      payoutCount: item.account._count.payoutRequests,
      socialLinks: item.socialLinks,
      account: {
        id: item.account.id,
        email: item.account.email,
        displayName: item.account.displayName,
        creatorProfile: {
          id: item.id,
          mainPlatform: item.mainPlatform,
          socialUrl: item.socialUrl,
          handle: item.handle,
          followerCount: item.followerCount
        }
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
