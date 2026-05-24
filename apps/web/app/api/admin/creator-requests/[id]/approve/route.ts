import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { reviewCreatorSocialLinkRequest } from "@/lib/services/creator-social-link-review.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    return ok(await reviewCreatorSocialLinkRequest(actor.id, id, "APPROVED"));
  } catch (error) {
    return toErrorResponse(error);
  }
}
