import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { resolveRiskFlagByAdmin } from "@/lib/services/admin-lifecycle.service";
import { riskResolveSchema } from "@/lib/validators/admin-lifecycle";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = riskResolveSchema.parse(await request.json());
    return ok(await resolveRiskFlagByAdmin(actor.id, actor.role, id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
