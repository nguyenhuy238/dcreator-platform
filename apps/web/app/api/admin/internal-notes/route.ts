import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { addInternalNoteByAdmin, listInternalNotesByTarget } from "@/lib/services/admin-lifecycle.service";
import { noteSchema } from "@/lib/validators/admin-lifecycle";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const targetType = request.nextUrl.searchParams.get("targetType");
    const targetId = request.nextUrl.searchParams.get("targetId");
    if (!targetType || !targetId) {
      return Response.json({ success: false, error: "targetType and targetId are required" }, { status: 422 });
    }
    return ok(await listInternalNotesByTarget(targetType, targetId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const targetType = request.nextUrl.searchParams.get("targetType");
    const targetId = request.nextUrl.searchParams.get("targetId");
    if (!targetType || !targetId) {
      return Response.json({ success: false, error: "targetType and targetId are required" }, { status: 422 });
    }
    const payload = noteSchema.parse(await request.json());
    return ok(await addInternalNoteByAdmin(actor.id, actor.role, { targetType, targetId, content: payload.content }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
