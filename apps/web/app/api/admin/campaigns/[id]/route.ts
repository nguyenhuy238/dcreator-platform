import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getCampaignDetailForAdmin } from "@/lib/services/admin-campaign-review.service";

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
