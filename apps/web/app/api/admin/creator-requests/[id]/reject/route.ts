import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { reviewCreatorSocialLinkRequest } from "@/lib/services/creator-social-link-review.service";
import { adminCreatorDecisionSchema } from "@/lib/validators/admin-creator";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = adminCreatorDecisionSchema.parse(await request.json());
    if (!payload.reason) {
      return Response.json({ success: false, error: "reason is required" }, { status: 422 });
    }
    return ok(await reviewCreatorSocialLinkRequest(actor.id, id, "REJECTED", payload.reason, payload.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}
