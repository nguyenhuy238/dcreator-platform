import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { rejectPayoutRequestByAdmin } from "@/lib/services/admin-payout.service";
import { adminPayoutRejectSchema } from "@/lib/validators/admin-payout";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = adminPayoutRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectPayoutRequestByAdmin(actor.id, id, payload.reason));
  } catch (error) {
    return toErrorResponse(error);
  }
}

