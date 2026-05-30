import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { reviewBrandApplication } from "@/lib/services/role-upgrade.service";
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
    return ok(await reviewBrandApplication(actor.id, id, "NEEDS_REVISION", payload.reason, payload.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}

