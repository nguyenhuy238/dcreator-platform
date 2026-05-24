import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { addCampaignMissionByAdmin, listCampaignMissionsByAdmin } from "@/lib/services/admin-campaign-review.service";
import { campaignMissionCreateSchema } from "@/lib/validators/brand-dashboard";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    return ok(await listCampaignMissionsByAdmin(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = campaignMissionCreateSchema.parse(await request.json());
    return ok(await addCampaignMissionByAdmin(actor.id, id, payload), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
