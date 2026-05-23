import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { decideProductSubmissionByAdmin } from "@/lib/services/admin-product-review.service";
import { adminProductDecisionSchema } from "@/lib/validators/admin-product";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = adminProductDecisionSchema.parse(await request.json());
    return ok(
      await decideProductSubmissionByAdmin({
        actorId: actor.id,
        productId: id,
        decision: "REJECTED",
        reason: payload.reason,
        note: payload.note,
        proposedCommissionPercent: payload.proposedCommissionPercent,
        proposedMarginPercent: payload.proposedMarginPercent,
        campaignEligible: payload.campaignEligible
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
