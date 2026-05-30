import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { suspendCreatorByAdmin } from "@/lib/services/admin-lifecycle.service";
import { reasonSchema } from "@/lib/validators/admin-lifecycle";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = reasonSchema.parse(await request.json());
    return ok(await suspendCreatorByAdmin(actor.id, actor.role, id, payload.reason));
  } catch (error) {
    return toErrorResponse(error);
  }
}
