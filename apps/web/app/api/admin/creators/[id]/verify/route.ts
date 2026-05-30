import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { createAuditLog } from "@/lib/services/audit-log.service";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const creator = await prisma.creatorProfile.findUnique({
      where: { id },
      include: { account: { select: { profile: { select: { socialLinks: true } } } } }
    });
    if (!creator) throw new AppError("Creator profile not found", 404, "CREATOR_NOT_FOUND");

    const currentMeta = creator.account.profile?.socialLinks;
    const nextMeta = typeof currentMeta === "object" && currentMeta !== null && !Array.isArray(currentMeta) ? { ...currentMeta, kycVerified: true } : { kycVerified: true };
    await prisma.profile.upsert({
      where: { accountId: creator.accountId },
      create: { accountId: creator.accountId, socialLinks: nextMeta },
      update: { socialLinks: nextMeta }
    });
    await prisma.creatorSocialLink.updateMany({
      where: { creatorProfileId: creator.id, verificationStatus: { not: "VERIFIED" } },
      data: { verificationStatus: "VERIFIED", status: "APPROVED", reviewedById: actor.id, reviewedAt: new Date() }
    });
    await createAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_CREATOR_VERIFIED",
      targetType: "CreatorProfile",
      targetId: creator.id,
      newStatus: "VERIFIED"
    });
    return ok({ id: creator.id, verificationStatus: "verified" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
