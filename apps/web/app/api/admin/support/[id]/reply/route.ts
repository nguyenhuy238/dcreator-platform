import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { addSupportTicketReplyByAdmin } from "@/lib/services/admin-support.service";
import { adminSupportReplySchema } from "@/lib/validators/admin-support";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = adminSupportReplySchema.parse(await request.json());
    const { id } = await params;
    return ok(
      await addSupportTicketReplyByAdmin({
        actorId: actor.id,
        ticketId: id,
        message: payload.message,
        isInternal: payload.isInternal
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

