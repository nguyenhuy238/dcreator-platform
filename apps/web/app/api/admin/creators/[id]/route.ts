import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { requireAnyRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errors";
import { deleteCreatorByAdmin, getCreatorDeleteImpact, updateCreatorByAdmin } from "@/lib/services/admin-crud.service";
import { adminDeleteEntitySchema, adminUpdateCreatorSchema } from "@/lib/validators/admin-crud";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    if (request.nextUrl.searchParams.get("intent") === "delete-impact") {
      const actor = await requireAnyRole(request, [Role.ADMIN]);
      return ok(await getCreatorDeleteImpact(actor, id));
    }
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
        socialLinks: { orderBy: [{ createdAt: "desc" }] }
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

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAnyRole(request, [Role.ADMIN]);
    const payload = adminUpdateCreatorSchema.parse(await request.json());
    return ok(await updateCreatorByAdmin(actor, (await params).id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  let actor: Awaited<ReturnType<typeof requireAnyRole>> | null = null;
  try {
    actor = await requireAnyRole(request, [Role.ADMIN]);
    const payload = adminDeleteEntitySchema.parse(await request.json());
    return ok(await deleteCreatorByAdmin(actor, id, payload));
  } catch (error) {
    if (actor) {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "ADMIN_DELETE_FAILED",
          targetType: "CreatorProfile",
          targetId: id,
          reason: error instanceof Error ? error.message : "Delete failed"
        }
      }).catch(() => null);
    }
    return toErrorResponse(error);
  }
}
