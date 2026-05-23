import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { decideCampaignByAdmin } from "@/lib/services/admin-campaign-review.service";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    return ok(await decideCampaignByAdmin({ actorId: actor.id, campaignId: id, decision: "APPROVE" }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
