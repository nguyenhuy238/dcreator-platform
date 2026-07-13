import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { adminDeleteEntitySchema, adminUpdateUserSchema } from "@/lib/validators/admin-crud";
import { deleteUserByAdmin, getAdminUserDetail, getUserDeleteImpact, updateUserByAdmin } from "@/lib/services/admin-crud.service";
import { toErrorResponse } from "@/lib/errors";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAnyRole(request, [Role.ADMIN]);
    const { id } = await params;
    if (request.nextUrl.searchParams.get("intent") === "delete-impact") {
      return ok(await getUserDeleteImpact(actor, id));
    }
    return ok(await getAdminUserDetail(actor, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAnyRole(request, [Role.ADMIN]);
    const payload = adminUpdateUserSchema.parse(await request.json());
    return ok(await updateUserByAdmin(actor, (await params).id, payload), 200);
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
    return ok(await deleteUserByAdmin(actor, id, payload), 200);
  } catch (error) {
    if (actor) {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "ADMIN_DELETE_FAILED",
          targetType: "Account",
          targetId: id,
          reason: error instanceof Error ? error.message : "Delete failed"
        }
      }).catch(() => null);
    }
    return toErrorResponse(error);
  }
}
