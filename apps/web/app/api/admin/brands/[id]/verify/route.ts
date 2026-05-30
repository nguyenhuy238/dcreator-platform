import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";
import { createAuditLog } from "@/lib/services/audit-log.service";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const updated = await prisma.brand.update({
      where: { id },
      data: {
        status: "ACTIVE",
        reviewedById: actor.id,
        reviewedAt: new Date()
      }
    });
    await createAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_BRAND_VERIFIED",
      targetType: "Brand",
      targetId: updated.id,
      newStatus: "VERIFIED"
    });
    return ok({ id: updated.id, verificationStatus: "verified" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
