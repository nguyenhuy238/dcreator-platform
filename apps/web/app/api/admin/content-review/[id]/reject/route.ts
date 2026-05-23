import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { adminRejectContentSubmission } from "@/lib/services/admin-content-review.service";
import { adminContentDecisionSchema } from "@/lib/validators/admin-content-review";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = adminContentDecisionSchema.parse(await request.json());
    const { id } = await params;
    return ok(await adminRejectContentSubmission({
      actorId: actor.id,
      actorRole: actor.role,
      submissionId: id,
      feedback: payload.feedback
    }));
  } catch (error) {
    return toErrorResponse(error);
  }
}

