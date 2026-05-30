import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { adminCampaignDecisionSchema, adminCampaignUpdateSchema } from "@/lib/validators/admin-campaign";
import { archiveCampaignByAdmin, getCampaignDetailForAdmin, updateCampaignByAdmin } from "@/lib/services/admin-campaign-review.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    return ok(await getCampaignDetailForAdmin(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = adminCampaignUpdateSchema.parse(await request.json());
    return ok(await updateCampaignByAdmin(actor.id, id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = adminCampaignDecisionSchema.parse(await request.json());
    if (!payload.reason?.trim()) {
      throw new AppError("reason is required", 422, "REASON_REQUIRED");
    }
    return ok(await archiveCampaignByAdmin(actor.id, id, payload.reason.trim()));
  } catch (error) {
    return toErrorResponse(error);
  }
}
