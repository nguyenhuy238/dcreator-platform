import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { updateFulfillmentByAdmin } from "@/lib/services/admin-fulfillment.service";
import { adminFulfillmentUpdateSchema } from "@/lib/validators/admin-fulfillment";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = adminFulfillmentUpdateSchema.parse(await request.json());
    const { id } = await params;
    return ok(
      await updateFulfillmentByAdmin({
        actorId: actor.id,
        orderId: id,
        ...payload
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

