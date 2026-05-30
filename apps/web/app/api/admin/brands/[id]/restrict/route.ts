import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { addInternalNoteByAdmin, createRiskFlagByAdmin } from "@/lib/services/admin-lifecycle.service";
import { adminBrandDecisionSchema } from "@/lib/validators/admin-brand";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = adminBrandDecisionSchema.parse(await request.json());
    if (!payload.reason) {
      return Response.json({ success: false, error: "reason is required" }, { status: 422 });
    }
    const brand = await prisma.brand.findUnique({ where: { id }, select: { id: true, ownerAccountId: true } });
    if (!brand) throw new AppError("Brand not found", 404, "BRAND_NOT_FOUND");
    const [flag, note] = await Promise.all([
      createRiskFlagByAdmin(actor.id, actor.role, {
        targetType: "Brand",
        targetId: brand.id,
        accountId: brand.ownerAccountId,
        reason: payload.reason,
        flagType: "RESTRICTED_VERIFICATION",
        severity: "LOW",
        note: payload.note
      }),
      addInternalNoteByAdmin(actor.id, actor.role, {
        targetType: "Brand",
        targetId: brand.id,
        content: payload.note || payload.reason
      })
    ]);
    return ok({ flag, note });
  } catch (error) {
    return toErrorResponse(error);
  }
}
