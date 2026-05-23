import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { getSupportTicketDetailForAdmin, updateSupportTicketByAdmin } from "@/lib/services/admin-support.service";
import { adminSupportUpdateSchema } from "@/lib/validators/admin-support";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    return ok(await getSupportTicketDetailForAdmin(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = adminSupportUpdateSchema.parse(await request.json());
    const { id } = await params;
    return ok(
      await updateSupportTicketByAdmin({
        actorId: actor.id,
        ticketId: id,
        ...payload
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

