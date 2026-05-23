import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { adminRejectCampaignApplication } from "@/lib/services/admin-campaign-application.service";
import { adminCampaignApplicationReasonSchema } from "@/lib/validators/admin-campaign-application";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = adminCampaignApplicationReasonSchema.parse(await request.json());
    return ok(await adminRejectCampaignApplication(actor.id, id, payload.reason));
  } catch (error) {
    return toErrorResponse(error);
  }
}
